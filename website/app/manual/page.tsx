import type { Metadata } from "next";
import Link from "next/link";
import { PopupLogo } from "@/components/logo";

export const metadata: Metadata = {
  title: "User Manual",
  description:
    "Complete user manual for the Element Snapper Chrome Extension. Learn how to capture pixel-perfect screenshots step by step.",
};

const STATUS_STATES = [
  ["is-idle", "Idle — ready to capture"],
  ["is-selecting", "Selecting element"],
  ["is-capturing", "Capturing / processing"],
  ["is-success", "Capture saved"],
  ["is-error", "Error occurred"],
] as const;

const HOME_LEGEND = [
  ["B", "Settings", <>Opens the settings panel to configure format, delay, and scroll capture.</>],
  ["C", "Close", <>Closes the popup panel.</>],
  [
    "D",
    "Select Element",
    <>
      Click, then hover any element on the page to capture it. The popup closes so you can interact
      with the page.
    </>,
  ],
  ["E", "Area", <>Click and drag a rectangle on the page to capture a custom region.</>],
  ["F", "Screen", <>Instantly captures the currently visible viewport.</>],
  ["G", "Page", <>Captures the entire scrollable page by stitching multiple tiles.</>],
  [
    "H",
    "Output Mode",
    <>
      <strong>Download</strong> saves a file, <strong>Copy Image</strong> copies the screenshot to
      your clipboard, and <strong>Copy as Prompt</strong> (element capture only) skips the
      screenshot entirely and copies a text description of the selected element instead — tag,
      selector, dimensions, text content, key styles, HTML, and DOM path.
    </>,
  ],
] as const;

const SETTINGS_LEGEND = [
  ["A", "Back Button", <>Return to the home panel.</>],
  [
    "B",
    "How It Works",
    <>Opens the How It Works guide on the website — explains each capture mode in detail.</>,
  ],
  ["C", "Format", <>Choose between PNG (lossless) or JPG (smaller file size).</>],
  [
    "D",
    "Delay",
    <>
      Set a countdown (Off, or 1–10s) before capture. Perfect for capturing hover states and
      dropdown menus.
    </>,
  ],
  [
    "E",
    "Scroll Element",
    <>When ON, auto-scrolls and stitches tiles to capture content beyond the viewport.</>,
  ],
  [
    "F",
    "Preview Captures",
    <>
      When ON (default), shows a floating thumbnail preview after each capture, with quick access to
      the capture history.
    </>,
  ],
  [
    "G",
    "Shortcuts",
    <>
      Built-in hotkeys for every capture action. Toggle them on/off, hit Reset to restore defaults,
      or click any key to re-record it.
    </>,
  ],
] as const;

const SHORTCUTS = [
  ["Toggle Panel", "Shift+Cmd+E"],
  ["Element", "Shift+Cmd+Y"],
  ["Area", "Shift+Cmd+U"],
  ["Screen", "Shift+Cmd+S"],
  ["Page", "Shift+Cmd+O"],
] as const;

