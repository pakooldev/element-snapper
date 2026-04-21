# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Element Snapper is a **Chrome browser extension** (Manifest V3) that captures pixel-perfect screenshots of webpage elements. It supports single elements, full-page captures, viewport screenshots, region (click-and-drag) selection, clipboard output, and delayed capture.

Current version: v1.3.0. Published on Chrome Web Store.

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

The extension has three isolated layers. Content scripts are **not** declared in `manifest.json` — they are injected on demand via `chrome.scripting.executeScript` (requires `activeTab` + `scripting` permissions).

```
popup/popup.html + popup.js
  → chrome.scripting.executeScript() → injects content scripts if not present
  → chrome.tabs.sendMessage()        → content/content-main.js
  → chrome.runtime.sendMessage()     → background/service_worker.js
  → relays status back               → content/content-main.js (toast/panel updates)
```

There are two injection entry points:
- **Popup click**: injects `utils.js` → `element_selector.js` → `region_selector.js` → `content-main.js`
- **Extension icon click** (service worker `onClicked`): injects all of the above plus `panel.js`

### Popup (`popup/`)

`popup.js` manages a state machine (`idle → selecting → capturing → success/error`) and two sliding views (Home and Settings). The body height animates to fit the active view.

- **Home view**: primary "Select Element" button, three quick-action buttons (Area, Screen, Page), Clipboard toggle
- **Settings view**: Format (PNG/JPG), Quality slider, Delay slider (0–10s), Scroll Element toggle
- Settings are persisted via `chrome.storage.local` on every change
- The popup closes immediately after triggering element/region selection so the user can interact with the page

`manifest.json` does not declare a `default_popup` under `"action"` — the popup is opened via the service worker's `onClicked` handler. Check `manifest.json` before assuming how the popup is opened.

### Content Scripts (`content/`)

Load order is significant: `utils.js` → `element_selector.js` → `region_selector.js` → `content-main.js` (→ `panel.js` optional)

- **`content-main.js`**: Global message handler and orchestrator. Manages capture flows for all modes (element, viewport, full-page, region). Handles delay countdown UI, toast notifications, and scroll-lock/restore during multi-tile capture.
- **`element_selector.js`**: `ElementSelector` class — fixed-position overlay that highlights hovered elements. Highlight turns blue→indigo (dashed) when the element exceeds viewport height, signalling that fullCapture mode will be used.
- **`region_selector.js`**: `RegionSelector` class — full-screen semi-transparent overlay for click-and-drag area selection. Shows live pixel dimensions. Sends `captureRegion` message with the selected rect on mouse up.
- **`utils.js`**: Pure DOM helpers — `getElementRect`, `getScrollOffsets`, `getDocumentDimensions`, `scrollIntoView`, `isCrossOriginIframe`.
- **`panel.js`**: Floating in-page panel injected via Shadow DOM for CSS isolation. Hosts its own `STATE_CONFIG` state machine mirroring the popup's. Toggled via extension icon click; uses element ID `__element-snapper-panel-host__` to detect if already present.

### Service Worker (`background/service_worker.js`)

Handles `captureElement`, `captureViewportOrPage`, and `captureRegion` messages.

- **DPR-aware cropping**: All canvas math multiplies coordinates by `devicePixelRatio` to support Retina/HiDPI displays without blur. Content scripts report CSS pixels; the service worker converts to physical pixels.
- **Multi-tile stitching**: For elements larger than the viewport, scrolls in a grid pattern, captures each tile via `chrome.tabs.captureVisibleTab()`, stitches onto a single canvas. Enforces a 600ms inter-tile delay (Chrome API rate limit). Near page edges, the actual scroll position achieved (not the target) determines where the element region appears in the captured tile.
- **Status relay**: After capture, the service worker sends `captureSuccess`/`captureError` back to the content script in the same tab so the floating panel can update even after the popup closes.
- Output is converted to PNG or JPEG, then either downloaded via `chrome.downloads.download()` or copied to clipboard via the Clipboard API.

### Key Constraints

- Max canvas size: 16,384px per dimension (browser hard limit)
- Full-page capture rate-limited to ~2 captures/second
- Cannot capture cross-origin iframes or Chrome system pages (`chrome://`, Web Store)
- `debugMode` flag (hidden from settings UI) draws red/green tile borders during multi-tile stitching

## Message Types

| Message | Direction | Description |
|---------|-----------|-------------|
| `startSelection` | popup → content | Enable element hover highlighting |
| `startRegionSelection` | popup → content | Enable area drag selector |
| `captureElement` | content → service worker | Capture a specific DOM element |
| `captureViewportOrPage` | content → service worker | Capture viewport or full page |
| `captureRegion` | content → service worker | Capture a dragged rectangle |
| `captureStarted` / `captureSuccess` / `captureError` | service worker → content | Status relay to update panel UI |
| `selectionCancelled` | content → popup | User pressed Escape |

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

Static site at https://element-snapper.pakool.com/ — no build step. Pages: `index.html` (landing), `manual.html` (user guide), `releases.html` (changelog), `privacy.html`. The changelog is data-driven: `releases.js` fetches `data/releases.json` and renders cards at runtime. To add a release, append an entry to `data/releases.json`.
