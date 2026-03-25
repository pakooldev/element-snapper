# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Element Snapper is a **Chrome browser extension** (Manifest V3) that captures pixel-perfect screenshots of webpage elements. It supports single elements, full-page captures, viewport screenshots, clipboard output, and delayed capture.

Current version: v1.2.3. Published on Chrome Web Store.

## Installation / Development

No build step required for the core extension. Load directly in Chrome:
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory

After any code change, click the refresh icon on the extension card in `chrome://extensions`.

## Promo Video (optional)

```bash
cd promo-video
npm install
npm start                  # Open Remotion Studio
npm run build              # Render promo video to out/video.mp4
npm run build:screenshots  # Render all Chrome Store screenshots
```

## Architecture

The extension has three isolated layers communicating via Chrome messaging:

```
popup/popup.js
  → chrome.tabs.sendMessage() → content/content-main.js
  → chrome.runtime.sendMessage() → background/service_worker.js
```

### Popup (`popup/`)
- `popup.js` manages state machine: idle → selecting → capturing → success/error
- Reads/writes settings via `chrome.storage.local` (format, quality, delay, fullCapture, copyToClipboard)
- Injects content scripts if not yet loaded before sending messages

### Content Scripts (`content/`)
- `content-main.js`: Orchestrates viewport and full-page capture flows, scroll management, toast notifications, and delay countdown UI
- `element_selector.js`: `ElementSelector` class — creates a fixed-position overlay to highlight hovered elements; color changes blue→indigo when element exceeds viewport (fullCapture mode)
- `utils.js`: DOM helpers (`getElementRect`, `getScrollOffsets`, `getDocumentDimensions`, `scrollIntoView`, `isCrossOriginIframe`)

### Service Worker (`background/service_worker.js`)
- Handles `captureElement` and `captureViewportOrPage` messages
- **DPR-aware cropping**: All canvas math uses physical pixels (`devicePixelRatio`) to support Retina/HiDPI displays
- **Multi-tile stitching**: For elements larger than the viewport, scrolls in a grid pattern, captures each tile via `chrome.tabs.captureVisibleTab()`, then stitches onto a single canvas. Enforces 600ms delay between tiles (Chrome API rate limit)
- Converts to PNG or JPEG, then downloads or copies to clipboard

### Key Constraints
- Max canvas size: 16,384px per dimension (browser limit)
- Full-page capture rate-limited to ~2 captures/second
- Cannot capture cross-origin iframes or Chrome system pages (`chrome://`, Web Store)

## Storage Schema

`chrome.storage.local` keys:
| Key | Type | Description |
|-----|------|-------------|
| `format` | `'png'`\|`'jpg'` | Output format |
| `quality` | 1–100 | JPEG quality |
| `delay` | 0–10 | Capture delay in seconds |
| `fullCapture` | boolean | Scroll element to capture beyond viewport |
| `copyToClipboard` | boolean | Copy instead of download |
| `debugMode` | boolean | Hidden dev flag |

## Website (`website/`)

Static HTML/CSS/JS site at https://element-snapper.pakool.com/. No build step. `releases.js` loads `data/releases.json` to render the changelog dynamically.
