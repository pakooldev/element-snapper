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
  } else if (message.action === 'openEditor') {
    // Opened next to the page, from the preview's Edit button.
    chrome.tabs.create({
      url: `${chrome.runtime.getURL('editor/editor.html')}#capture=${encodeURIComponent(message.captureId)}`,
      index: sender.tab ? sender.tab.index + 1 : undefined,
      openerTabId: sender.tab?.id,
    });
  } else if (message.action === 'openHome') {
    // "My edits", from the panel.
    chrome.tabs.create({
      url: chrome.runtime.getURL('editor/home.html'),
      index: sender.tab ? sender.tab.index + 1 : undefined,
      openerTabId: sender.tab?.id,
    });
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

const MAX_CANVAS_DIMENSION = 16384; // Browser hard limit

/**
 * Block until the tab has actually produced a new compositor frame, so a
 * capture right after this is guaranteed to reflect any DOM change made just
 * before calling it (e.g. panel.js's hidePanel()/hideForCapture()) — no
 * fixed delay to guess at, and no race under load since it's driven by the
 * tab's real render loop rather than a timer running in the service worker.
 * @param {number} tabId
 */
async function waitForNextFrame(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  });
}

/**
 * Handle viewport or full page capture
 * @param {object} data - Capture data from content script
 * @param {number} tabId - Tab ID for capturing
 * @returns {Promise<object>} Result object with success status
 */
/**
 * Resolve whether a capture should copy to clipboard (true) or download
 * (false). outputMode is the source of truth once set; copyToClipboard is
 * only consulted for installs that haven't saved a settings change since the
 * 3-way mode shipped.
 *
 * "Copy as Prompt" only makes sense for a single element and is handled
 * entirely client-side in element_selector.js, which never sends a capture
 * request to this file when that mode is active — but Area/Screen/Page
 * (content-main.js) have no such guard and always request a capture
 * regardless of outputMode. So this can legitimately be called with
 * outputMode === 'copyPrompt'; treat that the same as 'copyImage' (copy to
 * clipboard) rather than falling into the download branch nobody asked for.
 * @param {object} settings - chrome.storage.local settings
 * @returns {boolean}
 */
function resolveCopyToClipboard(settings) {
  if (!settings.outputMode) return settings.copyToClipboard ?? true;
  return settings.outputMode !== 'download';
}

