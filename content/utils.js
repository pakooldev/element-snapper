/**
 * Utility functions for element screenshot capture
 */

/**
 * Get viewport-relative bounding rect for an element
 * @param {HTMLElement} element - Target element
 * @returns {object} Bounding rect with x, y, width, height
 */
function getElementRect(element) {
  const rect = element.getBoundingClientRect();

  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height
  };
}

/**
 * Get page scroll offsets
 * @returns {object} Scroll offsets with x and y
 */
function getScrollOffsets() {
  return {
    x: window.scrollX || window.pageXOffset || document.documentElement.scrollLeft,
    y: window.scrollY || window.pageYOffset || document.documentElement.scrollTop
  };
}

/**
 * Get document dimensions
 * @returns {object} Document dimensions with width and height
 */
function getDocumentDimensions() {
  return {
    width: Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth
    ),
    height: Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    )
  };
}

/**
 * Generate a CSS selector for an element: id, else tag+first-class if that
 * uniquely matches, else a full :nth-child() path (never ambiguous).
 * @param {HTMLElement} element - Target element
 * @returns {string} CSS selector
 */
function generateElementSelector(element) {
  if (element.id) return `#${CSS.escape(element.id)}`;

  const tag = element.tagName.toLowerCase();
  if (element.classList.length) {
    const simple = `${tag}.${CSS.escape(element.classList[0])}`;
    try {
      if (document.querySelectorAll(simple).length === 1) return simple;
    } catch (e) {
      // Invalid/unsupported selector syntax — fall through to nth-child path.
    }
  }

  const parts = [];
  let node = element;
  while (node && node !== document.documentElement) {
    let part = node.tagName.toLowerCase();
    const parent = node.parentElement;
    if (parent) {
      const index = Array.from(parent.children).indexOf(node) + 1;
      part += `:nth-child(${index})`;
    }
    parts.unshift(part);
    node = parent;
  }
  return parts.join(' > ');
}

/**
 * Tag-only ancestor chain, closest to farthest, not including the element
 * itself or <html>. e.g. "div > div > section > body"
 * @param {HTMLElement} element - Target element
 * @returns {string}
 */
function buildAncestorPath(element) {
  const tags = [];
  let node = element.parentElement;
  while (node && node !== document.documentElement) {
    tags.push(node.tagName.toLowerCase());
    node = node.parentElement;
  }
  return tags.join(' > ');
}

/**
 * Root-to-element DOM path with each node's first class, including the
 * element itself but not <html>. e.g. "body > section.foo > h1.bar"
 * @param {HTMLElement} element - Target element
 * @returns {string}
 */
function buildFullDomPath(element) {
  const parts = [];
  let node = element;
  while (node && node !== document.documentElement) {
    let part = node.tagName.toLowerCase();
    if (node.classList && node.classList.length) {
      part += `.${CSS.escape(node.classList[0])}`;
    }
    parts.unshift(part);
    node = node.parentElement;
  }
  return parts.join(' > ');
}

// Curated allowlist for the "Copy as Prompt" computed-styles section — the
// handful most useful for "what does this look like" at a glance, not the
// hundreds of properties getComputedStyle() actually exposes.
const PROMPT_STYLE_ALLOWLIST = ['display', 'font-size', 'color', 'background-color'];
const PROMPT_HTML_CAP = 1500;

/**
 * Build the Cursor-style "attached browser context" text block for an
 * element, for the "Copy as Prompt" output mode.
 * @param {HTMLElement} element - Selected element
 * @returns {string} Plain-text context block
 */
function buildElementPromptText(element) {
  const rect = element.getBoundingClientRect();
  const computed = getComputedStyle(element);
  const tag = element.tagName.toLowerCase();

  const styleLines = PROMPT_STYLE_ALLOWLIST
    .map(prop => `  ${prop}: ${computed.getPropertyValue(prop)}`)
    .join('\n');

  const text = (element.textContent || '').trim().replace(/\s+/g, ' ');

  let html = element.outerHTML;
  if (html.length > PROMPT_HTML_CAP) html = html.slice(0, PROMPT_HTML_CAP) + '...';

  return [
    `Attached browser context from ${window.location.href}`,
    '',
    'Selected element:',
    tag,
    `Role: ${element.getAttribute('role') || tag}`,
    `Selector: ${generateElementSelector(element)}`,
    `Dimensions: ${Math.round(rect.width)}x${Math.round(rect.height)}`,
    '',
    'Text content:',
    text,
    '',
    'Computed styles:',
    styleLines,
    '',
    'HTML:',
    html,
    '',
    `Ancestor path: ${buildAncestorPath(element)}`,
    `Full DOM path: ${buildFullDomPath(element)}`,
  ].join('\n');
}

