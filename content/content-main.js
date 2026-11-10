/**
 * Element Snapper - Main Content Script
 * Entry point for content script functionality
 * Manages global state and message handling
 */

// Initialize on page load
console.log('Element Snapper: Content script loaded');

/**
 * Handle viewport capture
 * Captures the current visible viewport without element selection
 */
async function handleViewportCapture() {
  try {
    // Load delay setting
    const settings = await chrome.storage.local.get(['delay']);
    const delay = settings.delay || 0;

    // Show countdown if delay is enabled
    if (delay > 0) {
      injectCountdownStyles();
      await showCountdownOverlay(delay);
    }

    // Notify popup that capture started
    chrome.runtime.sendMessage({ action: 'captureStarted' });

    // Get current viewport and scroll information
    const scroll = getScrollOffsets();
    const docDims = getDocumentDimensions();
    const dpr = window.devicePixelRatio || 1;

    // Prepare capture data for viewport
    const captureData = {
      captureMode: 'viewport',
      scroll: scroll,
      documentDimensions: docDims,
      devicePixelRatio: dpr,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timestamp: Date.now()
    };

    // Request screenshot from service worker
    const response = await chrome.runtime.sendMessage({
      action: 'captureViewportOrPage',
      data: captureData
    });

    if (response.success) {
      if (response.notice) {
        showNotification(response.notice, 'success');
      } else if (response.action === 'download') {
        showNotification('Screenshot saved to downloads', 'success');
      }
      if (response.captureId && window.elementSnapperPreview) {
        window.elementSnapperPreview.show(response.captureId);
      }
      chrome.runtime.sendMessage({ action: 'captureSuccess' });
    } else {
      chrome.runtime.sendMessage({
        action: 'captureError',
        error: response.error
      });
    }
  } catch (error) {
    console.error('Viewport capture failed:', error);
    chrome.runtime.sendMessage({
      action: 'captureError',
      error: error.message
    });
  }
}

/**
 * Handle region (selected area) capture
 * Called by RegionSelector after user finishes drag selection
 * @param {number} x - Left position (viewport CSS pixels)
 * @param {number} y - Top position (viewport CSS pixels)
 * @param {number} width - Width (CSS pixels)
 * @param {number} height - Height (CSS pixels)
 */
async function handleRegionCaptureRequest(x, y, width, height) {
  try {
    // Load delay setting
    const settings = await chrome.storage.local.get(['delay']);
    const delay = settings.delay || 0;

    // Show countdown if delay is enabled
    if (delay > 0) {
      injectCountdownStyles();
      await showCountdownOverlay(delay);
    }

    // Notify popup that capture started
    chrome.runtime.sendMessage({ action: 'captureStarted' });

    // Build capture data (viewport-relative rect)
    const dpr = window.devicePixelRatio || 1;
    const scroll = getScrollOffsets();

    const captureData = {
      rect: { x, y, width, height },
      scroll: scroll,
      devicePixelRatio: dpr,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timestamp: Date.now()
    };

    // Request capture from service worker
    const response = await chrome.runtime.sendMessage({
      action: 'captureRegion',
      data: captureData
    });

    if (response && response.success) {
      if (response.notice) {
        showNotification(response.notice, 'success');
      } else if (response.action === 'download') {
        showNotification('Screenshot saved to downloads', 'success');
      }
      if (response.captureId && window.elementSnapperPreview) {
        window.elementSnapperPreview.show(response.captureId);
      }
      chrome.runtime.sendMessage({ action: 'captureSuccess' });
    } else {
      const errorMsg = response?.error || 'Unknown error';
      chrome.runtime.sendMessage({ action: 'captureError', error: errorMsg });
      showNotification('Capture failed: ' + errorMsg, 'error');
    }
  } catch (error) {
    console.error('Region capture failed:', error);
    chrome.runtime.sendMessage({ action: 'captureError', error: error.message });
    showNotification('Capture failed: ' + error.message, 'error');
  }
}

/**
 * Handle clipboard copy
 * Copies image data URL to clipboard
 * @param {string} dataUrl - Image data URL
 */
