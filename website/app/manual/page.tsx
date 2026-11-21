import type { Metadata } from "next";
import { RealPanel } from "@/components/real-panel";
import panel from "@/generated/panel-ui.json";

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
  ["C", "Close", <>Closes the panel.</>],
  [
    "D",
    "Select Element",
    <>
      Click, then hover any element on the page to capture it. The panel hides so you can interact
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

const HOME_BADGES = {
  "#statusPill": "A",
  "#settingsBtn": "B",
  "#closeBtn": "C",
  "#captureBtn": "D",
  "#captureRegionBtn": "E",
  "#captureViewportBtn": "F",
  "#captureFullPageBtn": "G",
  "#homeView .setting-group": "H",
  "#historyBtn": "I",
  "#editsBtn": "J",
};

const SETTINGS_BADGES = {
  "#backBtn": "A",
  '#settingsView a.icon-btn': "B",
  "#settingsView .setting-group:has(#fmt-png)": "C",
  ".setting-row:has(#delayInput)": "D",
  ".switch-row:has(#fullCaptureCheckbox)": "E",
  ".switch-row:has(#showPreviewCheckbox)": "F",
  "label:has(#sc-enabled)": "G",
};

// The state a new install starts in. On Windows and Linux the shortcuts use Alt instead of Cmd.
const SETTINGS_FIELDS = {
  showPreviewCheckbox: true,
  "sc-enabled": true,
  ...Object.fromEntries(Object.entries(panel.shortcuts).map(([name, keys]) => [`sc-${name}`, keys])),
} as Record<string, string | true>;

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
    <>Images can be up to 16,384 pixels each way, a browser limit. Anything larger is scaled down to fit.</>,
  ],
  [
    "⬆️",
    "Step to the Parent",
    <>
      While selecting, press <kbd>↑</kbd> to highlight the element around the one under the
      pointer, and <kbd>↓</kbd> to go back. It reaches boxes that their child fills completely.
    </>,
  ],
  [
    "💾",
    "Where Edits Are Kept",
    <>
      My edits are stored in this browser on this computer, until you delete them. They are not
      synced or uploaded anywhere.
    </>,
  ],
  [
    "🔒",
    "Limitations",
    <>
      Cannot select elements inside iframes, or capture Chrome system pages (<code>chrome://</code>).
    </>,
  ],
] as const;

// The editor's tools, keyed by their shortcut letter.
const EDITOR_TOOLS = [
  ["V", "Select", <>Click an item to move it, resize it from its handles, restyle or delete it.</>],
  ["H", "Hand", <>Move the board around. Holding <kbd>Space</kbd> or scrolling does the same.</>],
  ["C", "Crop", <>Drag to set the frame. Only what is inside the frame is copied or downloaded.</>],
  ["R", "Box", <>Draw a rectangle around something. It is picked only on its line, so what it surrounds stays clickable.</>],
  ["A", "Arrow", <>Drag from the tail to the tip.</>],
  ["T", "Text", <>Click where the text goes and type. Double-click text to change it.</>],
  ["B", "Blur", <>Pixelates whatever is under the area you drag, such as emails or names.</>],
  ["X", "Redact", <>Covers the area you drag with solid black.</>],
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
          <p className="manual-subtitle">Learn how to use Element Snapper in four simple steps.</p>
        </div>

        {/* Step 1: Opening the Extension */}
        <div className="manual-step glass-panel">
          <div className="step-number">1</div>
          <h2 className="step-title">Open the Extension</h2>
          <p className="step-desc">
            Click the Element Snapper icon in the Chrome toolbar to open the panel.
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
                <RealPanel inert badges={HOME_BADGES} />
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

              <LegendItem badge="I" title="View History">
                <span>
                  Reopen the preview for any capture made this browsing session — redownload,
                  re-copy or <strong>Edit</strong> it, remove a single capture, or use{" "}
                  <strong>Remove All</strong> to clear the whole list.
                </span>
              </LegendItem>

              <LegendItem badge="J" title="My edits">
                <span>
                  Opens every capture you have edited, newest first. Click one to keep editing it,
                  or delete it from its card.
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
                <RealPanel inert view="settings" badges={SETTINGS_BADGES} fields={SETTINGS_FIELDS} />
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

        {/* Step 4: Editing a capture */}
        <div className="manual-step glass-panel">
          <div className="step-number">4</div>
          <h2 className="step-title">Edit Before Sharing</h2>
          <p className="step-desc">
            Press <strong>Edit</strong> on a capture&apos;s preview (or in View history) to open it in
            the editor. Pick a tool from the bar or press its letter, then choose the color (8
            presets or any color), size and line style for it. Paste (<kbd>⌘V</kbd>), drop or add
            more images with the <strong>Image</strong> button to put them together. Zoom with{" "}
            <kbd>⌘</kbd> + scroll or a pinch, undo with <kbd>⌘Z</kbd>, then <strong>Copy</strong> or{" "}
            <strong>Download</strong>.
          </p>

          <div className="labeled-diagram">
            <img
              className="manual-shot"
              src="/manual/editor.jpg"
              width={1280}
              height={720}
              loading="lazy"
              alt="The editor with a list of customers: emails blurred, a red box around a Trial label and an arrow pointing to it"
            />

            <div className="legend-grid">
              {EDITOR_TOOLS.map(([key, title, body]) => (
                <LegendItem key={key} badge={key} title={title}>
                  <span>{body}</span>
                </LegendItem>
              ))}
              <LegendItem badge="✓" title="Saved as you go" fullWidth>
                <span>
                  The first change saves the capture to <strong>My edits</strong>, and every change
                  after that is saved too. Pressing Edit on the same capture again opens your edit
                  instead of starting over.
                </span>
              </LegendItem>
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