/**
 * Scroll element into view smoothly
 * @param {HTMLElement} element - Element to scroll into view
 * @returns {Promise<void>} Resolves when scroll is complete
 */
function scrollIntoView(element) {
  return new Promise((resolve) => {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    });

    // Wait for scroll to complete
    setTimeout(resolve, 400);
  });
}

/**
 * Check if element is a cross-origin iframe
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if cross-origin iframe
 */
function isCrossOriginIframe(element) {
  if (element.tagName !== 'IFRAME') return false;

  try {
    // Try to access iframe's contentDocument
    // Will throw if cross-origin
    const doc = element.contentDocument;
    return false;
  } catch (e) {
    return true;
  }
}

/**
 * Inject professional highlight styles
 * Clean, minimal design with blue outline
 */
function injectHighlightStyles() {
  if (document.getElementById('element-screenshot-styles')) return;

  const style = document.createElement('style');
  style.id = 'element-screenshot-styles';
  style.textContent = `
    /* Hover highlight - professional dashed blue outline */
    .element-screenshot-highlight {
      outline: 2px dashed #3b82f6 !important;
      outline-offset: -2px !important;
      cursor: crosshair !important;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), inset 0 0 20px rgba(59, 130, 246, 0.1) !important;
      border-radius: 2px !important;
      transition: all 0.1s ease !important;
    }

    /* Dimension label positioned at bottom right */
    #element-screenshot-dimensions {
      position: absolute;
      background: #3b82f6;
      color: white;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 12px;
      font-weight: 500;
      padding: 2px 6px;
      border-radius: 4px;
      pointer-events: none;
      z-index: 2147483647;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      white-space: nowrap;
    }

    /* Minimal capture overlay - dark glass effect */
    .element-screenshot-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(4px);
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      transition: opacity 0.3s ease;
    }

    /* Modern spinner */
    .element-screenshot-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: element-screenshot-spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      margin-bottom: 16px;
    }

    .element-screenshot-text {
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.02em;
        opacity: 0.9;
    }

    @keyframes element-screenshot-spin {
      to { transform: rotate(360deg); }
    }

    /* ── Fixed-position highlight overlay ── */
    #element-screenshot-highlight-overlay {
      position: fixed;
      pointer-events: none;
      z-index: 2147483646;
      box-sizing: border-box;
      border-radius: 2px;
      overflow: visible;
    }

    /* Output mode "Download": dashed green, distinct from Copy Image so the
       border alone tells you what a click will do */
    #element-screenshot-highlight-overlay.mode-download {
      border: 2px dashed #10b981;
      background: rgba(16, 185, 129, 0.07);
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15);
    }

    /* Output mode "Copy Image": dashed blue */
    #element-screenshot-highlight-overlay.mode-image {
      border: 2px dashed #3b82f6;
      background: rgba(59, 130, 246, 0.07);
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
    }

    /* Full capture: element extends beyond viewport — dashed indigo,
       regardless of Download/Copy Image. This signals "will trigger
       multi-tile stitching", a different axis from output mode, so it
       always overrides the mode color rather than being tinted per-mode. */
    #element-screenshot-highlight-overlay.mode-full-extends {
      border: 2px dashed #818cf8;
      background: rgba(129, 140, 248, 0.07);
      box-shadow: 0 0 0 4px rgba(129, 140, 248, 0.15);
    }

    /* Copy as Prompt: no screenshot taken — dashed purple, distinct from
       every image-capture mode so it's clear this click won't produce one */
    #element-screenshot-highlight-overlay.mode-prompt {
      border: 2px dashed #a855f7;
      background: rgba(168, 85, 247, 0.07);
      box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.15);
    }
    #element-screenshot-highlight-overlay.mode-prompt #element-screenshot-extend-badge {
      background: #a855f7;
    }

    /* Badge shown at the clipped edge for extended full-capture elements */
    #element-screenshot-extend-badge {
      position: absolute;
      bottom: -1px;
      left: 50%;
      transform: translateX(-50%) translateY(100%);
      background: #818cf8;
      color: white;
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
    }
  `;

  document.head.appendChild(style);
}