async function handleClipboardCopy(dataUrl) {
  if (!window.isSecureContext) throw Object.assign(new Error('Not a secure page'), { reason: 'browsers block copying images on http:// pages' });
  if (!document.hasFocus()) throw Object.assign(new Error('Page not focused'), { reason: 'the page lost focus' });
  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Use native format if supported, otherwise fall back to PNG
    const mimeType = ClipboardItem.supports(blob.type) ? blob.type : 'image/png';
    const clipboardBlob = mimeType === blob.type ? blob : await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/png');
      };
      img.onerror = reject;
      img.src = dataUrl;
    });

    // Use Clipboard API to write image
    await navigator.clipboard.write([
      new ClipboardItem({
        [mimeType]: clipboardBlob
      })
    ]);

    console.log('Image copied to clipboard successfully');
    showNotification('Copied to clipboard', 'success');
  } catch (error) {
    // The service worker downloads it instead and says so.
    console.error('Failed to copy to clipboard:', error);
    throw error;
  }
}

/**
 * Handle full page capture
 * Captures the entire scrollable page with auto-scroll
 */
async function handleFullPageCapture() {
  try {
    // Load delay + debugMode settings
    const settings = await chrome.storage.local.get(['delay', 'debugMode']);
    const delay = settings.delay || 0;
    const debugMode = settings.debugMode || false;

    // Show countdown if delay is enabled
    if (delay > 0) {
      injectCountdownStyles();
      await showCountdownOverlay(delay);
    }

    // Notify popup that capture started
    chrome.runtime.sendMessage({ action: 'captureStarted' });

    // The service worker tiles it from here, starting at the top of the page.
    const captureData = {
      captureMode: 'fullpage',
      devicePixelRatio: window.devicePixelRatio || 1,
      debugMode: debugMode,
      timestamp: Date.now()
    };

    // Request screenshot from service worker
    const response = await chrome.runtime.sendMessage({
      action: 'captureViewportOrPage',
      data: captureData
    });

    if (response.success) {
      if (response.notice) {
        showNotification(response.notice, 'success');
      } else if (response.action === 'download') {
        showNotification('Screenshot saved to downloads', 'success');
      }
      if (response.captureId && window.elementSnapperPreview) {
        window.elementSnapperPreview.show(response.captureId);
      }
      chrome.runtime.sendMessage({ action: 'captureSuccess' });
    } else {
      chrome.runtime.sendMessage({
        action: 'captureError',
        error: response.error
      });
    }
  } catch (error) {
    console.error('Full page capture failed:', error);
    chrome.runtime.sendMessage({
      action: 'captureError',
      error: error.message
    });
  }
}

/**
 * Message handler
 * Routes messages from the panel and service worker
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle async operations with IIFE
  (async () => {
    switch (message.action) {
      case 'getState':
        // Return current selection state
        sendResponse({
          isSelecting: elementSelector.isSelecting(),
          isSelectingRegion: regionSelector.isSelecting()
        });
        break;

      case 'startSelection':
        // Start element selection mode
        elementSelector.start();
        sendResponse({ success: true });
        break;

      case 'cancelSelection':
        // Cancel element selection mode
        elementSelector.stop();
        sendResponse({ success: true });
        break;

      case 'tilePrepare':
        // Set up a stitched capture (called once, before the first tile)
        try {
          sendResponse({ plan: prepareCapture(message.mode) });
        } catch (error) {
          finishCapture();
          sendResponse({ error: error.message });
        }
        break;

      case 'tilePosition':
        // Move to a tile and report what's on screen
        sendResponse(await positionTile(message));
        break;

      case 'tileFinish':
        // Hand the page back (called after the last tile, or on failure)
        finishCapture();
        sendResponse({ success: true });
        break;

      case 'showDebugBorder':
        // Show debug border for tile capture visualization
        showDebugBorder(message.x, message.y, message.width, message.height);
        sendResponse({ success: true });
        break;

      case 'hideDebugBorder':
        // Hide debug border
        hideDebugBorder();
        sendResponse({ success: true });
        break;

      case 'startRegionSelection':
        // Start region (area) selection mode
        regionSelector.start();
        sendResponse({ success: true });
        break;

      case 'cancelRegionSelection':
        // Cancel region selection mode
        regionSelector.stop();
        sendResponse({ success: true });
        break;

      case 'captureViewport':
        // Capture visible viewport without element selection
        await handleViewportCapture();
        sendResponse({ success: true });
        break;

      case 'captureFullPage':
        // Capture full page with scrolling
        await handleFullPageCapture();
        sendResponse({ success: true });
        break;

      case 'copyToClipboard':
        // Copy image to clipboard
        try {
          await handleClipboardCopy(message.dataUrl);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: error.message, reason: error.reason });
        }
        break;

      default:
        sendResponse({ error: 'Unknown action' });
    }
  })();

  return true; // Keep message channel open for async responses
});
