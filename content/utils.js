/**
 * Utility functions for element screenshot capture
 */

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
 * The deepest element at a point. document.elementFromPoint stops at a shadow
 * host, so this keeps going down through shadow roots.
 * @returns {Element|null}
 */
function deepElementFromPoint(x, y) {
  let element = document.elementFromPoint(x, y);
  while (element) {
    const root = shadowRootOf(element);
    const inner = root?.elementFromPoint(x, y);
    if (!inner || inner === element) break;
    element = inner;
  }
  return element;
}

/** An element's shadow root, closed ones included. */
function shadowRootOf(element) {
  // The API throws on anything but an HTML element, such as <svg>.
  if (!(element instanceof HTMLElement)) return element.shadowRoot || null;
  return element.shadowRoot || chrome.dom?.openOrClosedShadowRoot?.(element) || null;
}

function blockEvent(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}

/**
 * Selection can end on a release, but the browser still sends the rest of that
 * press (mouseup, click). Keep those from the page so it doesn't act on them.
 */
function swallowEndOfPress() {
  const events = ['mouseup', 'click', 'dblclick'];
  events.forEach((name) => window.addEventListener(name, blockEvent, true));
  setTimeout(() => events.forEach((name) => window.removeEventListener(name, blockEvent, true)), 400);
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
  const vh = window.innerHeight;

  // The part of the element that can be seen, past the viewport and any scrolling or clipping ancestor
  const visible = getVisibleRect(element);
  const visLeft = visible.x;
  const visTop = visible.y;
  const visW = visible.width;
  const visH = visible.height;
  const visBottom = visTop + visH;

  if (visW <= 0 || visH <= 0) {
    overlay.style.display = 'none';
    return;
  }

  overlay.style.display = 'block';
  overlay.style.left = visLeft + 'px';
  overlay.style.top = visTop + 'px';
  overlay.style.width = visW + 'px';
  overlay.style.height = visH + 'px';

  const fullSize = getCaptureSize(element);
  const extendsVertically = fullSize.height > visH + 1;
  const extendsHorizontally = fullSize.width > visW + 1;
  const extendsBeyond = extendsVertically || extendsHorizontally;

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
      if (extendsVertically) arrows.push('↕');
      if (extendsHorizontally) arrows.push('↔');
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

// ─── Stitched capture ───────────────────────────────────────────────────────
//
// A capture bigger than what's on screen is taken in tiles. The service worker
// asks for each tile, and this side scrolls whatever has to move, then measures
// which part of the target is really visible. Nothing is computed in advance,
// so it doesn't matter which elements scroll, or whether a scroll landed where
// it was asked to.

// IDs of this extension's own on-page UI, never touched while capturing.
const OWN_ELEMENT_ID_PREFIXES = ['element-screenshot-', 'region-selector-', '__element-snapper'];
const CAPTURE_STYLE_ID = 'element-screenshot-capture-styles';

// Without these, scrolling to a tile animates or snaps away from where it was
// asked to go. Scrollbars go too, without touching `overflow`, which would stop
// the element scrolling at all.
const CAPTURE_CSS = `
  * {
    scroll-behavior: auto !important;
    scroll-snap-type: none !important;
    scrollbar-width: none !important;
  }
  *::-webkit-scrollbar { display: none !important; }
`;

let captureTarget = null; // The selected element, set before an element capture is requested.
let captureSession = null;

function composedParent(node) {
  return node.assignedSlot || node.parentElement || node.getRootNode().host || null;
}

/** html and, when its overflow goes to the viewport, body: neither is a box of its own then. */
function isViewportScroller(element) {
  if (element === document.documentElement) return true;
  if (element !== document.body) return false;
  const html = getComputedStyle(document.documentElement);
  return html.overflowX === 'visible' && html.overflowY === 'visible';
}

function viewportBox() {
  const { clientWidth, clientHeight } = document.scrollingElement || document.documentElement;
  return { left: 0, top: 0, right: clientWidth, bottom: clientHeight };
}

function paddingBox(element) {
  const rect = element.getBoundingClientRect();
  const left = rect.left + element.clientLeft;
  const top = rect.top + element.clientTop;
  return { left, top, right: left + element.clientWidth, bottom: top + element.clientHeight };
}

/**
 * The ancestors that can cut an element off, nearest first, following what
 * positioning actually does: an absolute element ignores ancestors below its
 * containing block, and a fixed one ignores everything, including page scroll.
 */
function clippingChain(element) {
  const ancestors = [];
  let position = getComputedStyle(element).position;
  if (position === 'fixed') return { ancestors, scrollsWithWindow: false };

  let skipStatic = position === 'absolute';
  for (let node = composedParent(element); node && !isViewportScroller(node); node = composedParent(node)) {
    const style = getComputedStyle(node);
    if (skipStatic && style.position === 'static' && style.transform === 'none') continue;
    skipStatic = style.position === 'absolute';
    if (style.overflowX !== 'visible' || style.overflowY !== 'visible') ancestors.push(node);
    if (style.position === 'fixed') return { ancestors, scrollsWithWindow: false };
  }
  return { ancestors, scrollsWithWindow: true };
}

function clipToAncestors(box, ancestors) {
  let { left, top, right, bottom } = box;
  for (const ancestor of ancestors) {
    const style = getComputedStyle(ancestor);
    const edge = paddingBox(ancestor);
    if (style.overflowX !== 'visible') {
      left = Math.max(left, edge.left);
      right = Math.min(right, edge.right);
    }
    if (style.overflowY !== 'visible') {
      top = Math.max(top, edge.top);
      bottom = Math.min(bottom, edge.bottom);
    }
  }
  const viewport = viewportBox();
  left = Math.max(left, viewport.left);
  top = Math.max(top, viewport.top);
  right = Math.min(right, viewport.right);
  bottom = Math.min(bottom, viewport.bottom);
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

/** What of an element can be seen right now, in viewport coordinates. */
function getVisibleRect(element) {
  const rect = element.getBoundingClientRect();
  const { left, top, width, height } = clipToAncestors(rect, clippingChain(element).ancestors);
  return { x: left, y: top, width, height };
}

function canScroll(element, style = getComputedStyle(element)) {
  const scrollsOn = (overflow) => overflow === 'auto' || overflow === 'scroll' || overflow === 'hidden';
  return (scrollsOn(style.overflowY) && element.scrollHeight > element.clientHeight + 1) ||
    (scrollsOn(style.overflowX) && element.scrollWidth > element.clientWidth + 1);
}

/** An element that scrolls is captured as all of its content, not just the part showing. */
function capturesOwnContent(element) {
  return !isViewportScroller(element) && canScroll(element);
}

/** The size a stitched capture of this element will have, in CSS pixels. */
function getCaptureSize(element) {
  if (capturesOwnContent(element)) return { width: element.scrollWidth, height: element.scrollHeight };
  const { width, height } = element.getBoundingClientRect();
  return { width, height };
}

function forEachDeepElement(root, visit) {
  for (const element of root.querySelectorAll('*')) {
    if (element.id && OWN_ELEMENT_ID_PREFIXES.some((prefix) => element.id.startsWith(prefix))) continue;
    visit(element);
    const shadow = shadowRootOf(element);
    if (shadow) forEachDeepElement(shadow, visit);
  }
}

/** The biggest on-screen box that scrolls vertically: the main pane of an app-style page. */
function findMainPane() {
  const viewport = viewportBox();
  let best = null;
  let bestArea = 0;
  forEachDeepElement(document, (element) => {
    const style = getComputedStyle(element);
    if (style.overflowY !== 'auto' && style.overflowY !== 'scroll') return;
    if (element.scrollHeight <= element.clientHeight + 1 || isViewportScroller(element)) return;
    const rect = element.getBoundingClientRect();
    const width = Math.min(rect.right, viewport.right) - Math.max(rect.left, 0);
    const height = Math.min(rect.bottom, viewport.bottom) - Math.max(rect.top, 0);
    if (width > 0 && height > 0 && width * height > bestArea) {
      best = element;
      bestArea = width * height;
    }
  });
  const viewportArea = viewport.right * viewport.bottom;
  return best && { element: best, coversMostOfScreen: bestArea >= viewportArea / 2 };
}

/** What Page mode should scroll: null for the document, or the page's main pane. */
function choosePagePane() {
  const scroller = document.scrollingElement || document.documentElement;
  const extra = scroller.scrollHeight - scroller.clientHeight;

  // Only trying it tells whether the window scrolls: it depends on html and body together.
  const { scrollX, scrollY } = window;
  window.scrollTo({ left: scrollX, top: extra === scrollY ? 0 : extra, behavior: 'instant' });
  const windowScrolls = extra > 1 && window.scrollY !== scrollY;
  window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });

  const pane = findMainPane();
  if (!pane) return null;
  if (!windowScrolls) return pane.element;
  // A page with a little stray scroll around a full-screen pane is still an app shell.
  return extra < 100 && pane.coversMostOfScreen ? pane.element : null;
}

