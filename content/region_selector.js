/**
 * Region selector module
 * Handles click-and-drag region selection for area capture
 */

// mousedown, mousemove and mouseup have their own handlers.
const REGION_BLOCKED_EVENTS = ['pointerdown', 'pointermove', 'pointerup', 'click', 'dblclick', 'mouseover', 'mouseout', 'contextmenu'];

class RegionSelector {
  constructor() {
    this.isActive = false;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.layer = null;
    this.overlay = null;
    this.selection = null;
    this.dimensionLabel = null;
    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundBlock = this.handleBlockedEvent.bind(this);
  }

  /**
   * Start region selection mode
   * Shows overlay and enables click-and-drag
   */
  start() {
    if (this.isActive) return;

    this.isActive = true;
    this.isDragging = false;

    injectRegionSelectorStyles();

    // Takes the pointer so the page never sees it. Not the overlay below,
    // whose clip-path would let the page get events inside the selection.
    this.layer = document.createElement('div');
    this.layer.id = 'region-selector-layer';
    document.body.appendChild(this.layer);

    // Create full-screen overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'region-selector-overlay';
    document.body.appendChild(this.overlay);

    // Create selection rectangle (hidden until drag starts)
    this.selection = document.createElement('div');
    this.selection.id = 'region-selector-selection';
    this.selection.style.display = 'none';
    document.body.appendChild(this.selection);

    // Create dimension label
    this.dimensionLabel = document.createElement('div');
    this.dimensionLabel.id = 'region-selector-dimensions';
    this.dimensionLabel.style.display = 'none';
    document.body.appendChild(this.dimensionLabel);

    // Create instruction hint
    this.hint = document.createElement('div');
    this.hint.id = 'region-selector-hint';
    this.hint.textContent = 'Click and drag to select area · Esc to cancel';
    document.body.appendChild(this.hint);

    // Add listeners on window's capture phase, ahead of the page's own
    window.addEventListener('mousedown', this.boundMouseDown, true);
    window.addEventListener('mousemove', this.boundMouseMove, true);
    window.addEventListener('mouseup', this.boundMouseUp, true);
    REGION_BLOCKED_EVENTS.forEach((name) => window.addEventListener(name, this.boundBlock, true));
    document.addEventListener('keydown', this.boundKeyDown, true);

    // Set cursor
    document.body.style.cursor = 'crosshair';
  }

  /**
   * Stop region selection mode
   * Cleans up all DOM elements and listeners
   */
  stop() {
    if (!this.isActive) return;

    this.isActive = false;
    this.isDragging = false;

    // Remove listeners
    window.removeEventListener('mousedown', this.boundMouseDown, true);
    window.removeEventListener('mousemove', this.boundMouseMove, true);
    window.removeEventListener('mouseup', this.boundMouseUp, true);
    REGION_BLOCKED_EVENTS.forEach((name) => window.removeEventListener(name, this.boundBlock, true));
    document.removeEventListener('keydown', this.boundKeyDown, true);

    // Remove DOM elements
    if (this.layer) { this.layer.remove(); this.layer = null; }
    if (this.overlay) { this.overlay.remove(); this.overlay = null; }
    if (this.selection) { this.selection.remove(); this.selection = null; }
    if (this.dimensionLabel) { this.dimensionLabel.remove(); this.dimensionLabel = null; }
    if (this.hint) { this.hint.remove(); this.hint = null; }

    // Restore cursor
    document.body.style.cursor = '';
  }

  /**
   * Handle mouse down — start drag
   * @param {MouseEvent} event
   */
  handleMouseDown(event) {
    if (!this.isActive) return;

    blockEvent(event);

    this.isDragging = true;
    this.startX = event.clientX;
    this.startY = event.clientY;

    // Hide hint
    if (this.hint) this.hint.style.display = 'none';

    // Show selection at zero size
    if (this.selection) {
      this.selection.style.display = 'block';
      this.selection.style.left = this.startX + 'px';
      this.selection.style.top = this.startY + 'px';
      this.selection.style.width = '0px';
      this.selection.style.height = '0px';
    }
  }

