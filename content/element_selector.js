/**
 * Element selector module
 * Handles element hover highlighting and click capture
 */

class ElementSelector {
  constructor() {
    this.isActive = false;
    this.currentElement = null;
    this.highlightOverlay = null;
    this.fullCapture = false;        // cached setting, updated on start()
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundClick = this.handleClick.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Start selection mode
   * Enables hover highlighting and click capture
   */
  start() {
    if (this.isActive) return;

    this.isActive = true;

    // Cache the fullCapture setting — ready well before first user hover
    chrome.storage.local.get(['fullCapture']).then(settings => {
      this.fullCapture = settings.fullCapture || false;
    });

    injectHighlightStyles();

    // Add event listeners using capture phase
    document.addEventListener('mousemove', this.boundMouseMove, true);
    document.addEventListener('click', this.boundClick, true);
    document.addEventListener('keydown', this.boundKeyDown, true);

    // Create fixed-position highlight overlay
    this.highlightOverlay = createHighlightOverlay();

    // Create dimension label
    this.dimensionLabel = document.createElement('div');
    this.dimensionLabel.id = 'element-screenshot-dimensions';
    this.dimensionLabel.style.display = 'none';
    document.body.appendChild(this.dimensionLabel);

    // Change cursor
    document.body.style.cursor = 'crosshair';
  }

  /**
   * Stop selection mode
   * Removes all event listeners and highlights
   */
  stop() {
    if (!this.isActive) return;

    this.isActive = false;

    // Remove event listeners
    document.removeEventListener('mousemove', this.boundMouseMove, true);
    document.removeEventListener('click', this.boundClick, true);
    document.removeEventListener('keydown', this.boundKeyDown, true);

    // Remove highlight overlay
    if (this.highlightOverlay) {
      this.highlightOverlay.remove();
      this.highlightOverlay = null;
    }

    // Clear current element reference
    this.currentElement = null;

    // Remove dimension label
    if (this.dimensionLabel) {
      this.dimensionLabel.remove();
      this.dimensionLabel = null;
    }

    // Restore cursor
    document.body.style.cursor = '';
  }

  /**
   * Handle mouse move event
   * Updates highlight overlay on hovered element
   * @param {MouseEvent} event - Mouse move event
   */
  handleMouseMove(event) {
    if (!this.isActive) return;

    // Get element under cursor
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (!element || element === this.currentElement) return;

    this.currentElement = element;

    // Update fixed-position highlight overlay
    if (this.highlightOverlay) {
      updateHighlightOverlay(this.highlightOverlay, element, this.fullCapture);
    }

    // Update dimensions label
    if (this.dimensionLabel) {
      const rect = element.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Show full element size when full-capture; otherwise show clipped size
      let labelW, labelH;
      if (this.fullCapture) {
        labelW = Math.round(rect.width);
        labelH = Math.round(rect.height);
      } else {
        labelW = Math.round(Math.max(0, Math.min(rect.right, vw) - Math.max(rect.left, 0)));
        labelH = Math.round(Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0)));
      }

      this.dimensionLabel.textContent = `${labelW} × ${labelH}`;
      this.dimensionLabel.style.display = 'block';

      // Measure label after making it visible
      const lw = this.dimensionLabel.offsetWidth;
      const lh = this.dimensionLabel.offsetHeight;

      const visRight = Math.min(rect.right, vw);
      const visBottom = Math.min(rect.bottom, vh);
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;

      // Horizontal: align to right edge of visible area, clamp so label stays on-screen
      let labelX = visRight + scrollX - lw;
      labelX = Math.max(scrollX + 4, labelX);                      // don't go left of viewport
      labelX = Math.min(scrollX + vw - lw - 4, labelX);           // don't go right of viewport

      // Vertical: show below the bottom edge; if that clips off-screen, flip above instead
      let labelY = visBottom + scrollY + 4;
      if (visBottom + lh + 8 > vh) {                               // would overflow bottom
        labelY = visBottom + scrollY - lh - 4;                     // flip above
      }

      this.dimensionLabel.style.left = `${labelX}px`;
      this.dimensionLabel.style.top = `${labelY}px`;
    }
  }

  /**
   * Handle keydown event
   * Cancels selection when Escape is pressed
   * @param {KeyboardEvent} event - Keydown event
   */
  handleKeyDown(event) {
    if (!this.isActive) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      this.stop();

      // Notify popup so it resets its UI back to idle
      chrome.runtime.sendMessage({ action: 'selectionCancelled' });
    }
  }

  /**
   * Handle click event
   * Captures clicked element and initiates screenshot
   * @param {MouseEvent} event - Click event
   */
  async handleClick(event) {
    if (!this.isActive) return;

    // Prevent default action and propagation
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const element = event.target;

    // Stop selection mode
    this.stop();

    // Load settings
    const settings = await chrome.storage.local.get(['fullCapture', 'debugMode', 'delay']);
    const fullCapture = settings.fullCapture || false;
    const debugMode = settings.debugMode || false;
    const delay = settings.delay || 0;

    // Show countdown if delay is enabled
    if (delay > 0) {
      injectCountdownStyles();
      await showCountdownOverlay(delay);
    }

    // Only scroll into view if full capture mode is enabled
    // For regular capture, we want exactly what the user sees
    if (fullCapture) {
      await scrollIntoView(element);
    }

    // Get element position data
    const rawRect = getElementRect(element);
    const scroll = getScrollOffsets();
    const docDims = getDocumentDimensions();
    const dpr = window.devicePixelRatio || 1;

    // Check for cross-origin iframe
    const isCrossOrigin = isCrossOriginIframe(element);

    // When NOT in full-capture mode, clamp the rect to what's actually visible
    // in the viewport so we capture only what the user can see.
    let rect = rawRect;
    if (!fullCapture) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const visLeft = Math.max(0, rawRect.x);
      const visTop = Math.max(0, rawRect.y);
      const visRight = Math.min(vw, rawRect.x + rawRect.width);
      const visBottom = Math.min(vh, rawRect.y + rawRect.height);
      rect = {
        x: visLeft,
        y: visTop,
        width: Math.max(0, visRight - visLeft),
        height: Math.max(0, visBottom - visTop)
      };
    }

    // Prepare capture data
    const captureData = {
      rect: rect,
      scroll: scroll,
      documentDimensions: docDims,
      devicePixelRatio: dpr,
      isCrossOriginIframe: isCrossOrigin,
      debugMode: debugMode,
      elementInfo: {
        tagName: element.tagName,
        id: element.id || null,
        className: element.className || null,
        textContent: element.textContent?.substring(0, 50) || null
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timestamp: Date.now()
    };

    try {
      // Notify popup that capture started
      chrome.runtime.sendMessage({ action: 'captureStarted' });

      // Request screenshot from service worker
      const response = await chrome.runtime.sendMessage({
        action: 'captureElement',
        data: captureData
      });

      if (response.success) {
        if (response.action === 'download') {
          showNotification('Screenshot saved to downloads', 'success');
        }
        if (response.previewDataUrl && window.elementSnapperPreview) {
          window.elementSnapperPreview.show(response.previewDataUrl, { source: 'element' });
        }
        chrome.runtime.sendMessage({ action: 'captureSuccess' });
      } else {
        chrome.runtime.sendMessage({
          action: 'captureError',
          error: response.error
        });
      }
    } catch (error) {
      console.error('Capture failed:', error);
      chrome.runtime.sendMessage({
        action: 'captureError',
        error: error.message
      });
    }
  }

  /**
   * Check if selection mode is active
   * @returns {boolean} True if active
   */
  isSelecting() {
    return this.isActive;
  }
}

// Create singleton instance
const elementSelector = new ElementSelector();
