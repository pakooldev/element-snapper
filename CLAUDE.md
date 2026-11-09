# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Element Snapper is a **Chrome browser extension** (Manifest V3) that captures pixel-perfect screenshots of webpage elements. It supports single elements, full-page captures, viewport screenshots, region (click-and-drag) selection, clipboard output, and delayed capture.

Current version: see `manifest.json`. Published on Chrome Web Store.

Visual design (colors, typography, components) across the in-page runtime UI and website is documented in [`DESIGN.md`](DESIGN.md) — read it before touching any CSS/styling or adding a new UI surface.

## Development

No build step required for the core extension. Load directly in Chrome:
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory

After any code change, click the refresh icon on the extension card in `chrome://extensions`. The service worker can be inspected via "Inspect views: service worker" on the extension card.

`test-full-capture.html` is a standalone HTML page for manually testing full-element capture locally.

## Checks

`tests/capture-check.mjs` runs the real extension against the built playground and reads the images pixel by pixel. Run it after any capture or selection change:

```bash
(cd website && npm run build) && cd tests && npm install && npm run check   # or: npm run check "app-shell,long-page"
```

The ruler stripes on the playground's case pages make repeats, seams, gaps and stretching show up as wrong run lengths. Set `CHROMIUM_PATH` to reuse an installed Chromium, `SHOTS_DIR` to keep the images. A new playground case should get a check here. Confirm a new check fails on the broken code: one here passed on the old stitching until it was rewritten.

## Promo Video (`promo-video/`)

React + Remotion project for generating the Chrome Web Store assets.

```bash
cd promo-video
npm install
npm start                  # Open Remotion Studio
npm run build              # Render promo video → out/video.mp4
npm run build:screenshots  # Render all 5 store screenshots
```

Compositions defined in `src/Root.tsx`: one `1920×1080` promo video (`ElementSnapperPromo`, 877 frames ≈ 29s at 30fps) and eight static stills — `Screenshot1Hero`, `Screenshot2Scroll`, `Screenshot3Settings`, `Screenshot4Clipboard` (feature shots, `src/StoreScreenshots.tsx`), `ScreenshotDownload`, `ScreenshotCopyImage`, `ScreenshotCopyPrompt` (one per output mode, `src/OutputScreenshots.tsx`) at `1280×800`, and `StorePromoTile` at `440×280`. The Chrome Web Store accepts at most 5 screenshots, so pick which to upload.

The three v1.5.0 output modes (Download / Copy Image / Copy as Prompt) are the through-line: `src/Outputs.tsx` holds the shared pieces (mode colors matching the hover highlights — green/blue/purple, the Output segmented control, the prompt text mirroring `buildElementPromptText` in `content/utils.js`). The video's scene 3 is `src/OutputsScene.tsx`, which also exports the page/result components; the three per-output stills reuse them frozen at their finished state. If the prompt format or output UI changes in the extension, update `Outputs.tsx`.

## Architecture

The extension has two isolated layers. There is no popup: the manifest sets no `default_popup`, so a toolbar click goes to the service worker's `onClicked`. Content scripts are **not** declared in `manifest.json` — they are injected on demand via `chrome.scripting.executeScript` (requires `activeTab` + `scripting` permissions).

```
toolbar icon click → background/service_worker.js (onClicked)
  → chrome.scripting.executeScript() → injects content scripts if not present
content/panel.js → content/content-main.js, element_selector.js, region_selector.js
  → chrome.runtime.sendMessage()     → background/service_worker.js
  → relays status back               → content/content-main.js (toast/panel updates)
```

The service worker injects `utils.js` → `element_selector.js` → `region_selector.js` → `content-main.js` → `preview.js` → `panel.js`. On later clicks it toggles the existing panel.

### Content Scripts (`content/`)

Load order is significant: `utils.js` → `element_selector.js` → `region_selector.js` → `content-main.js` → `preview.js` → `panel.js`

- **`content-main.js`**: Global message handler and orchestrator. Manages capture flows for all modes (element, viewport, full-page, region). Handles delay countdown UI, toast notifications, and scroll-lock/restore during multi-tile capture.
- **`element_selector.js`**: `ElementSelector` class — fixed-position overlay that highlights hovered elements. Highlight turns blue→indigo (dashed) when the element extends past what's visible, signalling that fullCapture mode will stitch it. It selects on `pointerup` because disabled controls never get `mousedown`, `mouseup` or `click`, and stops presses on `window` so the page never sees them. Hover still reaches the page on purpose, so a hover-opened menu stays open while you pick from it.
- **`region_selector.js`**: `RegionSelector` class — full-screen semi-transparent overlay for click-and-drag area selection, over a transparent layer that takes the pointer so the page gets no hover or press. Shows live pixel dimensions. Sends `captureRegion` message with the selected rect on mouse up.
- **`utils.js`**: DOM helpers, overlay styles, and the page side of stitched capture (`prepareCapture`, `positionTile`, `finishCapture`): which elements scroll or clip the target, and what's visible of it.
- **`panel.js`**: The extension's UI, a floating in-page panel injected via Shadow DOM for CSS isolation, with Home and Settings views that slide. Settings persist to `chrome.storage.local` on every change. Holds the capture state machine (`STATE_CONFIG`). Toggled via extension icon click; uses element ID `__element-snapper-panel-host__` to detect if already present.