async function handleViewportOrPageCapture(data, tabId) {
  try {
    // Load settings
    const settings = await chrome.storage.local.get(['format', 'quality', 'outputMode', 'copyToClipboard', 'showPreview']);
    const outputFormat = settings.format || 'png';
    const outputQuality = settings.quality || 95;
    const copyToClipboard = resolveCopyToClipboard(settings);
    const showPreview = settings.showPreview ?? true;

    let captureBlob;
    let filename;
    let notice;

    if (data.captureMode === 'viewport') {
      // Viewport capture - just capture visible area
      await waitForNextFrame(tabId);
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
      // Full page capture - scroll + captureVisibleTab + stitch
      const stitched = await captureStitched(data, tabId, outputFormat, outputQuality, 'page');
      captureBlob = stitched.blob;
      notice = scaledNotice(stitched.scale);
      filename = generateViewportFilename('fullpage', outputFormat);
    } else {
      throw new Error('Invalid capture mode');
    }

    // Pre-compute dataURL once if preview is enabled — clipboard/download
    // paths and history all reuse the single encoding.
    const dataUrl = showPreview ? await blobToDataURL(captureBlob) : null;

    // Save to downloads or copy to clipboard based on settings
    const { action, notice: copyNotice } = await saveOrCopy(copyToClipboard, captureBlob, filename, dataUrl);
    notice = copyNotice || notice;

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
    return captureId ? { success: true, action, captureId, notice } : { success: true, action, notice };
  } catch (error) {
    console.error('Capture failed:', error);
    return { success: false, error: error.message };
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
    const settings = await chrome.storage.local.get(['format', 'quality', 'fullCapture', 'outputMode', 'copyToClipboard', 'showPreview']);
    const outputFormat = settings.format || 'png';
    const outputQuality = settings.quality || 95;
    const fullCapture = settings.fullCapture || false;
    const copyToClipboard = resolveCopyToClipboard(settings);
    const showPreview = settings.showPreview ?? true;

    let croppedBlob;
    let notice;
    if (fullCapture) {
      const stitched = await captureStitched(data, tabId, outputFormat, outputQuality, 'element');
      croppedBlob = stitched.blob;
      notice = scaledNotice(stitched.scale);
    } else {
      // Use existing single-capture logic
      await waitForNextFrame(tabId);
      const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
      croppedBlob = await cropImageToElement(dataUrl, data, outputFormat, outputQuality);
    }

    // Pre-compute dataURL once if preview is enabled — clipboard/download
    // paths and history all reuse the single encoding.
    const dataUrl = showPreview ? await blobToDataURL(croppedBlob) : null;

    // Save to downloads or copy to clipboard based on settings
    const filename = generateFilename(data.elementInfo, outputFormat);
    const { action, notice: copyNotice } = await saveOrCopy(copyToClipboard, croppedBlob, filename, dataUrl);
    notice = copyNotice || notice;

    let captureId = null;
    if (dataUrl) {
      captureId = await saveToHistory({
        dataUrl,
        source: 'element',
        mimeType: croppedBlob.type,
        byteSize: croppedBlob.size,
      });
    }
    return captureId ? { success: true, action, captureId, notice } : { success: true, action, notice };
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
    const settings = await chrome.storage.local.get(['format', 'quality', 'outputMode', 'copyToClipboard', 'showPreview']);
    const outputFormat = settings.format || 'png';
    const outputQuality = settings.quality || 95;
    const copyToClipboard = resolveCopyToClipboard(settings);
    const showPreview = settings.showPreview ?? true;

    // Capture the visible tab
    await waitForNextFrame(tabId);
    const rawDataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });

    // Reuse cropImageToElement — the region rect is viewport-relative,
    // which is the same coordinate space as a single-tile element capture
    const croppedBlob = await cropImageToElement(rawDataUrl, data, outputFormat, outputQuality);

    // Pre-compute dataURL once if preview is enabled — clipboard/download
    // paths and history all reuse the single encoding.
    const previewDataUrl = showPreview ? await blobToDataURL(croppedBlob) : null;

    // Save to downloads or copy to clipboard based on settings
    const filename = generateViewportFilename('region', outputFormat);
    const { action, notice } = await saveOrCopy(copyToClipboard, croppedBlob, filename, previewDataUrl);

    let captureId = null;
    if (previewDataUrl) {
      captureId = await saveToHistory({
        dataUrl: previewDataUrl,
        source: 'region',
        mimeType: croppedBlob.type,
        byteSize: croppedBlob.size,
      });
    }
    return captureId ? { success: true, action, captureId, notice } : { success: true, action, notice };
  } catch (error) {
    console.error('Region capture failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Capture more than the screen shows, by asking the page for one tile at a time
 * (see "Stitched capture" in content/utils.js) and drawing each onto one canvas.
 * Used for a Scroll Element capture and for Page mode.
 * @param {object} data - Capture data from content script
 * @param {number} tabId - Tab ID for capturing
 * @param {string} format - Output format (png/jpg)
 * @param {number} quality - Output quality (1-100)
 * @param {'page'|'element'} mode
 * @returns {Promise<{blob: Blob, scale: number}>} Stitched image, and the scale it was drawn at
 */
async function captureStitched(data, tabId, format, quality, mode) {
  const { devicePixelRatio: dpr, debugMode } = data;

  try {
    const { plan, error } = await chrome.tabs.sendMessage(tabId, { action: 'tilePrepare', mode });
    if (error) throw new Error(error);
    if (plan.width <= 0 || plan.height <= 0) throw new Error('Element has zero dimensions');

    // Past the browser's canvas limit, the image is scaled down rather than refused.
    const scale = Math.min(1, MAX_CANVAS_DIMENSION / (plan.canvasWidth * dpr), MAX_CANVAS_DIMENSION / (plan.canvasHeight * dpr));
    const toCanvas = dpr * scale;
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(plan.canvasWidth * toCanvas)), Math.max(1, Math.round(plan.canvasHeight * toCanvas)));
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';

    // Rounding each edge from its exact position leaves no gap or overlap between tiles.
    const draw = (bitmap, left, top, width, height, canvasX, canvasY) => {
      const toImageX = bitmap.width / plan.viewportWidth;
      const toImageY = bitmap.height / plan.viewportHeight;
      const sx = Math.round(left * toImageX);
      const sy = Math.round(top * toImageY);
      const dx = Math.round(canvasX * toCanvas);
      const dy = Math.round(canvasY * toCanvas);
      ctx.drawImage(
        bitmap,
        sx, sy, Math.round((left + width) * toImageX) - sx, Math.round((top + height) * toImageY) - sy,
        dx, dy, Math.round((canvasX + width) * toCanvas) - dx, Math.round((canvasY + height) * toCanvas) - dy,
      );
    };

    let index = 0;
    let reachedX = 0;
    let reachedY = 0;
    let y = 0;

    while (y < plan.height - 0.5) {
      let x = 0;
      let rowEnd = y;

      while (x < plan.width - 0.5) {
        // Wait for dynamic content and Chrome's limit of about 2 captures a second.
        // Debug mode waits longer so the border can be seen.
        const tile = await chrome.tabs.sendMessage(tabId, { action: 'tilePosition', x, y, index, settleMs: debugMode ? 1200 : 600 });
        if (tile.width <= 0 || tile.height <= 0) break;

        if (debugMode) {
          await chrome.tabs.sendMessage(tabId, { action: 'showDebugBorder', x: tile.left, y: tile.top, width: tile.width, height: tile.height });
          await waitForNextFrame(tabId);
        }

        const bitmap = await captureTileBitmap(tabId);

        // A pane's page keeps what surrounds the pane, once, from the first tile.
        if (index === 0 && plan.pane) {
          const { bottom, extra, background } = plan.pane;
          draw(bitmap, 0, 0, plan.canvasWidth, plan.viewportHeight, 0, 0);
          ctx.fillStyle = background;
          ctx.fillRect(0, Math.round(bottom * toCanvas), canvas.width, Math.round(extra * toCanvas));
          draw(bitmap, 0, bottom, plan.canvasWidth, plan.viewportHeight - bottom, 0, bottom + extra);
        }

        draw(bitmap, tile.left, tile.top, tile.width, tile.height, plan.offsetX + tile.atX, plan.offsetY + tile.atY);
        bitmap.close();

        index++;
        const nextX = tile.atX + tile.width;
        rowEnd = Math.max(rowEnd, tile.atY + tile.height);
        reachedX = Math.max(reachedX, nextX);
        reachedY = Math.max(reachedY, rowEnd);
        if (nextX <= x + 0.5) break; // Can't go further this way
        x = nextX;
      }

      if (rowEnd <= y + 0.5) break;
      y = rowEnd;
    }

    if (index === 0) throw new Error('The element is not visible on the page');

    const blob = await encodeStitched(canvas, plan, reachedX, reachedY, toCanvas, format, quality);
    canvas.width = 0;
    canvas.height = 0;
    return { blob, scale };
  } finally {
    await chrome.tabs.sendMessage(tabId, { action: 'tileFinish' }).catch((e) => console.warn('Failed to restore the page:', e));
    if (debugMode) await chrome.tabs.sendMessage(tabId, { action: 'hideDebugBorder' }).catch(() => {});
  }
}