/** Sets inline styles for the capture, keeping what's needed to put them back. */
function overrideStyles(session, element, properties) {
  for (const [name, value] of Object.entries(properties)) {
    const before = element.style.getPropertyValue(name);
    const priority = element.style.getPropertyPriority(name);
    session.restores.push(() => {
      if (before) element.style.setProperty(name, before, priority);
      else element.style.removeProperty(name);
    });
    element.style.setProperty(name, value, 'important');
  }
}

/**
 * Deals with elements that would stay on screen across tiles. This runs before
 * every tile, because pages change them as they scroll.
 *  - Sticky becomes plain flow: a heading stays with its section once, instead
 *    of covering the content or vanishing with it. The layout doesn't change.
 *  - Fixed is hidden, as it would repeat on every tile. It stays only if it
 *    holds the target or is inside it.
 */
function settleStuckElements(session, hideFixed) {
  forEachDeepElement(document, (element) => {
    if (session.handled.has(element)) return;
    const { position } = getComputedStyle(element);
    if (position === 'sticky') {
      session.handled.add(element);
      overrideStyles(session, element, { position: 'relative', top: 'auto', right: 'auto', bottom: 'auto', left: 'auto' });
    } else if (position === 'fixed' && hideFixed && !isRelatedToTarget(session, element)) {
      session.handled.add(element);
      overrideStyles(session, element, { visibility: 'hidden', transition: 'none' });
    }
  });
}