/**
 * Remove highlight styles
 */
function removeHighlightStyles() {
  const style = document.getElementById('element-screenshot-styles');
  if (style) style.remove();
}

/**
 * Create the fixed-position highlight overlay element (and its badge child).
 * @returns {HTMLElement} The overlay div
 */
function createHighlightOverlay() {
  const existing = document.getElementById('element-screenshot-highlight-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'element-screenshot-highlight-overlay';

  const badge = document.createElement('div');
  badge.id = 'element-screenshot-extend-badge';
  overlay.appendChild(badge);

  document.body.appendChild(overlay);
  return overlay;
}

/**
 * Position and style the highlight overlay based on the hovered element and capture mode.
 * @param {HTMLElement} overlay - The overlay element returned by createHighlightOverlay
 * @param {HTMLElement} element - The hovered DOM element
 * @param {boolean} fullCapture - Whether "Scroll Element" (full capture) is enabled
 * @param {boolean} [isPromptMode] - Whether output mode is "Copy as Prompt" (no screenshot taken)
 * @param {string} [outputMode] - 'download' | 'copyImage' | 'copyPrompt' — picks the border color
 */
function updateHighlightOverlay(overlay, element, fullCapture, isPromptMode, outputMode) {
  const rect = element.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Visible intersection of element with viewport
  const visLeft = Math.max(0, rect.left);
  const visTop = Math.max(0, rect.top);
  const visRight = Math.min(vw, rect.right);
  const visBottom = Math.min(vh, rect.bottom);
  const visW = visRight - visLeft;
  const visH = visBottom - visTop;

  if (visW <= 0 || visH <= 0) {
    overlay.style.display = 'none';
    return;
  }

  overlay.style.display = 'block';
  overlay.style.left = visLeft + 'px';
  overlay.style.top = visTop + 'px';
  overlay.style.width = visW + 'px';
  overlay.style.height = visH + 'px';

  const extendsBeyond = rect.right > vw || rect.bottom > vh ||
    rect.left < 0 || rect.top < 0;

  const badge = overlay.querySelector('#element-screenshot-extend-badge');

  if (isPromptMode) {
    // Full-capture concept (scroll/stitch) is meaningless when nothing is
    // screenshotted — always show the same distinct "text copy" treatment.
    overlay.className = 'mode-prompt';
    if (badge) {
      badge.textContent = 'Copy as Prompt';
      badge.style.bottom = '-1px';
      badge.style.top = 'auto';
      badge.style.transform = 'translateX(-50%) translateY(100%)';
      badge.style.display = 'block';

      const badgeH = badge.offsetHeight;
      if (visBottom + badgeH + 4 > vh) {
        badge.style.bottom = '4px';
        badge.style.transform = 'translateX(-50%)';
      }
    }
  } else if (fullCapture && extendsBeyond) {
    // Extends beyond the viewport — always indigo regardless of output
    // mode; this signals "will trigger multi-tile stitching", a different
    // axis from what happens to the result.
    overlay.className = 'mode-full-extends';
    if (badge) {
      const arrows = [];
      if (rect.top < 0 || rect.bottom > vh) arrows.push('↕');
      if (rect.left < 0 || rect.right > vw) arrows.push('↔');
      badge.textContent = arrows.join(' ') + ' Full Element';
      badge.style.display = 'block';

      // Reset to default below-overlay position
      badge.style.bottom = '-1px';
      badge.style.top = 'auto';
      badge.style.transform = 'translateX(-50%) translateY(100%)';
      badge.style.display = 'block';

      // If badge would overflow the viewport bottom, flip it inside the overlay
      const badgeH = badge.offsetHeight;
      if (visBottom + badgeH + 4 > vh) {
        badge.style.bottom = '4px';
        badge.style.transform = 'translateX(-50%)';
      }
    }
  } else {
    overlay.className = outputMode === 'download' ? 'mode-download' : 'mode-image';
    if (badge) badge.style.display = 'none';
  }
}

/**
 * Show minimal capture overlay with spinner
 * @returns {HTMLElement} Overlay element
 */
function showCaptureOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'element-screenshot-overlay';

  const spinner = document.createElement('div');
  spinner.className = 'element-screenshot-spinner';

  const text = document.createElement('div');
  text.className = 'element-screenshot-text';
  text.textContent = 'Processing Capture...';

  overlay.appendChild(spinner);
  overlay.appendChild(text);
  document.body.appendChild(overlay);

  return overlay;
}