const TIPS = [
  [
    "⌨️",
    "Custom Shortcuts",
    <>
      Open Settings and find the Shortcuts section. Click any key combo to re-record it with your
      preferred hotkey.
    </>,
  ],
  [
    "⎋",
    "Cancel Anytime",
    <>
      Press <kbd>Esc</kbd> to cancel any active selection mode and return to idle.
    </>,
  ],
  [
    "📐",
    "Max Capture Size",
    <>The maximum capture size is 16,384 × 16,384 pixels — a browser hard limit.</>,
  ],
  [
    "🔒",
    "Limitations",
    <>
      Cannot capture cross-origin iframes or Chrome system pages (<code>chrome://</code>).
    </>,
  ],
] as const;

function LegendItem({
  badge,
  title,
  children,
  fullWidth,
}: {
  badge: string;
  title: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className="legend-item" style={fullWidth ? { gridColumn: "1 / -1" } : undefined}>
      <span className="legend-badge">{badge}</span>
      <div className="legend-text">
        <strong>{title}</strong>
        {children}
      </div>
    </div>
  );
}

export default function Manual() {
  return (
    <section className="manual-section">
      <div className="container">
        <div className="manual-header">
          <h1 className="manual-title">
            User <span className="text-gradient">Manual</span>
          </h1>
          <p className="manual-subtitle">Learn how to use Element Snapper in three simple steps.</p>
        </div>

        {/* Step 1: Opening the Extension */}
        <div className="manual-step glass-panel">
          <div className="step-number">1</div>
          <h2 className="step-title">Open the Extension</h2>
          <p className="step-desc">
            Click the Element Snapper icon in the Chrome toolbar to open the popup panel.
          </p>

          <div className="step-visual">
            <svg viewBox="0 0 700 96" className="toolbar-svg" xmlns="http://www.w3.org/2000/svg">
              {/* Chrome toolbar background */}
              <rect x="0" y="0" width="700" height="56" rx="8" fill="#1e293b" />

              {/* Tab shape */}
              <rect x="16" y="8" width="180" height="36" rx="8" fill="#0f172a" />
              <circle cx="32" cy="26" r="6" fill="#3b82f6" opacity="0.5" />
              <text x="46" y="30" fill="#94a3b8" fontSize="12" fontFamily="Inter, sans-serif">
                My Webpage
              </text>
              <text x="180" y="30" fill="#64748b" fontSize="14" fontFamily="Inter, sans-serif">
                ×
              </text>

              {/* URL bar */}
              <rect x="210" y="12" width="320" height="32" rx="16" fill="#0f172a" />
              <text x="240" y="33" fill="#64748b" fontSize="12" fontFamily="monospace">
                https://example.com
              </text>

              {/* Other extension icons (dimmed) */}
              <rect x="556" y="16" width="24" height="24" rx="4" fill="#334155" />
              <rect x="588" y="16" width="24" height="24" rx="4" fill="#334155" />

              {/* Element Snapper icon (actual logo) */}
              <rect x="620" y="14" width="28" height="28" rx="6" fill="#0f172a" className="toolbar-ext-icon" />
              <g transform="translate(620,14)">
                <rect x="4" y="4" width="20" height="20" rx="3" stroke="white" strokeWidth="1.2" strokeDasharray="3 1.5" fill="none" opacity="0.25" />
                <path d="M4 9V6.5C4 5.12 5.12 4 6.5 4H9" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                <path d="M24 9V6.5C24 5.12 22.88 4 21.5 4H19" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                <path d="M4 19V21.5C4 22.88 5.12 24 6.5 24H9" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                <path d="M24 19V21.5C24 22.88 22.88 24 21.5 24H19" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                <circle cx="14" cy="14" r="4.5" fill="#3b82f6" />
                <circle cx="14" cy="14" r="2" fill="#0f172a" />
              </g>

              {/* Highlight glow + pulsating ring around the icon */}
              <rect x="616" y="10" width="36" height="36" rx="9" fill="#3b82f6" className="pulse-glow" />
              <rect x="618" y="12" width="32" height="32" rx="8" fill="none" stroke="#3b82f6" strokeWidth="2" className="pulse-ring" />

              {/* Arrow pointing to the icon */}
              <line x1="634" y1="56" x2="634" y2="68" stroke="#3b82f6" strokeWidth="2" />
              <polygon points="629,68 639,68 634,75" fill="#3b82f6" />
              <text x="634" y="88" fill="#3b82f6" fontSize="12" fontWeight="600" fontFamily="Inter, sans-serif" textAnchor="middle">
                Click to open
              </text>
            </svg>
          </div>
        </div>

        {/* Step 2: Home Panel */}
        <div className="manual-step glass-panel">
          <div className="step-number">2</div>
          <h2 className="step-title">Home Panel</h2>
          <p className="step-desc">
            The home panel is your main control center. Here&apos;s what each button does:
          </p>

          <div className="labeled-diagram">
            <div className="diagram-popup">
              <div className="manual-popup">
                <div className="mp-header">
                  <div className="mp-brand">
                    {PopupLogo}
                    <span className="mp-title">Element Snapper</span>
                  </div>
                  <div className="mp-header-right">
                    <div className="mp-status">
                      <span className="mp-dot" />
                      <span className="num-badge">A</span>
                    </div>
                    <div className="mp-settings-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M10.3246 4.31731C10.751 2.5609 13.249 2.5609 13.6754 4.31731C13.9508 5.45193 15.2507 5.99038 16.2478 5.38228C17.7913 4.44105 19.5589 6.2087 18.6177 7.75218C18.0096 8.74925 18.5481 10.0492 19.6827 10.3246C21.4391 10.751 21.4391 13.249 19.6827 13.6754C18.5481 13.9508 18.0096 15.2507 18.6177 16.2478C19.5589 17.7913 17.7913 19.5589 16.2478 18.6177C15.2507 18.0096 13.9508 18.5481 13.6754 19.6827C13.249 21.4391 10.751 21.4391 10.3246 19.6827C10.0492 18.5481 8.74926 18.0096 7.75219 18.6177C6.2087 19.5589 4.44105 17.7913 5.38228 16.2478C5.99038 15.2507 5.45193 13.9508 4.31731 13.6754C2.5609 13.249 2.5609 10.751 4.31731 10.3246C5.45193 10.0492 5.99038 8.74926 5.38228 7.75219C4.44105 6.2087 6.2087 4.44105 7.75219 5.38228C8.74926 5.99038 10.0492 5.45193 10.3246 4.31731Z"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      <span className="num-badge">B</span>
                    </div>
                    <div className="mp-close-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="num-badge">C</span>
                    </div>
                  </div>
                </div>
                <div className="mp-main-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4 4H10V6H6V10H4V4ZM20 4V10H18V6H14V4H20ZM4 20V14H6V18H10V20H4ZM20 20H14V18H18V14H20V20ZM12 8C14.2 8 16 9.8 16 12C16 14.2 14.2 16 12 16C9.8 16 8 14.2 8 12C8 9.8 9.8 8 12 8Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>Select Element</span>
                  <span className="num-badge">D</span>
                </div>
                <div className="mp-actions">
                  <div className="mp-action-btn">
                    Area<span className="num-badge">E</span>
                  </div>
                  <div className="mp-action-btn">
                    Screen<span className="num-badge">F</span>
                  </div>
                  <div className="mp-action-btn">
                    Page<span className="num-badge">G</span>
                  </div>
                </div>
                <div className="mp-setting-group" style={{ position: "relative" }}>
                  <label className="mp-setting-label">Output</label>
                  <div className="mp-toggle-group mp-toggle-group-3">
                    <span className="mp-toggle-opt">Download</span>
                    <span className="mp-toggle-opt active">Copy Image</span>
                    <span className="mp-toggle-opt">Copy as Prompt</span>
                  </div>
                  <span className="num-badge" style={{ position: "absolute", top: -8, right: -8 }}>
                    H
                  </span>
                </div>
                <div className="mp-link-btn" style={{ position: "relative" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span>View history</span>
                  <span className="num-badge" style={{ position: "absolute", top: -8, right: -8 }}>
                    I
                  </span>
                </div>
              </div>
            </div>

            <div className="legend-grid">
              <LegendItem badge="A" title="Status Indicator" fullWidth>
                <span>A coloured dot showing the current state at a glance.</span>
                <div className="mp-states-row">
                  {STATUS_STATES.map(([cls, label]) => (
                    <span key={cls} className={`mp-state-pill ${cls}`}>
                      <span className="mp-dot" />
                      {label}
                    </span>
                  ))}
                </div>
              </LegendItem>

              {HOME_LEGEND.map(([badge, title, body]) => (
                <LegendItem key={badge} badge={badge} title={title}>
                  <span>{body}</span>
                </LegendItem>
              ))}

              <LegendItem badge="I" title="View History" fullWidth>
                <span>
                  Below the Output setting, click <strong>View history</strong> to reopen the
                  preview for any capture made this browsing session — redownload or re-copy it,
                  remove a single capture, or use <strong>Remove All</strong> to clear the whole
                  list.
                </span>
              </LegendItem>
            </div>
          </div>
        </div>

        {/* Step 3: Settings Panel & Keyboard Shortcuts */}
        <div className="manual-step glass-panel">
          <div className="step-number">3</div>
          <h2 className="step-title">Settings &amp; Shortcuts</h2>
          <p className="step-desc">
            Click the gear icon to open Settings. Adjust output format, delay, scroll capture, and
            configure built-in keyboard shortcuts — all in one place.
          </p>

          <div className="labeled-diagram">
            <div className="diagram-popup">
              <div className="manual-popup">
                {/* Header */}
                <div className="mp-header">
                  <div className="mp-brand">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="mp-title">Settings</span>
                    <span className="num-badge">A</span>
                  </div>
                  <div className="mp-header-right">
                    <div className="mp-info-btn">
                      <Link
                        href="/#how-it-works"
                        style={{ color: "inherit", display: "flex", alignItems: "center" }}
                        title="How it works"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                          <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </Link>
                      <span className="num-badge">B</span>
                    </div>
                    <div className="mp-close-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Format */}
                <div className="mp-setting-group">
                  <label className="mp-setting-label">Format</label>
                  <div className="mp-toggle-group">
                    <span className="mp-toggle-opt active">PNG</span>
                    <span className="mp-toggle-opt">JPG</span>
                  </div>
                  <span className="num-badge">C</span>
                </div>

                {/* Delay */}
                <div className="mp-setting-group mp-setting-row" style={{ marginTop: 12 }}>
                  <label className="mp-setting-label" style={{ marginBottom: 0 }}>
                    Delay
                  </label>
                  <div className="mp-slider-track">
                    <div className="mp-slider-fill" style={{ width: "0%" }} />
                    <div className="mp-slider-thumb" style={{ left: "0%" }} />
                  </div>
                  <span className="mp-slider-value">Off</span>
                  <span className="num-badge">D</span>
                </div>

                {/* Scroll Element */}
                <div className="mp-switch-row" style={{ marginTop: 8 }}>
                  <div className="mp-switch-info">
                    <span className="mp-switch-title">Scroll Element</span>
                    <span className="mp-switch-desc">Capture scrollable content</span>
                  </div>
                  <div className="mp-toggle">
                    <div className="mp-toggle-knob" />
                  </div>
                  <span className="num-badge">E</span>
                </div>

                {/* Preview Captures */}
                <div className="mp-switch-row" style={{ marginTop: 8 }}>
                  <div className="mp-switch-info">
                    <span className="mp-switch-title">Preview Captures</span>
                    <span className="mp-switch-desc">Show floating preview after capture</span>
                  </div>
                  <div className="mp-toggle on">
                    <div className="mp-toggle-knob" />
                  </div>
                  <span className="num-badge">F</span>
                </div>

                {/* Shortcuts section */}
                <div className="mp-setting-group mp-shortcuts-group" style={{ marginTop: 12 }}>
                  <div className="mp-shortcuts-header">
                    <label className="mp-setting-label" style={{ marginBottom: 0 }}>
                      Shortcuts
                    </label>
                    <div className="mp-shortcuts-controls">
                      <span className="mp-reset-btn">Reset</span>
                      <div style={{ position: "relative", display: "inline-flex" }}>
                        <div className="mp-toggle on">
                          <div className="mp-toggle-knob" />
                        </div>
                        <span className="num-badge" style={{ position: "absolute", top: -8, right: -8 }}>
                          G
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mp-shortcuts-list" style={{ marginTop: 6 }}>
                    {SHORTCUTS.map(([label, key]) => (
                      <div key={label} className="mp-shortcut-row">
                        <span className="mp-shortcut-label">{label}</span>
                        <span className="mp-shortcut-key">{key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="legend-grid">
              {SETTINGS_LEGEND.map(([badge, title, body]) => (
                <LegendItem key={badge} badge={badge} title={title}>
                  <span>{body}</span>
                </LegendItem>
              ))}
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="manual-tips">
          <h2 className="section-title" style={{ fontSize: "1.8rem" }}>
            Tips &amp; Notes
          </h2>
          <div className="tips-grid">
            {TIPS.map(([icon, title, body]) => (
              <div key={title} className="tip-card glass-panel">
                <div className="tip-icon">{icon}</div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