function isRelatedToTarget(session, element) {
  if (!session.target) return false;
  for (let node = session.target; node; node = composedParent(node)) if (node === element) return true;
  for (let node = element; node; node = composedParent(node)) if (node === session.target) return true;
  return false;
}

/** Where the top-left of the content is in the viewport, and the box it shows through. */
function measureContent(session) {
  const { target } = session;
  if (!target) {
    const viewport = viewportBox();
    return { x: -window.scrollX, y: -window.scrollY, box: viewport };
  }
  if (session.ownContent) {
    const box = paddingBox(target);
    return { x: box.left - target.scrollLeft, y: box.top - target.scrollTop, box };
  }
  const box = target.getBoundingClientRect();
  return { x: box.left, y: box.top, box };
}

/**
 * Sets up a capture. Page mode captures the document, or the main pane plus what
 * surrounds it on screen. Element mode captures captureTarget.
 * @param {'page'|'element'} mode
 * @returns {object} The plan the service worker tiles and sizes its canvas from
 */
function prepareCapture(mode) {
  finishCapture();

  const session = { mode, target: null, pane: null, ownContent: false, scrollers: [], handled: new WeakSet(), restores: [], positions: [] };

  const style = document.createElement('style');
  style.id = CAPTURE_STYLE_ID;
  style.textContent = CAPTURE_CSS;
  (document.head || document.documentElement).appendChild(style);
  session.restores.push(() => style.remove());
  captureSession = session;

  if (mode === 'element') {
    if (!captureTarget?.isConnected) throw new Error('The selected element is no longer on the page');
    session.target = captureTarget;
  } else {
    session.pane = choosePagePane();
    session.target = session.pane;
  }

  if (session.target) {
    const chain = clippingChain(session.target);
    session.ancestors = chain.ancestors;
    session.scrollsWithWindow = chain.scrollsWithWindow;
    session.ownContent = capturesOwnContent(session.target);
    if (session.ownContent) session.scrollers.push(session.target);
    session.scrollers.push(...chain.ancestors.filter((ancestor) => canScroll(ancestor)));
  } else {
    session.ancestors = [];
    session.scrollsWithWindow = true;
  }

  // Everything that moves goes back where it was afterwards.
  session.positions = session.scrollers.map((element) => ({ element, left: element.scrollLeft, top: element.scrollTop }));
  session.windowPosition = { left: window.scrollX, top: window.scrollY };

  // Element captures have no use for the page's chrome. Page captures keep it for the first tile.
  settleStuckElements(session, mode === 'element');

  const viewport = viewportBox();
  const plan = { viewportWidth: window.innerWidth, viewportHeight: window.innerHeight };

  if (session.pane) {
    const edge = paddingBox(session.pane);
    const extra = session.pane.scrollHeight - session.pane.clientHeight;
    session.plan = {
      ...plan,
      width: session.pane.clientWidth,
      height: session.pane.scrollHeight,
      canvasWidth: viewport.right,
      canvasHeight: viewport.bottom + extra,
      offsetX: edge.left,
      offsetY: edge.top,
      pane: { bottom: edge.bottom, extra, background: pageBackground() },
    };
    return session.plan;
  }

  const size = session.target ? getCaptureSize(session.target) : getDocumentDimensions();
  session.plan = { ...plan, width: size.width, height: size.height, canvasWidth: size.width, canvasHeight: size.height, offsetX: 0, offsetY: 0 };
  return session.plan;
}

