/**
 * Element Snapper - Preview Thumbnail
 * macOS-style floating preview after capture.
 * Shadow-DOM-isolated thumbnail (bottom-right) + click-through full image modal.
 *
 * Public API: window.elementSnapperPreview.show(dataUrl, meta?)
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
      background:
        linear-gradient(45deg, #1e293b 25%, transparent 25%),
        linear-gradient(-45deg, #1e293b 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #1e293b 75%),
        linear-gradient(-45deg, transparent 75%, #1e293b 75%);
      background-size: 16px 16px;
      background-position: 0 0, 0 8px, 8px -8px, -8px 0;
      background-color: #0f172a;
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

    .modal-img {
      max-width: 90vw;
      max-height: 80vh;
      border-radius: var(--radius-md);
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
      background:
        linear-gradient(45deg, #1e293b 25%, transparent 25%),
        linear-gradient(-45deg, #1e293b 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #1e293b 75%),
        linear-gradient(-45deg, transparent 75%, #1e293b 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0;
      background-color: #0f172a;
    }

    .modal-toolbar {
      display: flex;
      gap: 8px;
      padding: 8px;
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
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

  // ─── Shadow DOM host (hidden until first show()) ──────────────────────────
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
  // currentAsset holds the captured image as a Blob plus a blob: URL for fast
  // <img src> and <a download> use. We do this because <a href="data:...">
  // and <img src="data:..."> on multi-MB data URLs block the main thread
  // while the browser parses the base64; blob: URLs are O(1) to attach.
  let currentAsset = null; // { blob, objectUrl, mimeType, source }
  let currentThumb = null;
  let currentModal = null;
  let dismissTimer = null;
  let dismissDeadline = 0;
  let dismissRemaining = AUTO_DISMISS_MS;
  let escHandler = null;

  function revokeAssetIfUnused() {
    if (!currentAsset) return;
    if (currentThumb || currentModal) return;
    URL.revokeObjectURL(currentAsset.objectUrl);
    currentAsset = null;
  }

  function clearTimer() {
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
  }

  function dismissThumb() {
    if (!currentThumb) return;
    clearTimer();
    const thumb = currentThumb;
    currentThumb = null;
    thumb.classList.add('leaving');
    setTimeout(() => {
      thumb.remove();
      revokeAssetIfUnused();
    }, 350);
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
      // Force reflow before applying transition so the animation actually runs.
      void progress.offsetWidth;
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

  // ─── Modal ────────────────────────────────────────────────────────────────
  function closeModal() {
    if (!currentModal) return;
    const modal = currentModal;
    currentModal = null;
    modal.classList.remove('visible');
    if (escHandler) {
      document.removeEventListener('keydown', escHandler, true);
      escHandler = null;
    }
    setTimeout(() => {
      modal.remove();
      revokeAssetIfUnused();
    }, 250);
  }

  async function copyAssetToClipboard() {
    // Snapshot the asset so a concurrent show() swapping currentAsset
    // (and revoking its objectUrl) can't desync mid-await.
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
        // onerror fires with an Event, not an Error — wrap so the catch
        // at the call site sees a meaningful .message.
        img.onerror = () => reject(new Error('Image decode failed'));
        img.src = asset.objectUrl;
      });
    }

    await navigator.clipboard.write([
      new ClipboardItem({ [mimeType]: clipboardBlob })
    ]);
  }

  function downloadAsset() {
    if (!currentAsset) return;
    const a = document.createElement('a');
    a.href = currentAsset.objectUrl;
    a.download = makeFilename(currentAsset.mimeType, currentAsset.source);
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Mirrors service_worker.js generateViewportFilename naming so re-downloads
  // from the preview match the on-capture download filenames.
  const VALID_SOURCES = new Set(['element', 'region', 'viewport', 'fullpage']);
  function makeFilename(mimeType, source) {
    const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').substring(0, 19);
    const tag = VALID_SOURCES.has(source) ? source : 'preview';
    return `screenshot_${tag}_${ts}.${ext}`;
  }

  // Toast rendered inside the shadow root so it stacks above the modal/thumb.
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
      <img class="modal-img" alt="Preview" />
      <div class="modal-toolbar">
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
        <button class="toolbar-btn" data-act="close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Close
        </button>
      </div>
    `;

    modal.querySelector('.modal-img').src = currentAsset.objectUrl;

    modal.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) {
        if (e.target === modal) closeModal();
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
      }
    });

    escHandler = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeModal();
      }
    };
    document.addEventListener('keydown', escHandler, true);

    root.appendChild(modal);
    currentModal = modal;
    requestAnimationFrame(() => modal.classList.add('visible'));
  }

  // ─── Thumbnail ────────────────────────────────────────────────────────────
  function showThumb() {
    if (!currentAsset) return;

    // Replace any existing thumbnail cleanly.
    if (currentThumb) {
      clearTimer();
      currentThumb.remove();
      currentThumb = null;
    }

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    thumb.innerHTML = `
      <img class="thumb-img" alt="Preview" />
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

  async function dataUrlToAsset(dataUrl, source) {
    // fetch() decodes base64 off the main thread — much smoother than
    // setting <a href> or <img src> to a multi-MB data URL.
    const blob = await (await fetch(dataUrl)).blob();
    const objectUrl = URL.createObjectURL(blob);
    return { blob, objectUrl, mimeType: blob.type || 'image/png', source };
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  window.elementSnapperPreview = {
    async show(dataUrl, meta) {
      if (!dataUrl) return;

      let nextAsset;
      try {
        nextAsset = await dataUrlToAsset(dataUrl, meta && meta.source);
      } catch (err) {
        console.error('Element Snapper: preview decode failed', err);
        return;
      }

      // Swap in the new asset, releasing any prior unreferenced one.
      if (currentAsset) {
        URL.revokeObjectURL(currentAsset.objectUrl);
      }
      currentAsset = nextAsset;

      showThumb();
    },
  };
})();