  /**
   * Handle mouse move — resize selection rectangle
   * @param {MouseEvent} event
   */
  handleMouseMove(event) {
    if (!this.isActive) return;

    blockEvent(event);
    if (!this.isDragging) return;

    const currentX = event.clientX;
    const currentY = event.clientY;

    // Calculate rectangle (support dragging in any direction)
    const left = Math.min(this.startX, currentX);
    const top = Math.min(this.startY, currentY);
    const width = Math.abs(currentX - this.startX);
    const height = Math.abs(currentY - this.startY);

    // Update selection rectangle
    if (this.selection) {
      this.selection.style.left = left + 'px';
      this.selection.style.top = top + 'px';
      this.selection.style.width = width + 'px';
      this.selection.style.height = height + 'px';
    }

    // Update overlay clip-path to create the "cut-out" effect
    if (this.overlay) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // polygon that covers the viewport minus the selection rectangle
      this.overlay.style.clipPath = `polygon(
        0% 0%, 0% 100%, ${left}px 100%, ${left}px ${top}px,
        ${left + width}px ${top}px, ${left + width}px ${top + height}px,
        ${left}px ${top + height}px, ${left}px 100%, 100% 100%, 100% 0%
      )`;
    }

    // Update dimension label
    if (this.dimensionLabel && width > 0 && height > 0) {
      this.dimensionLabel.style.display = 'block';
      this.dimensionLabel.textContent = `${width} × ${height}`;

      // Position below the selection, right-aligned
      const labelX = Math.min(left + width, window.innerWidth - 80);
      let labelY = top + height + 6;
      if (labelY + 24 > window.innerHeight) {
        labelY = top - 28; // Flip above if at viewport bottom
      }
      this.dimensionLabel.style.left = labelX + 'px';
      this.dimensionLabel.style.top = labelY + 'px';
    }
  }

  /**
   * Handle mouse up — finalize selection and capture
   * @param {MouseEvent} event
   */
  async handleMouseUp(event) {
    if (!this.isActive || !this.isDragging) return;

    blockEvent(event);
    swallowEndOfPress();

    this.isDragging = false;

    const currentX = event.clientX;
    const currentY = event.clientY;

    // Calculate final rectangle
    const left = Math.min(this.startX, currentX);
    const top = Math.min(this.startY, currentY);
    const width = Math.abs(currentX - this.startX);
    const height = Math.abs(currentY - this.startY);

    // Stop selection mode (clean up UI), but leave the layer in place so that
    // whatever was under the pointer doesn't turn hovered in the image.
    const layer = this.layer;
    this.layer = null;
    this.stop();

    // Ignore tiny selections (accidental clicks)
    if (width < 5 || height < 5) {
      layer.remove();
      showNotification('Selection too small — drag a larger area', 'error');
      return;
    }

    // A delay exists so the user can open a hover state during the countdown.
    const { delay } = await chrome.storage.local.get(['delay']);
    if (delay > 0) layer.remove();

    try {
      // Delegate capture to content-main.js (same pattern as viewport/fullpage)
      await handleRegionCaptureRequest(left, top, width, height);
    } finally {
      layer.remove();
    }
  }

  /**
   * Keep every other pointer event from the page while selecting.
   * @param {Event} event
   */
  handleBlockedEvent(event) {
    if (!this.isActive) return;
    event.stopImmediatePropagation();
    // Cancelling a pointer event would also cancel the mouse events the drag runs on.
    if (!event.type.startsWith('pointer')) event.preventDefault();
  }

  /**
   * Handle keydown — cancel on Escape
   * @param {KeyboardEvent} event
   */
  handleKeyDown(event) {
    if (!this.isActive) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      this.stop();

      // Notify popup to reset UI
      chrome.runtime.sendMessage({ action: 'selectionCancelled' });
    }
  }

  /**
   * Check if region selection is active
   * @returns {boolean}
   */
  isSelecting() {
    return this.isActive;
  }
}

// Create singleton instance
const regionSelector = new RegionSelector();