/** What shows behind the page where a pane grows past the rest of the layout. */
function pageBackground() {
  const isPainted = (color) => color && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)';
  const body = document.body && getComputedStyle(document.body).backgroundColor;
  if (isPainted(body)) return body;
  const html = getComputedStyle(document.documentElement).backgroundColor;
  return isPainted(html) ? html : '#ffffff';
}

/**
 * Brings a point of the content as close to the top-left of the visible area as
 * it will go, innermost scroller first.
 */
function revealContentPoint(session, x, y) {
  for (const scroller of session.scrollers) {
    const content = measureContent(session);
    const edge = paddingBox(scroller);
    scroller.scrollBy({ left: content.x + x - edge.left, top: content.y + y - edge.top, behavior: 'instant' });
  }
  if (session.scrollsWithWindow) {
    const content = measureContent(session);
    window.scrollBy({ left: content.x + x, top: content.y + y, behavior: 'instant' });
  }
}

const nextFrame = () => new Promise((resolve) => {
  // rAF stops firing if the tab goes to the background, which the service worker reports.
  const timer = setTimeout(resolve, 200);
  requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(timer); resolve(); }));
});

/**
 * Moves to the next tile and reports what's on screen.
 * @param {object} request
 * @param {number} request.x - Wanted content x, CSS pixels
 * @param {number} request.y - Wanted content y, CSS pixels
 * @param {number} request.index - Tile number, 0 for the first
 * @param {number} request.settleMs - Time for lazy content, and Chrome's limit on captures per second
 * @returns {Promise<object>} The visible area, and which content position it starts at
 */
async function positionTile({ x, y, index, settleMs }) {
  const session = captureSession;
  revealContentPoint(session, x, y);
  await new Promise((resolve) => setTimeout(resolve, settleMs));

  settleStuckElements(session, session.mode === 'element' || index > 0);
  await nextFrame();

  // Scrolling can load content or change the layout, so this has to come last.
  const content = measureContent(session);
  const visible = clipToAncestors(content.box, session.ancestors);
  const horizontal = snapCutEdges(visible.left, visible.width, content.x, session.plan.width);
  const vertical = snapCutEdges(visible.top, visible.height, content.y, session.plan.height);
  return { left: horizontal.start, top: vertical.start, width: horizontal.size, height: vertical.size, atX: horizontal.start - content.x, atY: vertical.start - content.y };
}

/**
 * Moves edges where the content is cut off inward to whole device pixels. On a
 * fractional position the edge pixel is half background, which would show as a
 * faint line at the seam. The next tile picks up from the snapped edge.
 */
function snapCutEdges(start, size, contentStart, contentSize) {
  const dpr = window.devicePixelRatio || 1;
  const end = start + size;
  const cutAtStart = start - contentStart > 0.01;
  const cutAtEnd = contentStart + contentSize - end > 0.01;
  const snappedStart = cutAtStart ? Math.ceil(start * dpr - 0.001) / dpr : start;
  const snappedEnd = cutAtEnd ? Math.floor(end * dpr + 0.001) / dpr : end;
  return { start: snappedStart, size: Math.max(0, snappedEnd - snappedStart) };
}

/** Hands the page back as it was found. */
function finishCapture() {
  const session = captureSession;
  if (!session) return;
  captureSession = null;

  for (const { element, left, top } of session.positions) element.scrollTo({ left, top, behavior: 'instant' });
  if (session.windowPosition) window.scrollTo({ ...session.windowPosition, behavior: 'instant' });
  for (const restore of session.restores.reverse()) restore();
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

    /* Takes the pointer so the page gets no hover, press or click during a drag */
    #region-selector-layer {
      position: fixed;
      inset: 0;
      z-index: 2147483644;
      cursor: crosshair;
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
