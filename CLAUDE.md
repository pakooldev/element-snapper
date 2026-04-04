# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Element Snapper is a **Chrome browser extension** (Manifest V3) that captures pixel-perfect screenshots of webpage elements. It supports single elements, full-page captures, viewport screenshots, region (click-and-drag) selection, clipboard output, and delayed capture.

Current version: v1.2.3. Published on Chrome Web Store.

## Development

No build step required for the core extension. Load directly in Chrome:
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory

After any code change, click the refresh icon on the extension card in `chrome://extensions`. The service worker can be inspected via "Inspect views: service worker" on the extension card.

`test-full-capture.html` is a standalone HTML page for manually testing full-element capture locally.

## Promo Video (`promo-video/`)

React + Remotion project for generating the Chrome Web Store assets.

```bash
cd promo-video
npm install
npm start                  # Open Remotion Studio
npm run build              # Render promo video → out/video.mp4
npm run build:screenshots  # Render all 5 store screenshots
```

Compositions defined in `src/Root.tsx`: one `1920×1080` promo video (`ElementSnapperPromo`, ~24s at 30fps) and five `1280×800` static screenshots (`Screenshot1Hero`, `Screenshot2Scroll`, `Screenshot3Settings`, `Screenshot4Clipboard`, `StorePromoTile` at `440×280`).

## Architecture

The extension has three isolated layers. Content scripts are **not** declared in `manifest.json` — they are injected on demand by the popup via `chrome.scripting.executeScript` (requires `activeTab` + `scripting` permissions).

```
popup/popup.html + popup.js
  → chrome.scripting.executeScript() → injects content scripts if not present
  → chrome.tabs.sendMessage()        → content/content-main.js
  → chrome.runtime.sendMessage()     → background/service_worker.js
```

### Popup (`popup/`)

`popup.js` manages a state machine (`idle → selecting → capturing → success/error`) and two sliding views (Home and Settings). The body height animates to fit the active view.

- **Home view**: primary "Select Element" button, three quick-action buttons (Screen Shot, Full Page, Select Area), Clipboard toggle
- **Settings view**: Format (PNG/JPG), Quality slider, Delay slider (0–10s), Scroll Element toggle
- Settings are persisted via `chrome.storage.local` on every change
- The popup closes immediately after triggering element/region selection so the user can interact with the page

> **Note**: `manifest.json` currently does not declare a `default_popup` under `"action"` — the popup is in flux. Check `manifest.json` before assuming how the popup is opened.

### Content Scripts (`content/`)

Loaded in order: `utils.js` → `element_selector.js` → `region_selector.js` → `content-main.js`

- **`content-main.js`**: Global message handler and orchestrator. Manages capture flows for all modes (element, viewport, full-page, region). Handles delay countdown UI, toast notifications, and scroll-lock/restore during multi-tile capture.
- **`element_selector.js`**: `ElementSelector` class — fixed-position overlay that highlights hovered elements. Highlight turns blue→indigo when the element exceeds the viewport height (signals fullCapture mode will be needed).
- **`region_selector.js`**: `RegionSelector` class — full-screen semi-transparent overlay for click-and-drag area selection. Shows live pixel dimensions. Sends `captureRegion` message with the selected rect on mouse up.
- **`utils.js`**: Pure DOM helpers — `getElementRect`, `getScrollOffsets`, `getDocumentDimensions`, `scrollIntoView`, `isCrossOriginIframe`.
- **`panel.js`** *(in progress, untracked)*: Floating in-page panel injected directly into the page using Shadow DOM for CSS isolation. Toggles visibility if already present. Alternative to the popup for a persistent, non-closing UI.

### Service Worker (`background/service_worker.js`)

Handles `captureElement`, `captureViewportOrPage`, and `captureRegion` messages.

- **DPR-aware cropping**: All canvas math multiplies coordinates by `devicePixelRatio` to support Retina/HiDPI displays without blur.
- **Multi-tile stitching**: For elements larger than the viewport, scrolls in a grid pattern, captures each tile via `chrome.tabs.captureVisibleTab()`, stitches onto a single canvas. Enforces a 600ms inter-tile delay (Chrome API rate limit).
- Output is converted to PNG or JPEG, then either downloaded via `chrome.downloads.download()` or copied to clipboard via the Clipboard API.

### Key Constraints

- Max canvas size: 16,384px per dimension (browser hard limit)
- Full-page capture rate-limited to ~2 captures/second
- Cannot capture cross-origin iframes or Chrome system pages (`chrome://`, Web Store)

## Storage Schema

`chrome.storage.local` keys:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `format` | `'png'`\|`'jpg'` | `'png'` | Output format |
| `quality` | 1–100 | `95` | JPEG quality (ignored for PNG) |
| `delay` | 0–10 | `0` | Capture delay in seconds |
| `fullCapture` | boolean | `false` | Scroll element to capture beyond viewport |
| `copyToClipboard` | boolean | `true` | Copy to clipboard instead of download |
| `debugMode` | boolean | `false` | Hidden dev flag, not shown in settings UI |

## Website (`website/`)

Static site at https://element-snapper.pakool.com/ — no build step. Three pages: `index.html` (landing), `releases.html` (changelog), `privacy.html`. The changelog is data-driven: `releases.js` fetches `data/releases.json` and renders cards at runtime. To add a release, append an entry to `data/releases.json`.