/** A screenshot of the tab being captured, failing if the user has switched away from it. */
async function captureTileBitmap(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.active) throw new Error('Capture stopped because the tab was switched');
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
  return createImageBitmap(await (await fetch(dataUrl)).blob());
}

/** Encodes the result, trimmed to what could be reached if part of a target can't be scrolled to. */
async function encodeStitched(canvas, plan, reachedX, reachedY, toCanvas, format, quality) {
  const options = { type: format === 'jpg' ? 'image/jpeg' : 'image/png', quality: format === 'jpg' ? quality / 100 : undefined };
  const width = plan.pane ? canvas.width : Math.min(canvas.width, Math.round(reachedX * toCanvas));
  const height = plan.pane ? canvas.height : Math.min(canvas.height, Math.round(reachedY * toCanvas));
  if (width === canvas.width && height === canvas.height) return canvas.convertToBlob(options);

  const trimmed = new OffscreenCanvas(width, height);
  trimmed.getContext('2d').drawImage(canvas, 0, 0);
  return trimmed.convertToBlob(options);
}

/** What to tell the user about a capture that had to be scaled down. */
function scaledNotice(scale) {
  return scale < 1 ? `Too large for one image, so it was scaled to ${Math.round(scale * 100)}%` : undefined;
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
 * Copies the image or downloads it, as the Output setting says. A copy that the
 * page can't do (no clipboard on http:// pages, or the page lost focus during a
 * countdown) is downloaded instead, so the capture isn't lost.
 * @returns {Promise<{action: 'copy'|'download', notice?: string}>}
 */
async function saveOrCopy(copy, blob, filename, dataUrl) {
  if (copy) {
    try {
      await copyImageToClipboard(blob, dataUrl);
      return { action: 'copy' };
    } catch (error) {
      console.warn(error);
      await downloadImage(blob, filename, dataUrl);
      return { action: 'download', notice: `Couldn't copy: ${error.reason || 'the page blocked the clipboard'}. Saved to Downloads instead` };
    }
  }
  await downloadImage(blob, filename, dataUrl);
  return { action: 'download' };
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
      throw Object.assign(new Error(response?.error || 'Failed to copy to clipboard'), { reason: response?.reason });
    }

    console.log('Image copied to clipboard');
  } catch (error) {
    throw Object.assign(new Error(`Clipboard copy failed: ${error.message}`), { reason: error.reason });
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
