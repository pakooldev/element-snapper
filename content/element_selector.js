/**
 * Element selector module
 * Handles element hover highlighting and click capture
 */

class ElementSelector {
  constructor() {
    this.isActive = false;
    this.currentElement = null;      // highlighted: the hovered element or one of its ancestors
    this.hoveredElement = null;      // under the pointer
    this.trail = [];                 // children stepped up from with ArrowUp, for ArrowDown
    this.highlightOverlay = null;
    this.fullCapture = false;        // cached setting, updated on start()
    this.isPromptMode = false;       // cached setting, updated on start()
    this.outputMode = 'copyImage';   // cached setting, updated on start()
    this.pressed = false;
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundPress = this.handlePress.bind(this);
    this.boundRelease = this.handleRelease.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Start selection mode
   * Enables hover highlighting and click capture
   */
  start() {
    if (this.isActive) return;

    this.isActive = true;

    // Cache settings that affect hover appearance — ready well before first
    // user hover
    chrome.storage.local.get(['fullCapture', 'outputMode', 'copyToClipboard']).then(settings => {
      this.fullCapture = settings.fullCapture || false;
      // Same migration fallback as panel.js — outputMode wins once set.
      this.outputMode = settings.outputMode ||
        (settings.copyToClipboard === false ? 'download' : 'copyImage');
      this.isPromptMode = this.outputMode === 'copyPrompt';
    });

    injectHighlightStyles();

    // Add event listeners using capture phase. Selection runs on pointerup
    // because disabled controls never get mousedown, mouseup or click. Presses
    // are stopped on window, before the page's own listeners can see them.
    this.pressed = false;
    document.addEventListener('mousemove', this.boundMouseMove, true);
    window.addEventListener('pointerdown', this.boundPress, true);
    window.addEventListener('mousedown', this.boundPress, true);
    window.addEventListener('pointerup', this.boundRelease, true);
    document.addEventListener('keydown', this.boundKeyDown, true);

    // Create fixed-position highlight overlay
    this.highlightOverlay = createHighlightOverlay();

    // Create dimension label
    this.dimensionLabel = document.createElement('div');
    this.dimensionLabel.id = 'element-screenshot-dimensions';
    this.dimensionLabel.style.display = 'none';
    document.body.appendChild(this.dimensionLabel);
    raiseToTopLayer(this.dimensionLabel);

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
    window.removeEventListener('pointerdown', this.boundPress, true);
    window.removeEventListener('mousedown', this.boundPress, true);
    window.removeEventListener('pointerup', this.boundRelease, true);
    document.removeEventListener('keydown', this.boundKeyDown, true);

    // Remove highlight overlay
    if (this.highlightOverlay) {
      this.highlightOverlay.remove();
      this.highlightOverlay = null;
    }

    // Clear current element reference
    this.currentElement = null;
    this.hoveredElement = null;
    this.trail = [];

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
    const element = deepElementFromPoint(event.clientX, event.clientY);
    if (!element || element === this.hoveredElement) return;

    this.hoveredElement = element;
    this.trail = [];
    this.highlight(element);
  }

  /**
   * Highlights an element and shows the size its image will have.
   * @param {Element} element
   */
  highlight(element) {
    this.currentElement = element;

    // Update fixed-position highlight overlay
    if (this.highlightOverlay) {
      updateHighlightOverlay(this.highlightOverlay, element, this.fullCapture, this.isPromptMode, this.outputMode);
    }

    // Update dimensions label
    if (this.dimensionLabel) {
      const rect = element.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Show the size the image will have. Prompt mode always describes the
      // whole element, since nothing is screenshotted.
      const visible = getVisibleRect(element);
      const size = this.isPromptMode ? rect : this.fullCapture ? getCaptureSize(element) : visible;
      const labelW = Math.round(size.width);
      const labelH = Math.round(size.height);

      // A parent that its child fills can't be hovered, hence the arrow keys.
      const name = this.trail.length ? `${element.tagName.toLowerCase()} · ` : '';
      const keys = this.trail.length ? '↑↓' : '↑ parent';
      this.dimensionLabel.textContent = `${name}${labelW} × ${labelH} · ${keys}`;
      this.dimensionLabel.style.display = 'block';

      // Measure label after making it visible
      const lw = this.dimensionLabel.offsetWidth;
      const lh = this.dimensionLabel.offsetHeight;

      const visRight = visible.x + visible.width;
      const visBottom = visible.y + visible.height;
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
      return;
    }

    // ArrowUp highlights the parent, ArrowDown goes back to the child it came from.
    if (!this.currentElement || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    blockEvent(event); // Keep the page from scrolling
    if (event.key === 'ArrowUp') {
      const parent = composedParent(this.currentElement);
      if (!parent || parent === document.documentElement || parent === document.body) return;
      this.trail.push(this.currentElement);
      this.highlight(parent);
    } else if (this.trail.length) {
      this.highlight(this.trail.pop());
    }
  }

  /**
   * Keep a press from the page: no focus, no opened <select>, no page handlers.
   * @param {PointerEvent|MouseEvent} event
   */
  handlePress(event) {
    if (!this.isActive || event.button !== 0) return;
    this.pressed = true;
    blockEvent(event);
  }

  /**
   * Handle the end of a press
   * Captures the element under the pointer and initiates screenshot
   * @param {PointerEvent} event - Pointer up event
   */
  async handleRelease(event) {
    // Only a press made during selection counts, not one already in progress when it began.
    if (!this.isActive || event.button !== 0 || !this.pressed) return;

    blockEvent(event);
    swallowEndOfPress();

    // The highlighted element, which arrow keys may have moved up from the one under the pointer.
    const under = deepElementFromPoint(event.clientX, event.clientY);
    const element = under && under === this.hoveredElement ? this.currentElement : under;
    if (!element) return;

    // Stop selection mode
    this.stop();

    // Load settings
    const settings = await chrome.storage.local.get(['fullCapture', 'debugMode', 'delay', 'outputMode']);

    if (settings.outputMode === 'copyPrompt') {
      await this.handlePromptCapture(element);
      return;
    }

    const fullCapture = settings.fullCapture || false;
    const debugMode = settings.debugMode || false;
    const delay = settings.delay || 0;

    // Show countdown if delay is enabled
    if (delay > 0) {
      injectCountdownStyles();
      await showCountdownOverlay(delay);
    }

    // Scroll Element on: the service worker stitches the whole element, wherever it scrolls.
    // Off: exactly what the user sees of it.
    captureTarget = element;
    const rect = fullCapture ? null : getVisibleRect(element);

    // Get element position data
    const scroll = getScrollOffsets();
    const docDims = getDocumentDimensions();
    const dpr = window.devicePixelRatio || 1;

    // Check for cross-origin iframe
    const isCrossOrigin = isCrossOriginIframe(element);

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
      console.error('Capture failed:', error);
      chrome.runtime.sendMessage({
        action: 'captureError',
        error: error.message
      });
    }
  }

  /**
   * "Copy as Prompt" output mode: extract the clicked element's context as
   * plain text and write it to the clipboard. No screenshot, no delay, no
   * download/history — pure DOM read, entirely local to this content script.
   * @param {HTMLElement} element - Selected element
   */
  async handlePromptCapture(element) {
    try {
      chrome.runtime.sendMessage({ action: 'captureStarted' });

      const text = buildElementPromptText(element);
      await navigator.clipboard.writeText(text);

      chrome.runtime.sendMessage({
        action: 'captureSuccess',
        message: 'Copied element context to clipboard'
      });
    } catch (error) {
      console.error('Copy as Prompt failed:', error);
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
