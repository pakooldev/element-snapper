/**
 * Element Snapper - Preview Thumbnail
 * macOS-style floating preview after capture, plus a history view of recent
 * captures backed by chrome.storage.session.
 *
 * Public API: window.elementSnapperPreview.show(captureId)
 *
 * Data flow:
 *   service worker captures → writes dataURL to chrome.storage.session as
 *   `capture:{id}` and updates the `history` index → returns { captureId } to
 *   the content script → preview.js reads the dataURL by id, decodes it into
 *   a blob: URL once, and renders thumbnail + modal from that.
 */
(function () {
  'use strict';

  const HOST_ID = '__element-snapper-preview-host__';
  const AUTO_DISMISS_MS = 5000;

  // Re-injection safety: if the IIFE already ran on this page, don't redefine.
  if (window.elementSnapperPreview) return;

  const PREVIEW_CSS = `
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    .preview-root {
      --bg-dark: #0f172a;
      --bg-card: #1e293b;
      --bg-hover: #334155;
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --accent-primary: #3b82f6;
      --accent-hover: #2563eb;
      --accent-alpha: rgba(59, 130, 246, 0.2);
      --success: #10b981;
      --error: #ef4444;
      --border-light: rgba(255, 255, 255, 0.1);
      --border-hover: rgba(255, 255, 255, 0.2);
      --radius-sm: 6px;
      --radius-md: 12px;
      --ease: cubic-bezier(0.2, 0.8, 0.2, 1);

      color: var(--text-primary);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
    }

    /* Checkerboard pattern for transparent areas — reused across thumb/modal/grid. */
    .checker {
      background:
        linear-gradient(45deg, #1e293b 25%, transparent 25%),
        linear-gradient(-45deg, #1e293b 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #1e293b 75%),
        linear-gradient(-45deg, transparent 75%, #1e293b 75%);
      background-size: 16px 16px;
      background-position: 0 0, 0 8px, 8px -8px, -8px 0;
      background-color: #0f172a;
    }

    /* ── Thumbnail ── */
    .thumb {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 220px;
      height: 150px;
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      cursor: pointer;
      transform: translateX(120%);
      opacity: 0;
      transition: transform 0.4s var(--ease), opacity 0.3s var(--ease);
      pointer-events: auto;
    }
    .thumb.visible { transform: translateX(0); opacity: 1; }
    .thumb.leaving { transform: translateX(120%); opacity: 0; }
    .thumb:hover {
      border-color: var(--border-hover);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), 0 6px 16px rgba(0, 0, 0, 0.35);
    }

    .thumb-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    .thumb-close {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border-light);
      color: var(--text-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s, background 0.2s;
      padding: 0;
      font-family: inherit;
    }
    .thumb:hover .thumb-close { opacity: 1; }
    .thumb-close:hover { background: var(--error); border-color: var(--error); }

    .thumb-progress {
      position: absolute;
      left: 0;
      bottom: 0;
      height: 3px;
      width: 100%;
      background: var(--accent-primary);
      transform-origin: left center;
      transform: scaleX(1);
      transition: transform linear;
    }
    .thumb.paused .thumb-progress { transition: none; }

    /* ── Full Modal ── */
    .modal {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      opacity: 0;
      transition: opacity 0.25s var(--ease);
      padding: 32px;
      pointer-events: auto;
    }
    .modal.visible { opacity: 1; }

    .modal-stage {
      flex: 1 1 auto;
      width: 100%;
      max-height: calc(100vh - 240px);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
    }

    .modal-img {
      max-width: 90vw;
      max-height: 100%;
      border-radius: var(--radius-md);
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
    }

    /* ── History strip (horizontal scroll of recent captures, below image) ──
       The strip width follows the viewport so big screens show more tiles
       without scrolling. The blurred backdrop is sourced from --strip-bg
       (set in JS to the foreground image) so the strip visually echoes the
       capture above it. */
    .history-strip {
      position: relative;
      width: 100%;
      max-width: 1600px;
      flex-shrink: 0;
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      overflow: hidden;
    }
    .history-strip::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: var(--strip-bg, none);
      background-size: cover;
      background-position: center;
      /* Scale + blur creates a soft, edge-free wash of the image's colors. */
      filter: blur(32px) saturate(1.4) brightness(0.55);
      transform: scale(1.2);
      opacity: 0.75;
      pointer-events: none;
      transition: opacity 0.25s var(--ease);
    }
    .history-strip:not([style*="--strip-bg"])::before { opacity: 0; }
    .history-strip.empty { display: none; }

    .strip-track {
      position: relative;
      z-index: 1;
      display: flex;
      gap: 8px;
      padding: 8px;
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: thin;
      /* "safe" falls back to flex-start when content overflows so the user
         can still scroll to the leftmost item. */
      justify-content: safe center;
    }
    .strip-track::-webkit-scrollbar { height: 6px; }
    .strip-track::-webkit-scrollbar-thumb {
      background: var(--border-hover);
      border-radius: 3px;
    }

    .history-tile {
      position: relative;
      flex: 0 0 auto;
      width: 96px;
      height: 72px;
      background: var(--bg-dark);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      overflow: hidden;
      cursor: pointer;
      transition: border-color 0.15s, transform 0.15s;
    }
    .history-tile:hover {
      border-color: var(--border-hover);
      transform: translateY(-1px);
    }
    .history-tile.active {
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 2px var(--accent-alpha);
    }
    .history-tile img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .history-tile .source-badge {
      position: absolute;
      left: 4px;
      bottom: 4px;
      padding: 2px 6px;
      background: rgba(15, 23, 42, 0.85);
      color: var(--text-primary);
      font-size: 10px;
      font-weight: 500;
      border-radius: 3px;
      text-transform: capitalize;
      pointer-events: none;
    }

    /* ── Toolbar ── */
    .modal-toolbar {
      display: flex;
      gap: 8px;
      padding: 8px;
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      flex-shrink: 0;
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: transparent;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-family: inherit;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .toolbar-btn:hover {
      background: var(--bg-hover);
      border-color: var(--border-hover);
    }
    .toolbar-btn.primary {
      background: linear-gradient(135deg, var(--accent-primary), var(--accent-hover));
      border-color: transparent;
      color: white;
    }
    .toolbar-btn.primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px var(--accent-alpha);
    }
    .toolbar-btn:active { transform: scale(0.97); }
    .toolbar-btn[hidden] { display: none; }

    /* Remove (destructive) — quiet by default; hint at destructive on hover. */
    .toolbar-btn.destructive:hover {
      color: #fecaca;
      border-color: var(--error);
      background: rgba(239, 68, 68, 0.1);
    }
    .toolbar-btn.danger {
      background: var(--error);
      border-color: transparent;
      color: white;
    }
    .toolbar-btn.danger:hover {
      background: #dc2626;
      border-color: transparent;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }

    /* Confirm strip — same toolbar shell, different children. */
    .toolbar-segment { display: flex; gap: 8px; align-items: center; }
    .toolbar-segment[hidden] { display: none; }

    .toolbar-prompt {
      padding: 0 8px;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 500;
    }

    /* ── In-shadow toast (renders above thumbnail/modal in stacking order) ── */
    .toast {
      position: fixed;
      top: 20px;
      left: 50%;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid var(--border-light);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      color: var(--text-primary);
      font-size: 14px;
      font-weight: 500;
      pointer-events: none;
      transform: translateX(-50%) translateY(-20px);
      opacity: 0;
      transition: transform 0.3s var(--ease), opacity 0.3s var(--ease);
    }
    .toast.visible { transform: translateX(-50%) translateY(0); opacity: 1; }
    .toast .dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--success);
      flex-shrink: 0;
    }
    .toast.error .dot { background: var(--error); }
  `;

  // ─── Shadow DOM host ──────────────────────────────────────────────────────
  // Host is a 0×0 anchor; children use position: fixed with pointer-events: auto
  // so they escape the host box and stay interactive without blocking page clicks.
  const host = document.createElement('div');
  host.id = HOST_ID;
  Object.assign(host.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '0',
    height: '0',
    zIndex: '2147483647',
    pointerEvents: 'none',
  });

  const shadow = host.attachShadow({ mode: 'open' });
  const styleEl = document.createElement('style');
  styleEl.textContent = PREVIEW_CSS;

  const root = document.createElement('div');
  root.className = 'preview-root';

  shadow.appendChild(styleEl);
  shadow.appendChild(root);
  document.documentElement.appendChild(host);

  // ─── State ────────────────────────────────────────────────────────────────
  // currentAsset is the *foreground* capture rendered in the thumb / modal
  // image. tileAssets caches blob URLs for the history strip thumbnails so
  // we don't re-fetch on every render.
  let currentAsset = null;        // { id, blob, objectUrl, mimeType, source }
  const tileAssets = new Map();   // id → { objectUrl }
  let currentThumb = null;
  let currentModal = null;
  let dismissTimer = null;
  let dismissDeadline = 0;
  let dismissRemaining = AUTO_DISMISS_MS;
  let escHandler = null;
  let toolbarMode = 'default';    // 'default' | 'confirm' — kept in sync by setToolbarMode

  function clearTimer() {
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
  }

  function revokeAllTileAssets() {
    for (const v of tileAssets.values()) URL.revokeObjectURL(v.objectUrl);
    tileAssets.clear();
  }

  // ─── Storage helpers ──────────────────────────────────────────────────────
  async function readHistoryIndex() {
    try {
      const r = await chrome.storage.session.get('history');
      return Array.isArray(r.history) ? r.history : [];
    } catch (err) {
      console.warn('Element Snapper: history index read failed', err);
      return [];
    }
  }

  async function readDataUrlById(id) {
    const key = `capture:${id}`;
    const r = await chrome.storage.session.get(key);
    return r[key] || null;
  }

  async function loadAssetById(id) {
    const dataUrl = await readDataUrlById(id);
    if (!dataUrl) return null;
    // fetch() decodes base64 off the main thread — avoids freezes on
    // multi-MB strings and matches the rest of the asset model.
    const blob = await (await fetch(dataUrl)).blob();
    const objectUrl = URL.createObjectURL(blob);
    return { id, blob, objectUrl, mimeType: blob.type || 'image/png' };
  }

  // ─── Thumbnail lifecycle ──────────────────────────────────────────────────
  function dismissThumb() {
    if (!currentThumb) return;
    clearTimer();
    const thumb = currentThumb;
    currentThumb = null;
    thumb.classList.add('leaving');
    // Match the longest CSS exit transition on .thumb (transform 0.4s)
    // so the node isn't yanked mid-animation.
    setTimeout(() => {
      thumb.remove();
      // If nothing else is using the foreground asset, free it.
      if (!currentModal && currentAsset) {
        URL.revokeObjectURL(currentAsset.objectUrl);
        currentAsset = null;
      }
    }, 400);
  }

  function startTimer(durationMs) {
    if (!currentThumb) return;
    clearTimer();
    dismissRemaining = durationMs;
    dismissDeadline = Date.now() + durationMs;

    const progress = currentThumb.querySelector('.thumb-progress');
    if (progress) {
      progress.style.transition = 'none';
      progress.style.transform = 'scaleX(1)';
      void progress.offsetWidth;  // force reflow
      progress.style.transition = `transform ${durationMs}ms linear`;
      progress.style.transform = 'scaleX(0)';
    }

    dismissTimer = setTimeout(dismissThumb, durationMs);
  }

  function pauseTimer() {
    if (!currentThumb || !dismissTimer) return;
    clearTimer();
    dismissRemaining = Math.max(0, dismissDeadline - Date.now());
    currentThumb.classList.add('paused');

    const progress = currentThumb.querySelector('.thumb-progress');
    if (progress) {
      const computed = getComputedStyle(progress).transform;
      progress.style.transition = 'none';
      progress.style.transform = computed === 'none' ? 'scaleX(1)' : computed;
    }
  }

  function resumeTimer() {
    if (!currentThumb || dismissTimer) return;
    currentThumb.classList.remove('paused');
    startTimer(dismissRemaining > 0 ? dismissRemaining : AUTO_DISMISS_MS);
  }

  function showThumb() {
    if (!currentAsset) return;

    if (currentThumb) {
      clearTimer();
      currentThumb.remove();
      currentThumb = null;
    }

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    thumb.innerHTML = `
      <img class="thumb-img checker" alt="Preview" />
      <button class="thumb-close" aria-label="Dismiss preview">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="thumb-progress"></div>
    `;

    thumb.querySelector('.thumb-img').src = currentAsset.objectUrl;

    thumb.addEventListener('click', (e) => {
      if (e.target.closest('.thumb-close')) return;
      openModal();
      dismissThumb();
    });
    thumb.querySelector('.thumb-close').addEventListener('click', (e) => {
      e.stopPropagation();
      dismissThumb();
    });
    thumb.addEventListener('mouseenter', pauseTimer);
    thumb.addEventListener('mouseleave', resumeTimer);

    root.appendChild(thumb);
    currentThumb = thumb;

    requestAnimationFrame(() => {
      thumb.classList.add('visible');
      startTimer(AUTO_DISMISS_MS);
    });
  }

  // ─── Modal ────────────────────────────────────────────────────────────────
  function closeModal() {
    if (!currentModal) return;
    const modal = currentModal;
    currentModal = null;
    toolbarMode = 'default';
    modal.classList.remove('visible');
    if (escHandler) {
      document.removeEventListener('keydown', escHandler, true);
      escHandler = null;
    }
    setTimeout(() => {
      modal.remove();
      revokeAllTileAssets();
      if (!currentThumb && currentAsset) {
        URL.revokeObjectURL(currentAsset.objectUrl);
        currentAsset = null;
      }
      // Notify other content scripts (e.g. the floating panel) that the
      // modal is gone — they may have hidden themselves to avoid overlap.
      document.dispatchEvent(new CustomEvent('element-snapper:modal-closed'));
    }, 250);
  }

  // Updates the blurred backdrop on the history strip to match the currently
  // foregrounded image, so the strip's coloring is always tied to the capture.
  function applyStripBackdrop() {
    if (!currentModal) return;
    const strip = currentModal.querySelector('.history-strip');
    if (!strip) return;
    if (currentAsset) {
      strip.style.setProperty('--strip-bg', `url("${currentAsset.objectUrl}")`);
    } else {
      strip.style.removeProperty('--strip-bg');
    }
  }

  // Renders the horizontal history strip below the main image. Each tile is a
  // recent capture; clicking it swaps the main image without leaving the modal.
  async function renderHistoryStrip(stripEl) {
    if (!stripEl) return;
    const trackEl = stripEl.querySelector('.strip-track');
    if (!trackEl) return;
    trackEl.innerHTML = '';
    const history = await readHistoryIndex();

    // Hide the strip entirely when there's only the current capture (or none).
    if (history.length <= 1) {
      stripEl.classList.add('empty');
      return;
    }
    stripEl.classList.remove('empty');

    // Newest first — most recent captures are most likely to be re-opened.
    const entries = [...history].reverse();
    for (const entry of entries) {
      const tile = document.createElement('div');
      tile.className = 'history-tile checker';
      if (currentAsset && entry.id === currentAsset.id) tile.classList.add('active');
      tile.innerHTML = `
        <img alt="Capture" />
        <span class="source-badge">${entry.source || 'capture'}</span>
      `;
      const img = tile.querySelector('img');

      const cached = tileAssets.get(entry.id);
      if (cached) {
        img.src = cached.objectUrl;
      } else {
        // Lazy-load: read the dataURL from session storage and convert once.
        readDataUrlById(entry.id).then(async (dataUrl) => {
          if (!dataUrl) return;
          const blob = await (await fetch(dataUrl)).blob();
          const objectUrl = URL.createObjectURL(blob);
          tileAssets.set(entry.id, { objectUrl });
          img.src = objectUrl;
        }).catch(err => console.warn('Element Snapper: tile load failed', err));
      }

      tile.addEventListener('click', async () => {
        if (currentAsset && entry.id === currentAsset.id) return;  // already showing
        try {
          const asset = await loadAssetById(entry.id);
          if (!asset) {
            showShadowToast('That capture is no longer in history', 'error');
            return;
          }
          if (currentAsset) URL.revokeObjectURL(currentAsset.objectUrl);
          currentAsset = { ...asset, source: entry.source };
          if (currentModal) {
            const mainImg = currentModal.querySelector('.modal-img');
            if (mainImg) mainImg.src = asset.objectUrl;
            // Update active tile highlight.
            trackEl.querySelectorAll('.history-tile.active').forEach(t => t.classList.remove('active'));
            tile.classList.add('active');
            applyStripBackdrop();
          }
        } catch (err) {
          showShadowToast('Failed to open: ' + err.message, 'error');
        }
      });

      trackEl.appendChild(tile);
    }
  }

  async function copyAssetToClipboard() {
    const asset = currentAsset;
    if (!asset) return;
    const blob = asset.blob;
    const supported = typeof ClipboardItem !== 'undefined' && ClipboardItem.supports?.(blob.type);
    const mimeType = supported ? blob.type : 'image/png';

    let clipboardBlob = blob;
    if (mimeType !== blob.type) {
      // Re-encode JPEG → PNG for clipboards that don't support JPEG.
      clipboardBlob = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext('2d').drawImage(img, 0, 0);
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/png');
        };
        img.onerror = () => reject(new Error('Image decode failed'));
        img.src = asset.objectUrl;
      });
    }

    await navigator.clipboard.write([new ClipboardItem({ [mimeType]: clipboardBlob })]);
  }

  function downloadAsset() {
    if (!currentAsset) return;
    const a = document.createElement('a');
    a.href = currentAsset.objectUrl;
    a.download = makeFilename(currentAsset.mimeType, currentAsset.source);
    // Append to documentElement (always present) instead of body — defends
    // against edge cases where body isn't available yet.
    document.documentElement.appendChild(a);
    a.click();
    a.remove();
  }

  // Mirrors service_worker.js generateViewportFilename naming.
  const VALID_SOURCES = new Set(['element', 'region', 'viewport', 'fullpage']);
  function makeFilename(mimeType, source) {
    const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
    const tag = VALID_SOURCES.has(source) ? source : 'preview';
    return `screenshot_${tag}_${ts}.${ext}`;
  }

  let toastTimer = null;
  function showShadowToast(message, type = 'success') {
    const existing = root.querySelector('.toast');
    if (existing) existing.remove();
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    toast.innerHTML = `<span class="dot"></span><span></span>`;
    toast.querySelector('span:last-child').textContent = message;

    root.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));

    toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
      toastTimer = null;
    }, 2500);
  }

  function openModal() {
    if (currentModal || !currentAsset) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-stage">
        <img class="modal-img checker" alt="Preview" />
      </div>
      <div class="history-strip">
        <div class="strip-track" role="list"></div>
      </div>
      <div class="modal-toolbar">
        <div class="toolbar-segment" data-mode="default">
          <button class="toolbar-btn primary" data-act="download">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Download
          </button>
          <button class="toolbar-btn" data-act="copy">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Copy
          </button>
          <button class="toolbar-btn destructive" data-act="remove">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Remove
          </button>
          <button class="toolbar-btn destructive" data-act="remove-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Remove All
          </button>
          <button class="toolbar-btn" data-act="close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Close
          </button>
        </div>
        <div class="toolbar-segment" data-mode="confirm" hidden>
          <span class="toolbar-prompt">Remove this capture from history?</span>
          <button class="toolbar-btn danger" data-act="confirm-remove">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Remove
          </button>
          <button class="toolbar-btn" data-act="cancel-remove">Cancel</button>
        </div>
        <div class="toolbar-segment" data-mode="confirm-all" hidden>
          <span class="toolbar-prompt">Clear all capture history? This can't be undone.</span>
          <button class="toolbar-btn danger" data-act="confirm-remove-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Remove All
          </button>
          <button class="toolbar-btn" data-act="cancel-remove-all">Cancel</button>
        </div>
      </div>
    `;

    modal.querySelector('.modal-img').src = currentAsset.objectUrl;
    renderHistoryStrip(modal.querySelector('.history-strip'));
    // applyStripBackdrop reads currentModal, so attach the modal first.
    root.appendChild(modal);
    currentModal = modal;
    applyStripBackdrop();

    modal.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) {
        // Backdrop click — close only when clicking the modal background itself,
        // and only while in default toolbar mode (don't lose an in-progress
        // confirmation by accident).
        if (e.target === modal && getToolbarMode() === 'default') closeModal();
        return;
      }
      const act = btn.getAttribute('data-act');
      if (act === 'close') {
        closeModal();
      } else if (act === 'download') {
        downloadAsset();
        showShadowToast('Download started', 'success');
      } else if (act === 'copy') {
        try {
          await copyAssetToClipboard();
          showShadowToast('Copied to clipboard', 'success');
        } catch (err) {
          showShadowToast('Failed to copy: ' + err.message, 'error');
        }
      } else if (act === 'remove') {
        setToolbarMode('confirm');
      } else if (act === 'cancel-remove') {
        setToolbarMode('default');
      } else if (act === 'confirm-remove') {
        btn.disabled = true;
        try {
          await removeCurrentFromHistory();
        } catch (err) {
          showShadowToast('Failed to remove: ' + err.message, 'error');
          // If the asset was already nulled before the failure, the toolbar's
          // default actions would target nothing — close the modal instead.
          if (!currentAsset) { closeModal(); return; }
          setToolbarMode('default');
        } finally {
          btn.disabled = false;
        }
      } else if (act === 'remove-all') {
        setToolbarMode('confirm-all');
      } else if (act === 'cancel-remove-all') {
        setToolbarMode('default');
      } else if (act === 'confirm-remove-all') {
        btn.disabled = true;
        try {
          await clearAllHistory();
        } catch (err) {
          showShadowToast('Failed to remove all: ' + err.message, 'error');
          setToolbarMode('default');
        } finally {
          btn.disabled = false;
        }
      }
    });

    escHandler = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        // Escape during a confirm mode cancels the prompt without closing.
        const mode = getToolbarMode();
        if (mode === 'confirm' || mode === 'confirm-all') {
          setToolbarMode('default');
        } else {
          closeModal();
        }
      }
    };
    document.addEventListener('keydown', escHandler, true);

    requestAnimationFrame(() => modal.classList.add('visible'));
  }

  function getToolbarMode() {
    return toolbarMode;
  }

  function setToolbarMode(mode) {
    if (!currentModal) return;
    const def = currentModal.querySelector('.toolbar-segment[data-mode="default"]');
    const cnf = currentModal.querySelector('.toolbar-segment[data-mode="confirm"]');
    const cnfAll = currentModal.querySelector('.toolbar-segment[data-mode="confirm-all"]');
    if (!def || !cnf || !cnfAll) return;
    const next = mode === 'confirm' || mode === 'confirm-all' ? mode : 'default';
    def.hidden = next !== 'default';
    cnf.hidden = next !== 'confirm';
    cnfAll.hidden = next !== 'confirm-all';
    toolbarMode = next;
  }

  async function removeCurrentFromHistory() {
    if (!currentAsset) return;
    const removedId = currentAsset.id;
    // Guard against an asset without an id — would otherwise produce
    // `capture:undefined` and silently leave an orphaned blob in storage.
    if (!removedId) throw new Error('Asset has no id');

    // Drop the entry from the index and the dataURL blob from session storage.
    const history = await readHistoryIndex();
    const next = history.filter(e => e.id !== removedId);
    await chrome.storage.session.set({ history: next });
    await chrome.storage.session.remove(`capture:${removedId}`);

    // Free any cached blob URLs that referenced the removed entry.
    const cachedTile = tileAssets.get(removedId);
    if (cachedTile) {
      URL.revokeObjectURL(cachedTile.objectUrl);
      tileAssets.delete(removedId);
    }
    URL.revokeObjectURL(currentAsset.objectUrl);
    currentAsset = null;

    // No history left — close the modal entirely.
    if (!next.length) {
      showShadowToast('Capture removed', 'success');
      closeModal();
      return;
    }

    // Promote the newest remaining entry to the foreground. Predictable for
    // the user — easier than guessing a "next/prev neighbor" rule.
    const newest = next[next.length - 1];
    const replacement = await loadAssetById(newest.id);
    if (!replacement) {
      // Storage entry vanished out from under us — fall back to closing.
      closeModal();
      return;
    }
    currentAsset = { ...replacement, source: newest.source };

    const mainImg = currentModal.querySelector('.modal-img');
    if (mainImg) mainImg.src = replacement.objectUrl;
    applyStripBackdrop();
    renderHistoryStrip(currentModal.querySelector('.history-strip'));
    setToolbarMode('default');
    showShadowToast('Capture removed', 'success');
  }

  async function clearAllHistory() {
    const history = await readHistoryIndex();
    const keys = history.map(e => `capture:${e.id}`);
    // Delete the blobs before dropping the index that references them — if
    // the remove() throws partway, the index still lists everything, so
    // nothing is orphaned and a retry just picks up where it left off.
    if (keys.length) await chrome.storage.session.remove(keys);
    await chrome.storage.session.set({ history: [] });

    if (currentAsset) {
      URL.revokeObjectURL(currentAsset.objectUrl);
      currentAsset = null;
    }
    showShadowToast('All captures removed', 'success');
    // closeModal() also revokes any cached tileAssets thumbnails.
    closeModal();
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  window.elementSnapperPreview = {
    // Instantly hide any leftover preview UI (thumbnail, modal, toast) so a
    // capture in progress never grabs a stale frame of it. Called by panel.js
    // on every 'captureStarted' broadcast, regardless of which flow (element,
    // region, viewport, full page) triggered the capture.
    hideForCapture() {
      host.style.display = 'none';
    },

    // Counterpart to hideForCapture(), for paths that don't call show() to
    // make the host visible again on their own (error / cancelled).
    restoreAfterCapture() {
      host.style.display = '';
    },

    async show(captureId) {
      if (!captureId) return;
      // Always visible for a freshly-succeeded capture — don't rely on the
      // 'captureSuccess' broadcast (handled separately, may race this call).
      host.style.display = '';
      let asset;
      try {
        asset = await loadAssetById(captureId);
      } catch (err) {
        console.error('Element Snapper: preview load failed', err);
        return;
      }
      if (!asset) return;

      // Look up source from the history index for filename + history label.
      const history = await readHistoryIndex();
      const entry = history.find(e => e.id === captureId);

      // If a modal is already open, don't yank its foreground asset out from
      // under the user — the modal-img <src> would dangle once the URL is
      // revoked. Just refresh the strip so the newcomer is selectable.
      if (currentModal) {
        const strip = currentModal.querySelector('.history-strip');
        if (strip) renderHistoryStrip(strip);
        URL.revokeObjectURL(asset.objectUrl);  // we won't be using this one
        return;
      }

      // No modal open — safe to replace the foreground asset and pop a
      // new thumbnail. (showThumb removes any prior thumb DOM.)
      if (currentAsset) URL.revokeObjectURL(currentAsset.objectUrl);
      currentAsset = { ...asset, source: entry && entry.source };

      showThumb();
    },

    // Allow other content scripts (e.g. the floating panel) to open the
    // preview at the newest capture without taking a fresh one.
    async openHistory() {
      const history = await readHistoryIndex();
      if (!history.length) {
        showShadowToast('No captures in history yet', 'error');
        return;
      }
      const newest = history[history.length - 1];
      const asset = await loadAssetById(newest.id);
      if (!asset) {
        showShadowToast('History is empty', 'error');
        return;
      }
      if (currentAsset) URL.revokeObjectURL(currentAsset.objectUrl);
      currentAsset = { ...asset, source: newest.source };

      if (!currentModal) openModal();
    },
  };
})();
