/**
 * Element Snapper - Service Worker
 * Handles screenshot capture, cropping, and download
 * Uses capture+crop technique with DPR-aware math
 */

// ─── Capture history (chrome.storage.session) ──────────────────────────────
// Storage layout:
//   history       : array of { id, timestamp, source, mimeType, size }
//   capture:{id}  : the dataURL bytes for that entry
// Entries are evicted oldest-first when total bytes exceed the budget so the
// number of captures retained scales inversely with their size.
const HISTORY_BYTE_BUDGET = 8 * 1024 * 1024;  // 8 MB — sized to fit under
                                              // chrome.storage.session's 10 MB
                                              // default with metadata headroom.
const HISTORY_HARD_COUNT_CAP = 30;            // safety net independent of size

// Allow content scripts to read session storage directly so they can render
// history thumbnails without round-tripping multi-MB payloads through messaging.
chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })
  .catch(err => console.warn('Element Snapper: session access level setup failed:', err));

async function saveToHistory({ dataUrl, source, mimeType, byteSize }) {
  const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : `cap_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const entry = {
    id,
    timestamp: Date.now(),
    source: source || 'capture',
    mimeType: mimeType || 'image/png',
    size: byteSize || 0,
  };

  const stored = await chrome.storage.session.get('history');
  const next = Array.isArray(stored.history) ? [...stored.history, entry] : [entry];

  const totalBytes = (list) => list.reduce((s, e) => s + (e.size || 0), 0);
  const removedIds = [];
  while (next.length > HISTORY_HARD_COUNT_CAP || totalBytes(next) > HISTORY_BYTE_BUDGET) {
    const evicted = next.shift();
    if (!evicted) break;
    removedIds.push(`capture:${evicted.id}`);
  }

  if (removedIds.length) await chrome.storage.session.remove(removedIds);
  await chrome.storage.session.set({
    history: next,
    [`capture:${id}`]: dataUrl,
  });

  return id;
}

/**
 * Message handler
 * Processes capture requests from content script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureElement') {
    // Handle async capture
    handleElementCapture(message.data, sender.tab.id)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true; // Keep channel open for async response
  } else if (message.action === 'captureViewportOrPage') {
    // Handle viewport or full page capture
    handleViewportOrPageCapture(message.data, sender.tab.id)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true; // Keep channel open for async response
  } else if (message.action === 'captureRegion') {
    // Handle selected region capture
    handleRegionCapture(message.data, sender.tab.id)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true; // Keep channel open for async response
  } else if (['captureStarted', 'captureSuccess', 'captureError', 'selectionCancelled'].includes(message.action)) {
    // Relay status notifications from content scripts back to the floating panel in the same tab
    if (sender.tab && sender.tab.id) {
      chrome.tabs.sendMessage(sender.tab.id, message).catch(() => {});
    }
    sendResponse({ relayed: true });
  }
});

/**
 * Handle extension icon click — inject or toggle the floating panel
 */
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return;

  // Cannot inject into browser system pages
  if (
    tab.url.startsWith('chrome://') ||
    tab.url.startsWith('chrome-extension://') ||
    tab.url.startsWith('about:') ||
    tab.url.startsWith('edge://')
  ) return;

  try {
    // Check if the panel already exists in the DOM; if so, just toggle it.
    const [{ result: panelExists }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const host = document.getElementById('__element-snapper-panel-host__');
        if (host) {
          host.style.display = host.style.display === 'none' ? 'block' : 'none';
          return true;
        }
        return false;
      },
    });

    if (!panelExists) {
      // First time on this page — inject all content scripts.
      // panel.js will create and show the panel automatically.
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [
          'content/utils.js',
          'content/element_selector.js',
          'content/region_selector.js',
          'content/content-main.js',
          'content/preview.js',
          'content/panel.js',
        ],
      });
    } else {
      // Panel already loaded. Ensure preview.js is also present (idempotent IIFE)
      // for tabs where the panel was injected before preview.js was added.
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/preview.js'],
      });
    }
  } catch (injectionError) {
    console.error('Element Snapper: Cannot inject into this page:', injectionError);
  }
});

/**
 * Handle viewport or full page capture
 * @param {object} data - Capture data from content script
 * @param {number} tabId - Tab ID for capturing
 * @returns {Promise<object>} Result object with success status
 */
async function handleViewportOrPageCapture(data, tabId) {
  try {
    // Load settings
    const settings = await chrome.storage.local.get(['format', 'quality', 'copyToClipboard', 'showPreview']);
    const outputFormat = settings.format || 'png';
    const outputQuality = settings.quality || 95;
    const copyToClipboard = settings.copyToClipboard ?? true;
    const showPreview = settings.showPreview ?? true;

    let captureBlob;
    let filename;

    if (data.captureMode === 'viewport') {
      // Viewport capture - just capture visible area
      const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });

      // Convert to blob with desired format/quality
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);

      const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageBitmap, 0, 0);

      const mimeType = outputFormat === 'jpg' ? 'image/jpeg' : 'image/png';
      const qualityParam = outputFormat === 'jpg' ? outputQuality / 100 : undefined;

      captureBlob = await canvas.convertToBlob({
        type: mimeType,
        quality: qualityParam
      });

      imageBitmap.close();
      canvas.width = 0;
      canvas.height = 0;

      filename = generateViewportFilename('viewport', outputFormat);
    } else if (data.captureMode === 'fullpage') {
      // Full page capture - use multi-tile capture
      captureBlob = await captureFullPage(data, tabId, outputFormat, outputQuality);
      filename = generateViewportFilename('fullpage', outputFormat);
    } else {
      throw new Error('Invalid capture mode');
    }

    // Pre-compute dataURL once if preview is enabled — clipboard/download
    // paths and history all reuse the single encoding.
    const dataUrl = showPreview ? await blobToDataURL(captureBlob) : null;

    // Save to downloads or copy to clipboard based on settings
    let action;
    if (copyToClipboard) {
      await copyImageToClipboard(captureBlob, dataUrl);
      action = 'copy';
    } else {
      await downloadImage(captureBlob, filename, dataUrl);
      action = 'download';
    }

    // Persist to history (and surface its id) only when preview is enabled —
    // history is the data source for the preview UI's history view.
    let captureId = null;
    if (dataUrl) {
      const source = data.captureMode === 'fullpage' ? 'fullpage' : 'viewport';
      captureId = await saveToHistory({
        dataUrl,
        source,
        mimeType: captureBlob.type,
        byteSize: captureBlob.size,
      });
    }
    return captureId ? { success: true, action, captureId } : { success: true, action };
  } catch (error) {
    console.error('Capture failed:', error);
    return { success: false, error: error.message };
  }
}

// ─── Chrome DevTools Protocol helpers ────────────────────────────────────────
function attachDebugger(tabId) {
  return new Promise((resolve, reject) => {
    chrome.debugger.attach({ tabId }, '1.3', () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}

function detachDebugger(tabId) {
  return new Promise((resolve, reject) => {
    chrome.debugger.detach({ tabId }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}

function sendDebugCommand(tabId, method, params = {}) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, params, result => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(result);
    });
  });
}

/**
 * Capture full page in a single shot using the Chrome DevTools Protocol.
 * Attaches the debugger, calls Page.captureScreenshot with captureBeyondViewport,
 * then detaches — no scrolling or tile stitching required.
 * @param {object} data - Capture data from content script
 * @param {number} tabId - Tab ID for capturing
 * @param {string} format - Output format (png/jpg)
 * @param {number} quality - Output quality (1-100)
 * @returns {Promise<Blob>} Full page image
 */
async function captureFullPage(data, tabId, format, quality) {
  const { documentDimensions, viewport, devicePixelRatio: dpr } = data;

  const finalWidth = Math.round(documentDimensions.width * dpr);
  const finalHeight = Math.round(documentDimensions.height * dpr);
  const MAX_DIMENSION = 16384;

  if (finalWidth > MAX_DIMENSION || finalHeight > MAX_DIMENSION) {
    throw new Error(`Page too large: ${finalWidth}×${finalHeight}px exceeds max ${MAX_DIMENSION}px`);
  }

  console.log(`Full page capture: ${documentDimensions.width}×${documentDimensions.height}px → ${finalWidth}×${finalHeight}px physical`);

  let debuggerAttached = false;

  try {
    await chrome.tabs.sendMessage(tabId, { action: 'hideScrollbars' });

    try {
      await attachDebugger(tabId);
      debuggerAttached = true;
    } catch (e) {
      if (e.message && e.message.includes('Another debugger')) {
        throw new Error('Cannot capture: DevTools is open on this tab. Close DevTools and try again.');
      }
      throw e;
    }

    // Expand the emulated viewport to the full page height so the browser
    // reflows and renders all content in one pass before capture.
    // captureBeyondViewport ensures off-screen content is included even if
    // the resize alone doesn't fully extend the rendering surface.
    await sendDebugCommand(tabId, 'Emulation.setDeviceMetricsOverride', {
      width: Math.ceil(documentDimensions.width),
      height: Math.ceil(documentDimensions.height),
      deviceScaleFactor: dpr,
      mobile: false,
    });

    // Allow the page to reflow after the viewport resize.
    await new Promise(resolve => setTimeout(resolve, 200));

    const result = await sendDebugCommand(tabId, 'Page.captureScreenshot', {
      format: format === 'jpg' ? 'jpeg' : 'png',
      quality: format === 'jpg' ? quality : undefined,
      captureBeyondViewport: true,
    });

    const binaryString = atob(result.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes.buffer], { type: format === 'jpg' ? 'image/jpeg' : 'image/png' });

  } finally {
    if (debuggerAttached) {
      await sendDebugCommand(tabId, 'Emulation.clearDeviceMetricsOverride').catch(() => {});
      await detachDebugger(tabId).catch(e => console.warn('Failed to detach debugger:', e));
    }
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'showScrollbars' });
      await chrome.tabs.sendMessage(tabId, { action: 'scrollToPosition', x: 0, y: 0 });
    } catch (e) {
      console.warn('Failed to restore page state:', e);
    }
  }
}

/**
 * Generate filename for viewport/fullpage screenshots
 * @param {string} mode - Capture mode (viewport/fullpage)
 * @param {string} format - File format
 * @returns {string} Filename
 */
function generateViewportFilename(mode, format) {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .substring(0, 19);

  const ext = format === 'jpg' ? 'jpg' : 'png';

  return `screenshot_${mode}_${timestamp}.${ext}`;
}

/**
 * Main capture handler
 * Orchestrates screenshot capture, crop, and download
 * @param {object} data - Capture data from content script
 * @param {number} tabId - Tab ID for capturing
 * @returns {Promise<object>} Result object with success status
 */
async function handleElementCapture(data, tabId) {
  try {
    // Load settings
    const settings = await chrome.storage.local.get(['format', 'quality', 'fullCapture', 'copyToClipboard', 'showPreview']);
    const outputFormat = settings.format || 'png';
    const outputQuality = settings.quality || 95;
    const fullCapture = settings.fullCapture || false;
    const copyToClipboard = settings.copyToClipboard ?? true;
    const showPreview = settings.showPreview ?? true;

    // Determine if multi-capture is needed
    const needsMultiCapture = fullCapture && (
      data.rect.width > data.viewport.width ||
      data.rect.height > data.viewport.height
    );

    let croppedBlob;
    if (needsMultiCapture) {
      croppedBlob = await captureFullElement(data, tabId, outputFormat, outputQuality);
    } else {
      // Use existing single-capture logic
      const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
      croppedBlob = await cropImageToElement(dataUrl, data, outputFormat, outputQuality);
    }

    // Pre-compute dataURL once if preview is enabled — clipboard/download
    // paths and history all reuse the single encoding.
    const dataUrl = showPreview ? await blobToDataURL(croppedBlob) : null;

    // Save to downloads or copy to clipboard based on settings
    let action;
    if (copyToClipboard) {
      await copyImageToClipboard(croppedBlob, dataUrl);
      action = 'copy';
    } else {
      const filename = generateFilename(data.elementInfo, outputFormat);
      await downloadImage(croppedBlob, filename, dataUrl);
      action = 'download';
    }

    let captureId = null;
    if (dataUrl) {
      captureId = await saveToHistory({
        dataUrl,
        source: 'element',
        mimeType: croppedBlob.type,
        byteSize: croppedBlob.size,
      });
    }
    return captureId ? { success: true, action, captureId } : { success: true, action };
  } catch (error) {
    console.error('Capture failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle selected region capture
 * Captures viewport and crops to the user-selected rectangle
 * @param {object} data - Capture data with rect (viewport-relative), DPR
 * @param {number} tabId - Tab ID for capturing
 * @returns {Promise<object>} Result object with success status
 */
async function handleRegionCapture(data, tabId) {
  try {
    // Load settings
    const settings = await chrome.storage.local.get(['format', 'quality', 'copyToClipboard', 'showPreview']);
    const outputFormat = settings.format || 'png';
    const outputQuality = settings.quality || 95;
    const copyToClipboard = settings.copyToClipboard ?? true;
    const showPreview = settings.showPreview ?? true;

    // Capture the visible tab
    const rawDataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });

    // Reuse cropImageToElement — the region rect is viewport-relative,
    // which is the same coordinate space as a single-tile element capture
    const croppedBlob = await cropImageToElement(rawDataUrl, data, outputFormat, outputQuality);

    // Pre-compute dataURL once if preview is enabled — clipboard/download
    // paths and history all reuse the single encoding.
    const previewDataUrl = showPreview ? await blobToDataURL(croppedBlob) : null;

    // Save to downloads or copy to clipboard based on settings
    let action;
    if (copyToClipboard) {
      await copyImageToClipboard(croppedBlob, previewDataUrl);
      action = 'copy';
    } else {
      const filename = generateViewportFilename('region', outputFormat);
      await downloadImage(croppedBlob, filename, previewDataUrl);
      action = 'download';
    }

    let captureId = null;
    if (previewDataUrl) {
      captureId = await saveToHistory({
        dataUrl: previewDataUrl,
        source: 'region',
        mimeType: croppedBlob.type,
        byteSize: croppedBlob.size,
      });
    }
    return captureId ? { success: true, action, captureId } : { success: true, action };
  } catch (error) {
    console.error('Region capture failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Capture full element using multi-capture stitching
 * Tiles viewport captures to cover entire element
 * @param {object} data - Capture data from content script
 * @param {number} tabId - Tab ID for capturing
 * @param {string} format - Output format (png/jpg)
 * @param {number} quality - Output quality (1-100)
 * @returns {Promise<Blob>} Stitched element image
 */
async function captureFullElement(data, tabId, format, quality) {
  const { rect, scroll, viewport, devicePixelRatio: dpr, debugMode } = data;

  // Element absolute position on page
  const elementAbsX = scroll.x + rect.x;
  const elementAbsY = scroll.y + rect.y;

  // Calculate tile grid
  const tilesX = Math.ceil(rect.width / viewport.width);
  const tilesY = Math.ceil(rect.height / viewport.height);

  console.log(`Multi-capture: ${tilesX}×${tilesY} tiles for ${rect.width}×${rect.height}px element`);

  // Validate final canvas size
  const finalWidth = Math.round(rect.width * dpr);
  const finalHeight = Math.round(rect.height * dpr);
  const MAX_DIMENSION = 16384;
  if (finalWidth > MAX_DIMENSION || finalHeight > MAX_DIMENSION) {
    throw new Error(`Element too large: ${finalWidth}×${finalHeight}px exceeds max ${MAX_DIMENSION}px`);
  }

  // Create final canvas for stitching
  const finalCanvas = new OffscreenCanvas(finalWidth, finalHeight);
  const finalCtx = finalCanvas.getContext('2d');

  try {
    // Hide scrollbars before capturing tiles
    await chrome.tabs.sendMessage(tabId, { action: 'hideScrollbars' });

    // Track cumulative Y position to avoid rounding gaps between rows
    let cumulativeY = 0;

    // Capture each tile
    for (let tileY = 0; tileY < tilesY; tileY++) {
      // Calculate row height for this row (needed for cumulative positioning)
      const rowHeight = Math.min(viewport.height, rect.height - (tileY * viewport.height));
      const rowHeightPhysical = Math.ceil(rowHeight * dpr);

      for (let tileX = 0; tileX < tilesX; tileX++) {
        // Calculate scroll position for this tile
        const targetScrollX = elementAbsX + (tileX * viewport.width);
        const targetScrollY = elementAbsY + (tileY * viewport.height);

        console.log(`Capturing tile (${tileX},${tileY}): scrolling to (${targetScrollX}, ${targetScrollY})`);

        // Request content script to scroll
        const scrollResponse = await chrome.tabs.sendMessage(tabId, {
          action: 'scrollToPosition',
          x: targetScrollX,
          y: targetScrollY
        });

        const actualScrollX = scrollResponse.scroll.x;
        const actualScrollY = scrollResponse.scroll.y;

        console.log(`Target scroll: (${targetScrollX}, ${targetScrollY}), Actual: (${actualScrollX}, ${actualScrollY})`);

        // Calculate visible element size in this tile
        const visibleWidth = Math.min(
          viewport.width,
          rect.width - (tileX * viewport.width)
        );
        const visibleHeight = Math.min(
          viewport.height,
          rect.height - (tileY * viewport.height)
        );

        // Calculate absolute position of the region we want to capture
        const regionAbsX = elementAbsX + (tileX * viewport.width);
        const regionAbsY = elementAbsY + (tileY * viewport.height);

        // Calculate where this tile appears in viewport for debug visualization
        const tileViewportX = regionAbsX - actualScrollX;
        const tileViewportY = regionAbsY - actualScrollY;
        const tileViewportWidth = Math.min(visibleWidth, viewport.width - tileViewportX);
        const tileViewportHeight = Math.min(visibleHeight, viewport.height - tileViewportY);

        // Show debug border if debug mode enabled
        if (debugMode) {
          await chrome.tabs.sendMessage(tabId, {
            action: 'showDebugBorder',
            x: Math.max(0, tileViewportX),
            y: Math.max(0, tileViewportY),
            width: tileViewportWidth,
            height: tileViewportHeight
          });
        }

        // Wait for dynamic content AND Chrome's capture rate limit
        // Chrome limits captureVisibleTab to ~2 per second (500ms minimum between captures)
        // Add extra delay in debug mode so user can see the border
        await new Promise(resolve => setTimeout(resolve, debugMode ? 1200 : 600));

        // Capture visible tab at this scroll position
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
        const blob = await fetch(dataUrl).then(r => r.blob());
        const imageBitmap = await createImageBitmap(blob);

        // Calculate where this region appears in the captured viewport
        // If scroll didn't reach target (document boundary), region won't be at (0,0)
        const viewportOffsetX = regionAbsX - actualScrollX;
        const viewportOffsetY = regionAbsY - actualScrollY;

        // Source region (physical pixels) - use floor to avoid gaps
        const sx = Math.floor(viewportOffsetX * dpr);
        const sy = Math.floor(viewportOffsetY * dpr);
        const sWidth = Math.ceil(visibleWidth * dpr);
        const sHeight = Math.ceil(visibleHeight * dpr);

        // Destination position on final canvas (physical pixels)
        // Use cumulative Y to avoid rounding gaps between rows
        const dx = Math.floor(tileX * viewport.width * dpr);
        const dy = cumulativeY;

        // Destination size - use exact tile size to avoid gaps
        const dWidth = Math.ceil(visibleWidth * dpr);
        const dHeight = Math.ceil(visibleHeight * dpr);

        // Validate source region is within captured image bounds
        if (sx < 0 || sy < 0 || sx + sWidth > imageBitmap.width || sy + sHeight > imageBitmap.height) {
          console.warn(`Tile (${tileX},${tileY}): Source region out of bounds - sx:${sx} sy:${sy} sw:${sWidth} sh:${sHeight}, image:${imageBitmap.width}×${imageBitmap.height}`);
          // Clamp to valid region
          const clampedSX = Math.max(0, Math.min(sx, imageBitmap.width - 1));
          const clampedSY = Math.max(0, Math.min(sy, imageBitmap.height - 1));
          const clampedWidth = Math.min(sWidth, imageBitmap.width - clampedSX);
          const clampedHeight = Math.min(sHeight, imageBitmap.height - clampedSY);

          if (clampedWidth > 0 && clampedHeight > 0) {
            finalCtx.drawImage(
              imageBitmap,
              clampedSX, clampedSY, clampedWidth, clampedHeight,
              dx, dy, dWidth, dHeight
            );
          }
        } else {
          // Draw tile onto final canvas
          finalCtx.drawImage(
            imageBitmap,
            sx, sy, sWidth, sHeight,
            dx, dy, dWidth, dHeight
          );
        }

        // Cleanup
        imageBitmap.close();

        console.log(`Tile (${tileX},${tileY}): extracted (${sx},${sy},${sWidth}×${sHeight}) → canvas (${dx},${dy})`);
      }

      // After completing a row, update cumulative Y position
      cumulativeY += rowHeightPhysical;
    }

    // Convert final canvas to blob
    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const qualityParam = format === 'jpg' ? quality / 100 : undefined;

    const stitchedBlob = await finalCanvas.convertToBlob({
      type: mimeType,
      quality: qualityParam
    });

    // Cleanup
    finalCanvas.width = 0;
    finalCanvas.height = 0;

    console.log(`Multi-capture complete: ${finalWidth}×${finalHeight}px`);

    return stitchedBlob;

  } finally {
    // Always restore scrollbars and hide debug border, even if capture fails
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'showScrollbars' });
    } catch (e) {
      console.warn('Failed to restore scrollbars:', e);
    }

    if (debugMode) {
      try {
        await chrome.tabs.sendMessage(tabId, { action: 'hideDebugBorder' });
      } catch (e) {
        console.warn('Failed to hide debug border:', e);
      }
    }
  }
}

/**
 * Crop captured screenshot to element bounds
 * Handles DPR scaling and coordinate conversion
 *
 * DPR Math Explanation:
 * - captureVisibleTab captures at physical resolution (CSS pixels × DPR)
 * - Element rect is in CSS pixels relative to viewport
 * - Canvas operations need physical pixels
 *
 * Coordinate Conversion:
 * - Element is at (rect.x, rect.y) in viewport (CSS pixels)
 * - In captured image, this is at (rect.x × DPR, rect.y × DPR) (physical pixels)
 * - Source region: (sx, sy, sWidth, sHeight) all in physical pixels
 * - Destination: (0, 0, rect.width × DPR, rect.height × DPR)
 *
 * @param {string} dataUrl - Full screenshot data URL
 * @param {object} data - Capture data with rect, scroll, DPR
 * @param {string} format - Output format (png/jpg)
 * @param {number} quality - Output quality (1-100)
 * @returns {Promise<Blob>} Cropped image blob
 */
async function cropImageToElement(dataUrl, data, format, quality) {
  try {
    const { rect, devicePixelRatio: dpr } = data;

    // Validate element dimensions
    if (rect.width <= 0 || rect.height <= 0) {
      throw new Error('Element has zero dimensions');
    }

    // Calculate physical pixel dimensions
    const physicalWidth = Math.round(rect.width * dpr);
    const physicalHeight = Math.round(rect.height * dpr);

    // Validate canvas size limits
    const MAX_DIMENSION = 16384;
    if (physicalWidth > MAX_DIMENSION || physicalHeight > MAX_DIMENSION) {
      throw new Error(`Element too large (max ${MAX_DIMENSION}px)`);
    }

    // Convert dataURL to Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Create ImageBitmap from blob (works in service worker)
    const imageBitmap = await createImageBitmap(blob);

    // Create canvas sized to element (physical pixels)
    const canvas = new OffscreenCanvas(physicalWidth, physicalHeight);
    const ctx = canvas.getContext('2d');

    // Source coordinates in captured image (physical pixels)
    // Element is at (rect.x, rect.y) in viewport
    // No need to account for scroll since captureVisibleTab only captures viewport
    const sx = Math.round(rect.x * dpr);
    const sy = Math.round(rect.y * dpr);
    const sWidth = physicalWidth;
    const sHeight = physicalHeight;

    // Validate source region is within image bounds
    if (sx < 0 || sy < 0 ||
      sx + sWidth > imageBitmap.width ||
      sy + sHeight > imageBitmap.height) {
      console.warn('Element partially outside viewport, clamping coordinates');

      // Clamp to image bounds
      const clampedSX = Math.max(0, sx);
      const clampedSY = Math.max(0, sy);
      const clampedWidth = Math.min(sWidth, imageBitmap.width - clampedSX);
      const clampedHeight = Math.min(sHeight, imageBitmap.height - clampedSY);

      if (clampedWidth <= 0 || clampedHeight <= 0) {
        throw new Error('Element is completely outside viewport');
      }
    }

    // Draw cropped region to canvas
    // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    ctx.drawImage(
      imageBitmap,
      sx, sy, sWidth, sHeight,           // Source region (physical pixels)
      0, 0, physicalWidth, physicalHeight // Destination (full canvas)
    );

    // Convert canvas to blob
    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const qualityParam = format === 'jpg' ? quality / 100 : undefined;

    const croppedBlob = await canvas.convertToBlob({
      type: mimeType,
      quality: qualityParam
    });

    // Cleanup
    imageBitmap.close();
    canvas.width = 0;
    canvas.height = 0;

    return croppedBlob;

  } catch (error) {
    throw new Error(`Crop failed: ${error.message}`);
  }
}

/**
 * Generate filename for screenshot
 * Format: screenshot_[element]_[timestamp].[ext]
 * @param {object} elementInfo - Element metadata
 * @param {string} format - File format
 * @returns {string} Filename
 */
function generateFilename(elementInfo, format) {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .substring(0, 19);

  // Use element ID or tag name for filename
  const elementName = elementInfo.id ||
    elementInfo.tagName.toLowerCase() ||
    'element';

  // Sanitize element name
  const safeName = elementName
    .replace(/[^a-z0-9_-]/gi, '_')
    .substring(0, 30);

  const ext = format === 'jpg' ? 'jpg' : 'png';

  return `screenshot_${safeName}_${timestamp}.${ext}`;
}

/**
 * Convert Blob to data URL
 * Service worker compatible (doesn't use URL.createObjectURL or FileReader)
 * @param {Blob} blob - Image blob
 * @returns {Promise<string>} Data URL
 */
async function blobToDataURL(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Convert to base64
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return `data:${blob.type};base64,${base64}`;
}

/**
 * Copy image blob to clipboard
 * Uses Clipboard API to write image data
 * @param {Blob} blob - Image blob
 * @param {string} [precomputedDataUrl] - Optional pre-computed dataURL to avoid re-encoding
 * @returns {Promise<void>}
 */
async function copyImageToClipboard(blob, precomputedDataUrl) {
  try {
    // Service workers don't have direct access to navigator.clipboard
    // We need to send the blob to the content script to copy it
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      throw new Error('No active tab found');
    }

    // Focus the window to ensure clipboard API works
    // Clipboard API requires document focus for security reasons
    await chrome.windows.update(tab.windowId, { focused: true });

    // Convert blob to data URL (or reuse pre-computed one)
    const dataUrl = precomputedDataUrl || await blobToDataURL(blob);

    // Send to content script to copy to clipboard
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'copyToClipboard',
      dataUrl: dataUrl
    });

    // Check if the copy operation was successful
    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to copy to clipboard');
    }

    console.log('Image copied to clipboard');
  } catch (error) {
    throw new Error(`Clipboard copy failed: ${error.message}`);
  }
}

/**
 * Download image blob
 * Uses chrome.downloads API to save without prompt
 * Service worker compatible - converts blob to data URL
 * @param {Blob} blob - Image blob
 * @param {string} filename - Download filename
 * @param {string} [precomputedDataUrl] - Optional pre-computed dataURL to avoid re-encoding
 * @returns {Promise<void>}
 */
async function downloadImage(blob, filename, precomputedDataUrl) {
  try {
    // Convert blob to data URL (or reuse pre-computed one)
    const dataUrl = precomputedDataUrl || await blobToDataURL(blob);

    // Start download using data URL
    return new Promise((resolve, reject) => {
      chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false  // Auto-save to default downloads folder
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        // Wait for download to complete
        chrome.downloads.onChanged.addListener(function listener(delta) {
          if (delta.id === downloadId && delta.state?.current === 'complete') {
            chrome.downloads.onChanged.removeListener(listener);
            resolve();
          }
        });
      });
    });
  } catch (error) {
    throw new Error(`Download failed: ${error.message}`);
  }
}