/**
 * Remove capture overlay
 * @param {HTMLElement} overlay - Overlay element to remove
 */
function removeCaptureOverlay(overlay) {
  if (overlay && overlay.parentNode) {
    overlay.remove();
  }
}

/**
 * Hide scrollbars temporarily (for clean multi-capture screenshots).
 * Hides the visual scrollbar chrome only — must NOT touch `overflow`
 * (setting it to 'hidden' doesn't just hide the scrollbar, it disables
 * scrolling itself on some pages, which breaks the very scrolling the
 * multi-tile capture caller needs to do next).
 * @returns {object} Object with restore function
 */
function hideScrollbars() {
  const style = document.createElement('style');
  style.textContent = `
    html, body { scrollbar-width: none !important; -ms-overflow-style: none !important; }
    html::-webkit-scrollbar, body::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
  `;
  document.head.appendChild(style);

  return {
    restore: () => style.remove()
  };
}

/**
 * Show scrollbars (restore after hiding)
 * @param {object} scrollbarState - State object returned from hideScrollbars
 */
function showScrollbars(scrollbarState) {
  if (scrollbarState && scrollbarState.restore) {
    scrollbarState.restore();
  }
}

// IDs of this extension's own on-page overlays (light-DOM, position: fixed) —
// never hide these as part of hiding the page's own fixed/sticky elements.
const OWN_FIXED_ELEMENT_ID_PREFIXES = ['element-screenshot-', 'region-selector-'];

/**
 * Hide the page's own fixed/sticky-positioned elements temporarily (for
 * multi-tile capture, after the first tile). A fixed element (floating ad,
 * sticky header, cookie banner) stays pinned to the viewport across every
 * tile — captured once in the first tile, it must be hidden for the rest or
 * it ends up duplicated at the same spot in every tile of the stitched image.
 * Uses visibility (not display) so layout/scroll position is undisturbed.
 * @returns {object} Object with restore function
 */
function hideFixedElements() {
  const changed = [];
  const all = document.body ? document.body.querySelectorAll('*') : [];

  for (const el of all) {
    if (el.id && OWN_FIXED_ELEMENT_ID_PREFIXES.some((p) => el.id.startsWith(p))) continue;

    const position = getComputedStyle(el).position;
    if (position === 'fixed' || position === 'sticky') {
      changed.push({ el, prevVisibility: el.style.visibility });
      el.style.setProperty('visibility', 'hidden', 'important');
    }
  }

  return {
    restore: () => {
      for (const { el, prevVisibility } of changed) {
        if (prevVisibility) {
          el.style.setProperty('visibility', prevVisibility);
        } else {
          el.style.removeProperty('visibility');
        }
      }
    }
  };
}

/**
 * Show fixed/sticky elements again (restore after hiding)
 * @param {object} fixedElementsState - State object returned from hideFixedElements
 */
function showFixedElements(fixedElementsState) {
  if (fixedElementsState && fixedElementsState.restore) {
    fixedElementsState.restore();
  }
}

/**
 * Show debug border overlay for tile capture
 * @param {number} x - X position in viewport (CSS pixels)
 * @param {number} y - Y position in viewport (CSS pixels)
 * @param {number} width - Width (CSS pixels)
 * @param {number} height - Height (CSS pixels)
 * @returns {HTMLElement} Debug border element
 */
