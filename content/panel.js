/**
 * Element Snapper - Floating Panel
 * Creates an in-page floating panel injected when the extension icon is clicked.
 * Uses Shadow DOM for CSS isolation.
 */
(function () {
  'use strict';

  const PANEL_HOST_ID = '__element-snapper-panel-host__';

  // ─── Toggle existing panel ────────────────────────────────────────────────
  const existingHost = document.getElementById(PANEL_HOST_ID);
  if (existingHost) {
    existingHost.style.display = existingHost.style.display === 'none' ? 'block' : 'none';
    return;
  }

  // ─── Panel CSS (scoped inside Shadow DOM) ─────────────────────────────────
  const PANEL_CSS = `
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    .panel-root {
      --bg-dark: #0f172a;
      --bg-card: #1e293b;
      --bg-hover: #334155;
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent-primary: #3b82f6;
      --accent-hover: #2563eb;
      --accent-alpha: rgba(59, 130, 246, 0.2);
      --success: #10b981;
      --error: #ef4444;
      --warning: #f59e0b;
      --border-light: rgba(255, 255, 255, 0.1);
      --border-hover: rgba(255, 255, 255, 0.2);
      --radius-sm: 6px;
      --radius-md: 12px;
      --ease: cubic-bezier(0.2, 0.8, 0.2, 1);

      background-color: var(--bg-dark);
      border-radius: 12px;
      overflow: hidden;
      transition: height 0.4s var(--ease);
      color: var(--text-primary);
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .app-container {
      width: 100%;
      position: relative;
      overflow: hidden;
    }

    /* ── View Sliding Mechanism ── */
    .views-wrapper {
      position: relative;
      width: 100%;
      overflow: hidden;
      transition: height 0.4s var(--ease);
    }

    .view {
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      display: flex;
      flex-direction: column;
      background-color: var(--bg-dark);
      padding: 16px 20px;
      transition: transform 0.4s var(--ease), opacity 0.4s var(--ease);
    }

    .view-home  { z-index: 10; transform: translateX(0); }
    .view-settings { z-index: 20; transform: translateX(100%); }

    .views-wrapper.settings-open .view-home {
      transform: translateX(-30%);
      opacity: 0.5;
      pointer-events: none;
    }
    .views-wrapper.settings-open .view-settings { transform: translateX(0); }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      height: 32px;
    }

    .header.draggable {
      cursor: move;
      user-select: none;
    }

    .brand { display: flex; align-items: center; gap: 12px; }

    .brand h1 {
      font-size: 16px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--text-primary);
      white-space: nowrap;
    }

    .brand-logo { color: var(--text-primary); transition: transform 0.3s var(--ease); }
    .brand:hover .brand-logo { transform: scale(1.1) rotate(5deg); }

    .logo-dash {
      animation: marchingAnts 3s linear infinite;
      opacity: 0.4;
      transition: opacity 0.3s;
    }
    .brand:hover .logo-dash { opacity: 1; animation-duration: 1.5s; }

    @keyframes marchingAnts { to { stroke-dashoffset: -12; } }

    .header-controls { display: flex; align-items: center; gap: 8px; }

    /* ── Status Pill ── */
    .status-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 6px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-light);
      border-radius: 20px;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
    }

    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-muted); }
    .status-pill.idle     .status-dot { background: var(--accent-primary); box-shadow: 0 0 8px var(--accent-alpha); }
    .status-pill.selecting .status-dot { background: var(--accent-primary); animation: pulse 1s infinite; }
    .status-pill.capturing .status-dot { background: var(--warning); }
    .status-pill.success  .status-dot { background: var(--success); }
    .status-pill.error    .status-dot { background: var(--error); }

    @keyframes pulse {
      0%   { transform: scale(1);   opacity: 1; }
      50%  { transform: scale(1.5); opacity: 0.5; }
      100% { transform: scale(1);   opacity: 1; }
    }

    /* ── Icon Buttons ── */
    .icon-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 6px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

    /* ── Main Content ── */
    .main-content { flex: 1; display: flex; flex-direction: column; gap: 12px; }

    /* ── Primary Capture Button ── */
    .capture-btn {
      position: relative;
      width: 100%;
      height: 54px;
      background: linear-gradient(135deg, var(--accent-primary), var(--accent-hover));
      border: none;
      border-radius: var(--radius-md);
      color: white;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px var(--accent-alpha);
      transition: transform 0.1s, box-shadow 0.2s;
      font-family: inherit;
    }
    .capture-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px var(--accent-alpha); }
    .capture-btn:active { transform: scale(0.98); }

    .capture-btn .btn-content { display: flex; align-items: center; gap: 8px; }
    .btn-loading { display: none; }

    .capture-btn[data-state="capturing"] .btn-content { display: none; }
    .capture-btn[data-state="capturing"] .btn-loading { display: flex; }
    .capture-btn[data-state="selecting"] {
      background: var(--bg-card);
      border: 1px solid var(--accent-primary);
      color: var(--accent-primary);
      box-shadow: none;
    }

    /* ── Spinner ── */
    .spinner { width: 20px; height: 20px; animation: rotate 2s linear infinite; }
    .spinner .path { stroke: white; stroke-linecap: round; animation: dash 1.5s ease-in-out infinite; }

    @keyframes rotate { 100% { transform: rotate(360deg); } }
    @keyframes dash {
      0%   { stroke-dasharray: 1, 150;  stroke-dashoffset: 0; }
      50%  { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
      100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
    }

    /* ── Secondary Action Buttons ── */
    .action-buttons { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }

    .action-btn {
      padding: 14px 8px;
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }
    .action-btn:hover { border-color: var(--accent-primary); background: rgba(59, 130, 246, 0.05); }

    /* ── Switches ── */
    .switch-group, .setting-group { margin-top: 4px; }

    .switch-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .switch-row:hover { border-color: var(--border-hover); }
    .switch-group .switch-row + .switch-row { margin-top: 8px; }

    .switch-content { display: flex; flex-direction: column; gap: 4px; }
    .switch-label { font-size: 14px; font-weight: 500; }
    .switch-desc  { font-size: 12px; color: var(--text-secondary); }

    .switch-input { display: none; }

    /* ── Link-style button (subtle, footer-row affordance) ── */
    .link-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      margin-top: 4px;
      padding: 8px;
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: color 0.2s, background 0.2s;
    }
    .link-btn:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.03);
    }
    .link-btn svg { opacity: 0.6; transition: opacity 0.2s; }
    .link-btn:hover svg { opacity: 1; }

    .toggle-switch {
      width: 44px; height: 24px;
      background: var(--bg-dark);
      border-radius: 20px;
      position: relative;
      transition: background 0.3s;
      border: 1px solid var(--border-light);
      flex-shrink: 0;
    }
    .toggle-switch::after {
      content: "";
      position: absolute;
      top: 2px; left: 2px;
      width: 18px; height: 18px;
      background: var(--text-secondary);
      border-radius: 50%;
      transition: transform 0.3s, background 0.3s;
    }
    .switch-input:checked + .toggle-switch { background: var(--accent-primary); border-color: var(--accent-primary); }
    .switch-input:checked + .toggle-switch::after { transform: translateX(20px); background: white; }

    /* ── Settings Page ── */
    .settings-container { display: flex; flex-direction: column; gap: 16px; }

    .setting-label {
      font-size: 12px;
      text-transform: uppercase;
      color: var(--text-secondary);
      font-weight: 600;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
      display: block;
    }

    .toggle-group {
      display: flex;
      position: relative;
      background: var(--bg-card);
      padding: 4px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-light);
      --count: 2;
    }
    .toggle-group::before {
      content: '';
      position: absolute;
      top: 4px;
      bottom: 4px;
      left: 4px;
      width: calc((100% - 8px) / var(--count));
      background: var(--accent-primary);
      border-radius: 4px;
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 0;
    }
    .toggle-group:has(input:nth-of-type(2):checked)::before { transform: translateX(100%); }
    .toggle-group:has(input:nth-of-type(3):checked)::before { transform: translateX(200%); }
    .toggle-group input { display: none; }
    .toggle-option {
      position: relative;
      z-index: 1;
      flex: 1;
      text-align: center;
      padding: 8px;
      font-size: 13px;
      color: var(--text-secondary);
      cursor: pointer;
      border-radius: 4px;
      transition: color 0.25s ease;
    }
    .toggle-group input:checked + .toggle-option { color: white; font-weight: 500; }

    /* 3-way variant (Output mode) — longer labels need tighter sizing to
       fit the popup's fixed 340px width without wrapping */
    .toggle-group-3 {
      --count: 3;
    }
    .toggle-group-3 .toggle-option {
      padding: 8px 4px;
      font-size: 11px;
      white-space: nowrap;
    }

    .setting-row { display: flex; align-items: center; gap: 16px; margin-top: 12px; }
    .setting-row .setting-label { margin-bottom: 0; width: 60px; flex-shrink: 0; }

    .slider-value {
      font-family: monospace;
      font-size: 12px;
      color: var(--accent-primary);
      background: rgba(59, 130, 246, 0.1);
      padding: 4px 8px;
      border-radius: 4px;
      min-width: 48px;
      text-align: center;
      flex-shrink: 0;
    }

    .slider {
      appearance: none;
      -webkit-appearance: none;
      flex: 1;
      height: 6px;
      background-color: var(--bg-card);
      border-radius: 3px;
      outline: none;
      background-image: linear-gradient(var(--accent-primary), var(--accent-primary));
      background-repeat: no-repeat;
      background-size: var(--val, 0%) 100%;
    }
    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 18px; height: 18px;
      background: white;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      transition: transform 0.1s, box-shadow 0.2s;
    }
    .slider::-webkit-slider-thumb:hover {
      transform: scale(1.1);
      box-shadow: 0 0 0 4px var(--accent-alpha);
    }

    /* ── Shortcuts ── */
    .shortcut-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .shortcut-section-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .reset-btn {
      background: transparent;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 11px;
      font-family: inherit;
      padding: 3px 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .reset-btn:hover { border-color: var(--border-hover); color: var(--text-primary); }

    .shortcuts-list {
      display: flex;
      flex-direction: column;
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .shortcut-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-bottom: 1px solid var(--border-light);
    }
    .shortcut-row:last-child { border-bottom: none; }

    .shortcut-label { font-size: 13px; color: var(--text-primary); }

    .shortcut-key {
      background: var(--bg-dark);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      color: var(--accent-primary);
      font-family: monospace;
      font-size: 12px;
      padding: 3px 8px;
      cursor: pointer;
      min-width: 80px;
      text-align: center;
      outline: none;
      transition: all 0.2s;
      caret-color: transparent;
    }
    .shortcut-key.recording {
      border-color: var(--accent-primary);
      background: var(--accent-alpha);
      color: var(--text-secondary);
    }

    .bmc-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 12px;
      background: rgba(255, 221, 0, 0.05);
      border: 1px solid rgba(255, 221, 0, 0.2);
      border-radius: var(--radius-md);
      color: #fbbf24;
      text-decoration: none;
      font-weight: 500;
      font-size: 13px;
      transition: all 0.2s;
    }
    .bmc-btn:hover { background: rgba(255, 221, 0, 0.1); transform: translateY(-1px); }
  `;

  // ─── Panel HTML ────────────────────────────────────────────────────────────
  const PANEL_HTML = `
    <div class="panel-root">
      <div class="app-container">
        <div class="views-wrapper" id="viewsWrapper">

          <!-- ── Home View ── -->
          <div class="view view-home" id="homeView">
            <header class="header draggable" id="dragHandle">
              <div class="brand">
                <svg width="22" height="22" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" class="brand-logo">
                  <rect x="3" y="3" width="22" height="22" rx="4" stroke="currentColor" stroke-width="2" stroke-dasharray="4 2" class="logo-dash"/>
                  <path d="M3 9V7C3 4.79086 4.79086 3 7 3H9"    stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>
                  <path d="M25 9V7C25 4.79086 23.2091 3 21 3H19" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>
                  <path d="M3 19V21C3 23.2091 4.79086 25 7 25H9"  stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>
                  <path d="M25 19V21C25 23.2091 23.2091 25 21 25H19" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>
                  <circle cx="14" cy="14" r="5" fill="#3b82f6"/>
                  <circle cx="14" cy="14" r="2" fill="#0f172a"/>
                </svg>
                <h1>Element Snapper</h1>
              </div>
              <div class="header-controls">
                <div class="status-pill idle" id="statusPill">
                  <span class="status-dot"></span>
                </div>
                <button class="icon-btn" id="settingsBtn" aria-label="Settings">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.3246 4.31731C10.751 2.5609 13.249 2.5609 13.6754 4.31731C13.9508 5.45193 15.2507 5.99038 16.2478 5.38228C17.7913 4.44105 19.5589 6.2087 18.6177 7.75218C18.0096 8.74925 18.5481 10.0492 19.6827 10.3246C21.4391 10.751 21.4391 13.249 19.6827 13.6754C18.5481 13.9508 18.0096 15.2507 18.6177 16.2478C19.5589 17.7913 17.7913 19.5589 16.2478 18.6177C15.2507 18.0096 13.9508 18.5481 13.6754 19.6827C13.249 21.4391 10.751 21.4391 10.3246 19.6827C10.0492 18.5481 8.74926 18.0096 7.75219 18.6177C6.2087 19.5589 4.44105 17.7913 5.38228 16.2478C5.99038 15.2507 5.45193 13.9508 4.31731 13.6754C2.5609 13.249 2.5609 10.751 4.31731 10.3246C5.45193 10.0492 5.99038 8.74926 5.38228 7.75219C4.44105 6.2087 6.2087 4.44105 7.75219 5.38228C8.74926 5.99038 10.0492 5.45193 10.3246 4.31731Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <button class="icon-btn" id="closeBtn" aria-label="Close panel">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </header>

            <main class="main-content">
              <button class="capture-btn" id="captureBtn" data-state="idle">
                <div class="btn-content">
                  <div class="btn-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 4H10V6H6V10H4V4ZM20 4V10H18V6H14V4H20ZM4 20V14H6V18H10V20H4ZM20 20H14V18H18V14H20V20ZM12 8C14.2091 8 16 9.79086 16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8Z" fill="currentColor"/>
                    </svg>
                  </div>
                  <span class="btn-label" id="btnLabel">Select Element</span>
                </div>
                <div class="btn-loading">
                  <svg class="spinner" viewBox="0 0 50 50">
                    <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
                  </svg>
                </div>
              </button>

              <div class="action-buttons">
                <button class="action-btn" id="captureRegionBtn"><span>Area</span></button>
                <button class="action-btn" id="captureViewportBtn"><span>Screen</span></button>
                <button class="action-btn" id="captureFullPageBtn"><span>Page</span></button>
              </div>

              <div class="setting-group">
                <label class="setting-label">Output</label>
                <div class="toggle-group toggle-group-3">
                  <input type="radio" name="outputMode" id="om-download" value="download"/>
                  <label for="om-download" class="toggle-option">Download</label>
                  <input type="radio" name="outputMode" id="om-copyImage" value="copyImage" checked/>
                  <label for="om-copyImage" class="toggle-option">Copy Image</label>
                  <input type="radio" name="outputMode" id="om-copyPrompt" value="copyPrompt"/>
                  <label for="om-copyPrompt" class="toggle-option">Copy as Prompt</label>
                </div>
              </div>

              <button class="link-btn" id="historyBtn" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>View history</span>
              </button>
            </main>
          </div>

          <!-- ── Settings View ── -->
          <div class="view view-settings" id="settingsView">
            <header class="header draggable" id="settingsDragHandle">
              <div class="brand">
                <button class="icon-btn" id="backBtn" aria-label="Back">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <h1>Settings</h1>
              </div>
              <div class="header-controls">
                <a href="https://element-snapper.pakool.com/#how-it-works" target="_blank" class="icon-btn" aria-label="How it works" title="How it works">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </a>
                <button class="icon-btn" id="settingsCloseBtn" aria-label="Close panel">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </header>

            <main class="main-content">
              <div class="settings-container">
                <div class="setting-group">
                  <label class="setting-label">Format</label>
                  <div class="toggle-group">
                    <input type="radio" name="format" id="fmt-png" value="png" checked/>
                    <label for="fmt-png" class="toggle-option">PNG</label>
                    <input type="radio" name="format" id="fmt-jpg" value="jpg"/>
                    <label for="fmt-jpg" class="toggle-option">JPG</label>
                  </div>
                </div>

                <div class="setting-group setting-row" id="qualityGroup">
                  <label class="setting-label">Quality</label>
                  <input type="range" id="qualityInput" min="1" max="100" value="95" class="slider" style="--val: 95%"/>
                  <span id="qualityValue" class="slider-value">95%</span>
                </div>

                <div class="setting-group setting-row">
                  <label class="setting-label">Delay</label>
                  <input type="range" id="delayInput" min="0" max="10" value="0" class="slider" style="--val: 0%"/>
                  <span id="delayValue" class="slider-value">Off</span>
                </div>

                <div class="switch-group">
                  <label class="switch-row">
                    <div class="switch-content">
                      <span class="switch-label">Scroll Element</span>
                      <span class="switch-desc">Capture scrollable content</span>
                    </div>
                    <input type="checkbox" id="fullCaptureCheckbox" class="switch-input"/>
                    <div class="toggle-switch"></div>
                  </label>
                  <label class="switch-row">
                    <div class="switch-content">
                      <span class="switch-label">Preview Captures</span>
                      <span class="switch-desc">Show floating preview after capture</span>
                    </div>
                    <input type="checkbox" id="showPreviewCheckbox" class="switch-input"/>
                    <div class="toggle-switch"></div>
                  </label>
                  <input type="checkbox" id="debugModeCheckbox" class="switch-input" style="display:none"/>
                </div>

                <div class="setting-group">
                  <div class="shortcut-section-header">
                    <label class="setting-label" style="margin-bottom:0">Shortcuts</label>
                    <div class="shortcut-section-controls">
                      <button class="reset-btn" id="scResetBtn">Reset</button>
                      <label style="display:flex;align-items:center;cursor:pointer">
                        <input type="checkbox" id="sc-enabled" class="switch-input"/>
                        <div class="toggle-switch"></div>
                      </label>
                    </div>
                  </div>
                  <div class="shortcuts-list">
                    <div class="shortcut-row">
                      <span class="shortcut-label">Toggle Panel</span>
                      <input type="text" class="shortcut-key" id="sc-panel" readonly placeholder="—"/>
                    </div>
                    <div class="shortcut-row">
                      <span class="shortcut-label">Element</span>
                      <input type="text" class="shortcut-key" id="sc-element" readonly placeholder="—"/>
                    </div>
                    <div class="shortcut-row">
                      <span class="shortcut-label">Area</span>
                      <input type="text" class="shortcut-key" id="sc-area" readonly placeholder="—"/>
                    </div>
                    <div class="shortcut-row">
                      <span class="shortcut-label">Screen</span>
                      <input type="text" class="shortcut-key" id="sc-screen" readonly placeholder="—"/>
                    </div>
                    <div class="shortcut-row">
                      <span class="shortcut-label">Page</span>
                      <input type="text" class="shortcut-key" id="sc-page" readonly placeholder="—"/>
                    </div>
                  </div>
                </div>

                <a href="https://buymeacoffee.com/panat.siriwong" target="_blank" class="bmc-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 17H16C17.6569 17 19 15.6569 19 14V12H21V7H19V4H5V7H3V12H5V14C5 15.6569 6.34315 17 8 17ZM7 4H17V12H7V4ZM3 9H5V10H3V9ZM19 10V9H21V10H19ZM16 19H8V21H16V19Z" fill="currentColor"/>
                  </svg>
                  <span>Buy me a coffee</span>
                </a>
              </div>
            </main>
          </div>

        </div>
      </div>
    </div>
  `;

  // ─── Create Shadow DOM host ───────────────────────────────────────────────
  const host = document.createElement('div');
  host.id = PANEL_HOST_ID;
  Object.assign(host.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '2147483647',
    width: '340px',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)',
  });

  const shadow = host.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = PANEL_CSS;

  const tmp = document.createElement('div');
  tmp.innerHTML = PANEL_HTML;

  shadow.appendChild(styleEl);
  shadow.appendChild(tmp.firstElementChild);

  document.documentElement.appendChild(host);

  // ─── DOM References ───────────────────────────────────────────────────────
  const $  = (id)  => shadow.getElementById(id);
  const $$ = (sel) => shadow.querySelectorAll(sel);

  const captureBtn        = $('captureBtn');
  const btnLabel          = $('btnLabel');
  const statusPill        = $('statusPill');
  const captureViewportBtn = $('captureViewportBtn');
  const captureFullPageBtn = $('captureFullPageBtn');
  const captureRegionBtn  = $('captureRegionBtn');
  const qualityInput      = $('qualityInput');
  const qualityValue      = $('qualityValue');
  const delayInput        = $('delayInput');
  const delayValue        = $('delayValue');
  const fullCaptureCheckbox = $('fullCaptureCheckbox');
  const debugModeCheckbox = $('debugModeCheckbox');
  const outputModeRadios  = $$('input[name="outputMode"]');
  const historyBtn        = $('historyBtn');
  const showPreviewCheckbox = $('showPreviewCheckbox');
  const formatRadios      = $$('input[name="format"]');
  const viewsWrapper      = $('viewsWrapper');
  const settingsBtn       = $('settingsBtn');
  const backBtn           = $('backBtn');
  const homeView          = $('homeView');
  const settingsView      = $('settingsView');
  const closeBtn          = $('closeBtn');
  const dragHandle        = $('dragHandle');
  const settingsDragHandle = $('settingsDragHandle');
  const panelRoot         = shadow.querySelector('.panel-root');

  // ─── State ────────────────────────────────────────────────────────────────
  let currentState = 'idle';
  let restorePanelAfterCapture = false;

  const STATE_CONFIG = {
    idle:      { btn: 'Select Element',   pill: 'idle',      msg: 'Ready'      },
    selecting: { btn: 'Cancel Selection', pill: 'selecting', msg: 'Selecting'  },
    capturing: { btn: 'Capturing...',     pill: 'capturing', msg: 'Processing' },
    success:   { btn: 'Select Element',   pill: 'success',   msg: 'Saved'      },
    error:     { btn: 'Retry',            pill: 'error',     msg: 'Error'      },
  };

  // ─── UI helpers ───────────────────────────────────────────────────────────
  function showPanel() { host.style.display = 'block'; }
  function hidePanel() { host.style.display = 'none'; }

  function updateUI(state, message) {
    currentState = state;
    const config = STATE_CONFIG[state];

    captureBtn.setAttribute('data-state', state);
    if (state !== 'capturing') btnLabel.textContent = config.btn;
    captureBtn.disabled = (state === 'capturing');

    statusPill.classList.remove('idle', 'selecting', 'capturing', 'success', 'error');
    statusPill.classList.add(config.pill);

    if (state === 'success') {
      setTimeout(() => updateUI('idle'), 2000);
    } else if (state === 'error') {
      setTimeout(() => updateUI('idle'), 3000);
    }
  }

  function resizeToView(view) {
    const isHidden = view === settingsView && !viewsWrapper.classList.contains('settings-open');
    if (isHidden) {
      view.style.visibility = 'hidden';
      view.style.transform  = 'translateX(0)';
    }

    const targetHeight = view.scrollHeight;

    if (isHidden) {
      view.style.visibility = '';
      view.style.transform  = '';
    }

    panelRoot.style.height   = targetHeight + 'px';
    viewsWrapper.style.height = targetHeight + 'px';
  }

  // ─── Settings ─────────────────────────────────────────────────────────────
  function updateQualityDisplay(value) {
    qualityValue.textContent = `${value}%`;
    qualityInput.style.setProperty('--val', `${value}%`);
  }

  function updateDelayDisplay(value) {
    delayValue.textContent = Number(value) === 0 ? 'Off' : `${value}s`;
    delayInput.style.setProperty('--val', `${(value / 10) * 100}%`);
  }

  function updateQualityState() {
    const selected = shadow.querySelector('input[name="format"]:checked')?.value || 'png';
    $('qualityGroup').style.display = selected === 'png' ? 'none' : 'flex';
  }

  async function loadSettings() {
    const s = await chrome.storage.local.get(['format', 'quality', 'delay', 'fullCapture', 'debugMode', 'outputMode', 'copyToClipboard', 'showPreview']);

    if (s.format) {
      const radio = shadow.querySelector(`input[name="format"][value="${s.format}"]`);
      if (radio) radio.checked = true;
    }
    if (s.quality) {
      qualityInput.value = s.quality;
      updateQualityDisplay(s.quality);
    }
    if (s.delay !== undefined) {
      delayInput.value = s.delay;
      updateDelayDisplay(s.delay);
    }
    if (s.fullCapture !== undefined)  fullCaptureCheckbox.checked = s.fullCapture;
    if (s.debugMode   !== undefined)  debugModeCheckbox.checked   = s.debugMode;

    // outputMode is the source of truth once set; migrate from the old
    // copyToClipboard boolean for installs that predate the 3-way mode.
    // "Copy as Prompt" is opt-in only — never auto-selected on migration.
    const outputMode = s.outputMode || (s.copyToClipboard === false ? 'download' : 'copyImage');
    const modeRadio = shadow.querySelector(`input[name="outputMode"][value="${outputMode}"]`);
    if (modeRadio) modeRadio.checked = true;

    showPreviewCheckbox.checked = s.showPreview ?? true;
  }

  async function saveSettings() {
    const selected = shadow.querySelector('input[name="format"]:checked').value;
    const outputMode = shadow.querySelector('input[name="outputMode"]:checked').value;
    updateQualityState();
    if (viewsWrapper.classList.contains('settings-open')) resizeToView(settingsView);

    await chrome.storage.local.set({
      format:          selected,
      quality:         parseInt(qualityInput.value),
      delay:           parseInt(delayInput.value),
      fullCapture:     fullCaptureCheckbox.checked,
      debugMode:       debugModeCheckbox.checked,
      outputMode:      outputMode,
      showPreview:     showPreviewCheckbox.checked,
    });
  }

  // ─── Shortcuts ────────────────────────────────────────────────────────────
  const SC_ACTIONS = ['panel', 'element', 'area', 'screen', 'page'];
  const isMac = /Mac/i.test(navigator.userAgent);
  const SC_DEFAULTS = isMac ? {
    panel:   'Shift+Cmd+E',
    element: 'Shift+Cmd+Y',
    area:    'Shift+Cmd+U',
    screen:  'Shift+Cmd+S',
    page:    'Shift+Cmd+O',
  } : {
    panel:   'Alt+Shift+E',
    element: 'Alt+Shift+Y',
    area:    'Alt+Shift+U',
    screen:  'Alt+Shift+S',
    page:    'Alt+Shift+O',
  };
  let isRecordingShortcut = false;

  function formatCombo(e) {
    const mods = [];
    if (e.ctrlKey)  mods.push('Ctrl');
    if (e.altKey)   mods.push(isMac ? 'Option' : 'Alt');
    if (e.shiftKey) mods.push('Shift');
    if (e.metaKey)  mods.push(isMac ? 'Cmd' : 'Meta');
    const key = e.key;
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) return '';
    mods.push(key.length === 1 ? key.toUpperCase() : key);
    return mods.join('+');
  }

  async function loadShortcuts() {
    let { shortcuts, shortcutsEnabled } = await chrome.storage.local.get(['shortcuts', 'shortcutsEnabled']);
    if (!shortcuts) {
      shortcuts = { ...SC_DEFAULTS };
      await chrome.storage.local.set({ shortcuts });
    }
    if (shortcutsEnabled === undefined) {
      await chrome.storage.local.set({ shortcutsEnabled: true });
      shortcutsEnabled = true;
    }
    SC_ACTIONS.forEach(action => {
      const el = $(`sc-${action}`);
      if (el) el.value = shortcuts[action] ?? '';
    });
    const scEnabled = $('sc-enabled');
    if (scEnabled) scEnabled.checked = shortcutsEnabled;
  }

  async function saveShortcuts() {
    const shortcuts = {};
    SC_ACTIONS.forEach(action => {
      const el = $(`sc-${action}`);
      if (el) shortcuts[action] = el.value;
    });
    await chrome.storage.local.set({ shortcuts });
  }

  SC_ACTIONS.forEach(action => {
    const input = $(`sc-${action}`);
    if (!input) return;

    input.addEventListener('focus', () => { isRecordingShortcut = true; });
    input.addEventListener('blur',  () => { isRecordingShortcut = false; });

    input.addEventListener('click', () => {
      input.value = '';
      input.placeholder = 'Press keys…';
      input.classList.add('recording');
      input.focus();
    });

    input.addEventListener('keydown', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        input.classList.remove('recording');
        input.placeholder = '—';
        loadShortcuts();
        input.blur();
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        input.value = '';
        input.classList.remove('recording');
        input.placeholder = '—';
        saveShortcuts();
        input.blur();
        return;
      }

      const combo = formatCombo(e);
      if (combo) {
        input.value = combo;
        input.classList.remove('recording');
        input.placeholder = '—';
        saveShortcuts();
        input.blur();
      }
    });

    input.addEventListener('blur', () => {
      input.classList.remove('recording');
      if (!input.value) input.placeholder = '—';
    });
  });

  // Enable toggle
  $('sc-enabled').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ shortcutsEnabled: e.target.checked });
  });

  // Reset button
  $('scResetBtn').addEventListener('click', async () => {
    await chrome.storage.local.set({ shortcuts: { ...SC_DEFAULTS } });
    await loadShortcuts();
  });

  // Global keyboard shortcut listener
  document.addEventListener('keydown', async (e) => {
    if (isRecordingShortcut) return;

    const combo = formatCombo(e);
    if (!combo) return;

    const { shortcuts = {}, shortcutsEnabled } = await chrome.storage.local.get(['shortcuts', 'shortcutsEnabled']);
    if (shortcutsEnabled === false) return;
    const resolved = { ...SC_DEFAULTS, ...shortcuts };

    for (const [action, shortcut] of Object.entries(resolved)) {
      if (!shortcut || shortcut !== combo) continue;
      e.preventDefault();
      switch (action) {
        case 'panel':
          if (host.style.display === 'none') showPanel(); else hidePanel();
          break;
        case 'element':
          restorePanelAfterCapture = true;
          showPanel();
          updateUI('selecting');
          if (typeof elementSelector !== 'undefined') elementSelector.start();
          break;
        case 'area':
          restorePanelAfterCapture = true;
          updateUI('selecting', 'Select area');
          hidePanel();
          if (typeof regionSelector !== 'undefined') regionSelector.start();
          break;
        case 'screen':
          restorePanelAfterCapture = false;
          updateUI('capturing', 'Capturing viewport');
          if (typeof handleViewportCapture === 'function') handleViewportCapture();
          break;
        case 'page':
          restorePanelAfterCapture = false;
          updateUI('capturing', 'Capturing full page');
          if (typeof handleFullPageCapture === 'function') handleFullPageCapture();
          break;
      }
      break;
    }
  });

  // ─── Initialize ───────────────────────────────────────────────────────────
  (async () => {
    await loadSettings();
    await loadShortcuts();
    updateQualityState();
    resizeToView(homeView);

    // Sync UI with any in-progress selection
    try {
      const isSelecting = typeof elementSelector !== 'undefined' && elementSelector.isSelecting();
      const isRegion    = typeof regionSelector   !== 'undefined' && regionSelector.isSelecting();
      updateUI((isSelecting || isRegion) ? 'selecting' : 'idle');
    } catch (_) {
      updateUI('idle');
    }
  })();

  // ─── Event Listeners ──────────────────────────────────────────────────────

  // Primary capture button: start/cancel element selection
  captureBtn.addEventListener('click', () => {
    if (currentState === 'idle' || currentState === 'success' || currentState === 'error') {
      restorePanelAfterCapture = true;
      updateUI('selecting');
      hidePanel();
      if (typeof elementSelector !== 'undefined') elementSelector.start();
    } else if (currentState === 'selecting') {
      restorePanelAfterCapture = false;
      if (typeof elementSelector !== 'undefined') elementSelector.stop();
      if (typeof regionSelector  !== 'undefined') regionSelector.stop();
      showPanel();
      updateUI('idle');
    }
  });

  // Viewport capture — hide panel before capturing so it doesn't appear in the screenshot
  captureViewportBtn.addEventListener('click', () => {
    restorePanelAfterCapture = true;
    updateUI('capturing', 'Capturing viewport');
    hidePanel();
    if (typeof handleViewportCapture === 'function') handleViewportCapture();
  });

  // Full page capture — hide panel before capturing so it doesn't appear in the screenshot
  captureFullPageBtn.addEventListener('click', () => {
    restorePanelAfterCapture = true;
    updateUI('capturing', 'Capturing full page');
    hidePanel();
    if (typeof handleFullPageCapture === 'function') handleFullPageCapture();
  });

  // Region selection — hide panel while drawing
  captureRegionBtn.addEventListener('click', () => {
    restorePanelAfterCapture = true;
    updateUI('selecting', 'Select area');
    hidePanel();
    if (typeof regionSelector !== 'undefined') regionSelector.start();
  });

  // Settings / Back navigation
  settingsBtn.addEventListener('click', () => {
    viewsWrapper.classList.add('settings-open');
    resizeToView(settingsView);
  });

  backBtn.addEventListener('click', () => {
    viewsWrapper.classList.remove('settings-open');
    resizeToView(homeView);
  });

  // Close button (home view)
  closeBtn.addEventListener('click', () => hidePanel());

  // Close button (settings view)
  $('settingsCloseBtn').addEventListener('click', () => hidePanel());

  // Format radios
  formatRadios.forEach(r => r.addEventListener('change', saveSettings));

  // Quality slider
  qualityInput.addEventListener('input',  (e) => updateQualityDisplay(e.target.value));
  qualityInput.addEventListener('change', saveSettings);

  // Delay slider
  delayInput.addEventListener('input',  (e) => updateDelayDisplay(e.target.value));
  delayInput.addEventListener('change', saveSettings);

  // Checkboxes
  fullCaptureCheckbox.addEventListener('change', saveSettings);
  debugModeCheckbox.addEventListener('change', saveSettings);
  outputModeRadios.forEach(r => r.addEventListener('change', saveSettings));
  showPreviewCheckbox.addEventListener('change', saveSettings);

  // History link — hide the panel while the modal is up so it doesn't sit on
  // top of the image (both hosts are at z-index max int; later DOM order wins,
  // and the panel host is later). preview.js dispatches modal-closed when the
  // user dismisses it; we restore the panel only if we were the ones who hid it.
  let panelHiddenForHistory = false;
  historyBtn.addEventListener('click', () => {
    if (typeof window.elementSnapperPreview === 'undefined') return;
    if (host.style.display !== 'none') {
      panelHiddenForHistory = true;
      hidePanel();
    }
    window.elementSnapperPreview.openHistory();
  });
  document.addEventListener('element-snapper:modal-closed', () => {
    if (panelHiddenForHistory) {
      panelHiddenForHistory = false;
      showPanel();
    }
  });

  // ─── Chrome message listener ──────────────────────────────────────────────
  // Receives notifications relayed from the service worker and togglePanel from service worker.
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.action) {
      case 'togglePanel':
        if (host.style.display === 'none') showPanel(); else hidePanel();
        sendResponse({ success: true });
        return false;

      case 'captureStarted':
        updateUI('capturing');
        // Every capture path (element/region/viewport/full page) broadcasts
        // this before it shoots — clear anything left over from a previous
        // capture (stale toast, stale preview thumbnail/modal) so it can't
        // leak into the new screenshot.
        document.getElementById('element-screenshot-notification')?.remove();
        window.elementSnapperPreview?.hideForCapture();
        break;

      case 'captureSuccess':
        if (restorePanelAfterCapture) showPanel();
        restorePanelAfterCapture = false;
        updateUI('success');
        // preview.show() also restores this, but only runs when a captureId
        // came back (showPreview setting on) — restore unconditionally here
        // too, or a success with showPreview off leaves the host (and its
        // own toast/modal) hidden for the rest of the tab's lifetime.
        window.elementSnapperPreview?.restoreAfterCapture();
        if (typeof showNotification === 'function') {
          showNotification(message.message || 'Screenshot captured successfully', 'success');
        }
        break;

      case 'captureError':
        if (restorePanelAfterCapture) showPanel();
        restorePanelAfterCapture = false;
        updateUI('error', message.error);
        window.elementSnapperPreview?.restoreAfterCapture();
        if (typeof showNotification === 'function') {
          showNotification(message.error || 'Capture failed', 'error');
        }
        break;

      case 'selectionCancelled':
        showPanel();
        updateUI('idle');
        window.elementSnapperPreview?.restoreAfterCapture();
        break;
    }
  });

  // ─── Drag ────────────────────────────────────────────────────────────────
  let isDragging  = false;
  let dragStartX  = 0, dragStartY  = 0;
  let panelStartL = 0, panelStartT = 0;

  function onDragHandleMouseDown(e) {
    // Don't initiate drag on clickable controls inside the header
    if (e.target.closest('.icon-btn') || e.target.closest('a')) return;
    isDragging  = true;
    dragStartX  = e.clientX;
    dragStartY  = e.clientY;
    const rect  = host.getBoundingClientRect();
    panelStartL = rect.left;
    panelStartT = rect.top;
    e.preventDefault();
  }

  dragHandle.addEventListener('mousedown', onDragHandleMouseDown);
  settingsDragHandle.addEventListener('mousedown', onDragHandleMouseDown);

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const newLeft = Math.max(0, Math.min(window.innerWidth  - 340, panelStartL + (e.clientX - dragStartX)));
    const newTop  = Math.max(0, Math.min(window.innerHeight -  60, panelStartT + (e.clientY - dragStartY)));
    host.style.left  = newLeft + 'px';
    host.style.top   = newTop  + 'px';
    host.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => { isDragging = false; });
})();