### Service Worker (`background/service_worker.js`)

Handles `captureElement`, `captureViewportOrPage`, and `captureRegion` messages.

- **DPR-aware cropping**: All canvas math multiplies coordinates by `devicePixelRatio` to support Retina/HiDPI displays without blur. Content scripts report CSS pixels; the service worker converts to physical pixels.
- **Stitching** (`captureStitched`, used by Scroll Element and Page mode): asks the page for one tile at a time (`tilePrepare`, `tilePosition`, `tileFinish`). The page scrolls whatever the target depends on, waits 600ms (lazy content, and Chrome's limit on captures per second), then reports the visible part and which content position it starts at. Nothing is computed ahead, so nested scrollers, app-shell panes and layout changes all go through the same path. Sticky elements become `position: relative` and other fixed elements are hidden, re-checked before each tile. Everything goes back at the end, including scroll positions. Past the canvas limit the image is scaled down.
- **Status relay**: After capture, the service worker sends `captureSuccess`/`captureError` back to the content script in the same tab so the floating panel can update.
- Output is converted to PNG or JPEG, then either downloaded via `chrome.downloads.download()` or copied to clipboard via the Clipboard API.

### Key Constraints

- Max canvas size: 16,384px per dimension (browser hard limit); larger captures are scaled to fit
- Full-page capture rate-limited to ~2 captures/second
- Cannot select inside iframes (content scripts are injected into the top frame only), or capture Chrome system pages (`chrome://`, Web Store)
- `debugMode` flag (hidden from settings UI) draws red/green tile borders during multi-tile stitching

## Message Types

| Message | Direction | Description |
|---------|-----------|-------------|
| `startSelection` | panel → content | Enable element hover highlighting |
| `startRegionSelection` | panel → content | Enable area drag selector |
| `captureElement` | content → service worker | Capture a specific DOM element |
| `captureViewportOrPage` | content → service worker | Capture viewport or full page |
| `captureRegion` | content → service worker | Capture a dragged rectangle |
| `captureStarted` / `captureSuccess` / `captureError` | service worker → content | Status relay to update panel UI |
| `selectionCancelled` | content → panel | User pressed Escape |

## Storage Schema

`chrome.storage.local` keys:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `format` | `'png'`\|`'jpg'` | `'png'` | Output format |
| `quality` | 1–100 | `95` | JPEG quality (ignored for PNG) |
| `delay` | 0–10 | `0` | Capture delay in seconds |
| `fullCapture` | boolean | `false` | Scroll element to capture beyond viewport |
| `outputMode` | `'download'`\|`'copyImage'`\|`'copyPrompt'` | `'copyImage'` | Download the image, copy it to clipboard, or (element capture only) skip the screenshot and copy a text description of the element instead. Migrated from the old `copyToClipboard` boolean if unset. |
| `debugMode` | boolean | `false` | Hidden dev flag, not shown in settings UI |

## Website (`website/`)

Next.js 16 (App Router) at https://element-snapper.pakool.com/, built as a **static export** (`output: "export"` → `out/`) and deployed to Cloudflare Pages by `.github/workflows/deploy-website.yml` on every push to `main`.

```bash
cd website
npm install
npm run dev     # http://localhost:3000
npm run build   # static export → out/
```

- Routes: `app/page.tsx` (landing), `app/manual`, `app/playground`, `app/releases`, `app/privacy`
- Playground: `app/playground/page.tsx` holds cases that can share a page; anything that changes the document (scroll owner, fixed chrome, very long) goes in `app/playground/cases.tsx`, one entry per `/playground/<slug>`, with the mode and expected result. Keep the main page under 8,192 CSS px, or Page mode hits the canvas limit on a 2x screen
- `app/globals.css` holds the whole design system (the old `styles.css`); `app/playground/playground.css` is imported by that route only
- Everything is a Server Component except small client islands: `components/navbar.tsx` (mobile menu), `hero-mockup.tsx` (parallax + playable panel), `real-panel.tsx`, `playground-widgets.tsx`, `demo-video.tsx` (loader fade), `floating-ad.tsx`, `glow-cursor.tsx`
- The panel on the hero and manual pages is the real one: `scripts/sync-panel.mjs` (runs before `dev` and `build`) copies `PANEL_HTML`, `PANEL_CSS` and the default shortcuts from `content/panel.js` to the git-ignored `generated/panel-ui.json`, and `components/real-panel.tsx` renders them in a shadow root. Change the panel in `content/panel.js` and the site follows on its next build, even before that version reaches the Web Store. The script fails the build if the panel changes shape. The manual's letter callouts are `HOME_BADGES` / `SETTINGS_BADGES` in `app/manual/page.tsx` (CSS selector -> letter; a selector with no match logs a console error)
- The changelog is `import`ed from `data/releases.json` at build time and pre-rendered — no runtime fetch. To add a release, append an entry to `data/releases.json`
- `public/` holds `demo.mp4` and `favicon.png`; Inter is self-hosted via `next/font`

Cloudflare Pages serves `out/manual.html` at `/manual` and redirects the old `/manual.html` URLs automatically, so pre-existing inbound links keep working.