function showDebugBorder(x, y, width, height) {
  // Remove any existing debug border
  const existing = document.getElementById('element-screenshot-debug-border');
  if (existing) existing.remove();

  const border = document.createElement('div');
  border.id = 'element-screenshot-debug-border';
  border.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    width: ${width}px;
    height: ${height}px;
    border: 3px solid red;
    box-shadow: 0 0 0 1px rgba(255, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 0, 0, 0.3);
    pointer-events: none;
    z-index: 2147483646;
    background: rgba(255, 0, 0, 0.05);
  `;

  document.body.appendChild(border);
  return border;
}

/**
 * Remove debug border overlay
 */
function hideDebugBorder() {
  const border = document.getElementById('element-screenshot-debug-border');
  if (border) border.remove();
}

/**
 * Show countdown overlay before capture
 * @param {number} seconds - Number of seconds to count down
 * @returns {Promise<void>} Resolves when countdown completes
 */
function showCountdownOverlay(seconds) {
  return new Promise((resolve) => {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'element-screenshot-countdown-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(12px);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3), 0 0 0 2px #3b82f6;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 28px;
      font-weight: 700;
      animation: element-screenshot-slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    overlay.textContent = seconds;

    document.body.appendChild(overlay);

    // Countdown logic
    let remaining = seconds;
    const interval = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        overlay.textContent = remaining;
      } else {
        clearInterval(interval);
        // Fade out
        overlay.style.animation = 'element-screenshot-fade-out 0.2s ease';
        setTimeout(() => {
          overlay.remove();
          resolve();
        }, 200);
      }
    }, 1000);
  });
}

/**
 * Add countdown animation styles if not already present
 */
function injectCountdownStyles() {
  if (document.getElementById('element-screenshot-countdown-styles')) return;

  const style = document.createElement('style');
  style.id = 'element-screenshot-countdown-styles';
  style.textContent = `
    @keyframes element-screenshot-fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes element-screenshot-slide-in {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes element-screenshot-fade-out {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    @keyframes element-screenshot-pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.1);
        opacity: 0.8;
      }
    }
  `;

  document.head.appendChild(style);
}

/**
 * Inject styles for the region selector (click-and-drag area capture)
 */
function injectRegionSelectorStyles() {
  if (document.getElementById('region-selector-styles')) return;

  const style = document.createElement('style');
  style.id = 'region-selector-styles';
  style.textContent = `
    /* Full-screen dark overlay with clip-path cut-out */
    #region-selector-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.5);
      z-index: 2147483645;
      pointer-events: none;
      transition: clip-path 0s;
    }

    /* Selection rectangle border */
    #region-selector-selection {
      position: fixed;
      border: 2px dashed #3b82f6;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
      border-radius: 2px;
      pointer-events: none;
      z-index: 2147483646;
      box-sizing: border-box;
    }

    /* Dimension label */
    #region-selector-dimensions {
      position: fixed;
      background: #3b82f6;
      color: white;
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
      font-size: 12px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 4px;
      pointer-events: none;
      z-index: 2147483647;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      white-space: nowrap;
    }

    /* Instruction hint */
    #region-selector-hint {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(8px);
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 500;
      padding: 12px 20px;
      border-radius: 10px;
      pointer-events: none;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: element-screenshot-fade-in 0.3s ease;
    }
  `;

  document.head.appendChild(style);
}

/**
 * Show toast notification
 * @param {string} message - Notification message
 * @param {string} type - 'success' or 'error'
 */
function showNotification(message, type = 'success') {
  // Remove existing notification
  const existing = document.getElementById('element-screenshot-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.id = 'element-screenshot-notification';

  // Icon based on type
  const icon = type === 'success'
    ? '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.6666 5L7.49992 14.1667L3.33325 10" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 6.66667V10M10 13.3333H10.0083M18.3333 10C18.3333 14.6024 14.6023 18.3333 10 18.3333C5.39762 18.3333 1.66666 14.6024 1.66666 10C1.66666 5.39763 5.39762 1.66667 10 1.66667C14.6023 1.66667 18.3333 5.39763 18.3333 10Z" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(-20px);
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: white;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 2147483647;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
  `;

  notification.innerHTML = `
    ${icon}
    <span>${message}</span>
  `;

  document.body.appendChild(notification);

  // Trigger animation
  requestAnimationFrame(() => {
    notification.style.transform = 'translateX(-50%) translateY(0)';
    notification.style.opacity = '1';
  });

  // Auto remove
  setTimeout(() => {
    notification.style.transform = 'translateX(-50%) translateY(-20px)';
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
