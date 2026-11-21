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

The ruler stripes on the playground's case pages make repeats, seams, gaps and stretching show up as wrong run lengths. Set `CHROMIUM_PATH` to reuse an installed Chromium, `SHOTS_DIR` to keep the images, `DPR` to run at another screen scale (default 2; browser zoom changes the scale the same way, so `DPR=1.25` and `DPR=1.5` stand in for zoomed pages). The browser shows real scrollbars that take up space, as on Windows. `http://snapper.test:<port>` reaches the same server as a page that is not a secure context, for the clipboard cases. It also covers the editor: it puts a test image in the history, uses every tool and style, drops in a second image and moves it, drags the frame (what is in it must follow, a box outside must not), undoes and redoes, reads the downloaded file, then checks the edit was saved, opens it again from My edits and deletes it. A new playground case should get a check here. Confirm a new check fails on the broken code: one here passed on the old stitching until it was rewritten.

## Site Video (`site-video/`)

The 30s product loop on the landing page, built as code with the `saas-animation` skill: `ad.html` draws every frame (canvas + `gl3d.js` for the 3D page), with all beat times in the `B` block at the top; the last frame is the first, so it loops with no cut. The UI in it is real: `grab2.mjs` runs the extension on a made-up sample page (`scene/page.html`, "Fieldnote") and saves the page, the list, the editor and its tool bars to `assets/`, `grab-prompt.mjs` saves the real Copy as Prompt text. Storyboard in `storyboard/`. `grab-manual.mjs` makes the editor screenshot on the manual page (`website/public/manual/editor.jpg`, then saved as JPEG); `vcheck.mjs` and `manual-check.mjs` check the built site's video and manual.

```bash
cd site-video
CHROMIUM_PATH=... node grab2.mjs && CHROMIUM_PATH=... node grab-prompt.mjs   # re-grab after a UI change
node render.mjs stills ad.html out/stills 5 12 20 --gpu                      # check frames
node render.mjs video ad.html "out/Element Snapper loop - 4K.mp4" --fps 25 --scale 2 --gpu
ffmpeg -i "out/Element Snapper loop - 4K.mp4" -an -vf scale=1600:900:flags=lanczos -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -movflags +faststart ../website/public/demo-loop.mp4
```

## Promo Video (`promo-video/`)

React + Remotion project for generating the Chrome Web Store assets.

```bash
cd promo-video
npm install
npm start                  # Open Remotion Studio
npm run build              # Render promo video → out/video.mp4
npm run build:screenshots  # Render all 5 store screenshots
```

Compositions defined in `src/Root.tsx`: one `1920×1080` promo video (`ElementSnapperPromo`, 877 frames ≈ 29s at 30fps) and nine static stills — `Screenshot1Hero`, `Screenshot2Scroll`, `Screenshot3Settings`, `Screenshot4Clipboard`, `ScreenshotEditor` (feature shots, `src/StoreScreenshots.tsx`; the editor one shows the real editor from `public/editor.jpg`, a copy of `website/public/manual/editor.jpg`), `ScreenshotDownload`, `ScreenshotCopyImage`, `ScreenshotCopyPrompt` (one per output mode, `src/OutputScreenshots.tsx`) at `1280×800`, and `StorePromoTile` at `440×280`. The Chrome Web Store accepts at most 5 screenshots, so pick which to upload.

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

The editor (`editor/editor.html` + `editor.js`) and My edits (`editor/home.html` + `home.js`) are extension pages, not content scripts. The preview's **Edit** button (thumbnail and modal) sends `openEditor`, and the service worker opens `editor/editor.html#capture=<captureId>` in a tab next to the page; the panel's **My edits** link sends `openHome`.

### Content Scripts (`content/`)

Load order is significant: `utils.js` → `element_selector.js` → `region_selector.js` → `content-main.js` → `preview.js` → `panel.js`

- **`content-main.js`**: Global message handler and orchestrator. Manages capture flows for all modes (element, viewport, full-page, region). Handles delay countdown UI, toast notifications, and scroll-lock/restore during multi-tile capture.
- **`element_selector.js`**: `ElementSelector` class — fixed-position overlay that highlights hovered elements. `↑` highlights the parent of the highlighted element and `↓` goes back down (`trail`), for a parent its child fills completely; a click captures the highlighted element as long as the pointer stays on the same hovered one. Highlight turns blue→indigo (dashed) when the element extends past what's visible, signalling that fullCapture mode will stitch it. It selects on `pointerup` because disabled controls never get `mousedown`, `mouseup` or `click`, and stops presses on `window` so the page never sees them. Hover still reaches the page on purpose, so a hover-opened menu stays open while you pick from it.
- **`region_selector.js`**: `RegionSelector` class — full-screen semi-transparent overlay for click-and-drag area selection, over a transparent layer that takes the pointer so the page gets no hover or press. Shows live pixel dimensions. Sends `captureRegion` message with the selected rect on mouse up.
- **`utils.js`**: DOM helpers, overlay styles, and the page side of stitched capture (`prepareCapture`, `positionTile`, `finishCapture`): which elements scroll or clip the target, and what's visible of it. Also `raiseToTopLayer()`, which every on-page element of ours goes through: while a modal `<dialog>` or a popover is open (the browser's top layer, above any z-index), the element becomes a popover inside the topmost modal dialog, because a modal dialog makes everything outside it inert (unclickable). It moves back to the page when the dialog closes. And `copyText()`, the text copy with an `execCommand('copy')` fallback for `http://` pages, which have no `navigator.clipboard`.
- **`panel.js`**: The extension's UI, a floating in-page panel injected via Shadow DOM for CSS isolation, with Home and Settings views that slide. Settings persist to `chrome.storage.local` on every change. Holds the capture state machine (`STATE_CONFIG`). Toggled via extension icon click; uses element ID `__element-snapper-panel-host__` to detect if already present.

### Service Worker (`background/service_worker.js`)

Handles `captureElement`, `captureViewportOrPage`, and `captureRegion` messages.

- **DPR-aware cropping**: All canvas math multiplies coordinates by `devicePixelRatio` to support Retina/HiDPI displays without blur. Content scripts report CSS pixels; the service worker converts to physical pixels.
- **Stitching** (`captureStitched`, used by Scroll Element and Page mode): asks the page for one tile at a time (`tilePrepare`, `tilePosition`, `tileFinish`). The page scrolls whatever the target depends on, waits 600ms (Chrome's limit on captures per second), then up to 3s more (`waitForSettledContent`) while an image on screen is still loading or a one-off animation on screen (a fade-in on scroll) is still running, then reports the visible part and which content position it starts at. Animations that never end are paused for the capture (`freezeLoops`), so a spinner or CSS carousel shows the same frame in every tile. The size is measured once at the start, so content added while scrolling (infinite scroll) is left out and the capture always ends. Nothing is computed ahead, so nested scrollers, app-shell panes and layout changes all go through the same path. Sticky elements become `position: relative` and other fixed elements are hidden, re-checked before each tile. Everything goes back at the end, including scroll positions. Past the canvas limit the image is scaled down.
- **Status relay**: After capture, the service worker sends `captureSuccess`/`captureError` back to the content script in the same tab so the floating panel can update.
- Output is converted to PNG or JPEG, then either downloaded via `chrome.downloads.download()` or copied to clipboard via the Clipboard API (`saveOrCopy`). The copy happens in the content script, so it fails on `http://` pages (not a secure context) or when the page lost focus during a countdown; the image is then downloaded instead, with a notice saying why.

### Editor (`editor/`)

Plain JS, no build step, like the rest of the extension. `editor.css` is shared by both pages; `store.js` is the IndexedDB store both use.

- **Board**: a canvas under two bars (top: name, undo, zoom, Copy, Download; below: tools, then the style controls). Pan with scroll / Space-drag / the Hand tool, zoom with ⌘/Ctrl + scroll or pinch, ⇧1 fits, ⇧0 is 100%. Board units are the capture's own pixels, so 100% shows a capture at the size it had on the page; `doc.unit` is the screen scale it was taken at, and line widths and text sizes (S/M/L) are CSS px times that. The capture starts as an image item inside the **frame**; only what is inside the frame is copied or downloaded, and Crop just sets the frame (drag a new one or drag its handles; the frame label drags it, together with every item that is even partly inside it; items fully outside stay). Items: `image`, `box`, `arrow`, `text`, `blur` (pixelates whatever is drawn under it, 12px blocks), `redact`. Each is selected by clicking (a box only on its line, so what it surrounds stays clickable), then moved, resized with handles (images keep their shape), restyled or deleted. More images come from the Image button (preview history or a file), paste or drop.
- **Style**: color (8 presets + any color), size and line style (solid / dashed / dotted) in the tool bar, shown only where they apply. With a drawing tool on, they set the next shape and the tool stays on; with the Select tool, they change the selected item. The last style is kept in `chrome.storage.local` (`editorStyle`).
- **Undo**: every edit pushes a JSON snapshot of the frame and items (⌘Z / ⇧⌘Z, last 200). Image bytes stay in memory for the whole session, so undoing a deleted image works.
- **Saving**: nothing is stored until the first edit. Then the doc goes to IndexedDB (`element-snapper` database: `docs` with a small WebP thumbnail of the frame, `assets` with each image's bytes, written once) 400ms after every edit, the URL becomes `#doc=<id>`, and Edit on the same capture again opens that doc instead of a new one. Docs stay until deleted on My edits, unlike the preview history, which the browser clears on close. Leaving while a save is still pending asks first.
- **Output**: Download uses the format/quality settings (JPEG gets a white background where nothing covers the frame); Copy is always PNG (the only image type the clipboard takes).

### Key Constraints

- Max canvas size: 16,384px per dimension (browser hard limit); larger captures are scaled to fit
- Full-page capture rate-limited to ~2 captures/second
- Cannot select inside iframes (content scripts are injected into the top frame only), or capture Chrome system pages (`chrome://`, Web Store)
- Known gaps, not handled: GIFs and JS-driven carousels keep moving between tiles (only CSS/Web Animations are paused); DRM video captures black (Chrome blanks it); pinch zoom is not accounted for; Page mode can't scroll a PDF in Chrome's viewer; an SVG file opened directly in a tab has no `<body>` and fails (images like PNG work); on an app shell (sidebar + scrolling main pane) the sidebar's background stops after the first screen, on purpose, since that is what the stretched page really looks like
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
| `openEditor` | preview → service worker | Open `editor/editor.html#capture=<captureId>` in a new tab |
| `openHome` | panel → service worker | Open My edits (`editor/home.html`) in a new tab |

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
| `editorStyle` | `{ color, size, dash }` | red, `'m'`, `'solid'` | Last style picked in the editor |

Saved edits are in IndexedDB, not `chrome.storage` (see [Editor](#editor-editor)).

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
- Everything is a Server Component except small client islands: `components/navbar.tsx` (mobile menu), `hero-mockup.tsx` (parallax + playable panel), `real-panel.tsx`, `playground-widgets.tsx`, `demo-video.tsx` (loads and plays the loop only while it is on screen), `floating-ad.tsx`, `glow-cursor.tsx`
- The panel on the hero and manual pages is the real one: `scripts/sync-panel.mjs` (runs before `dev` and `build`) copies `PANEL_HTML`, `PANEL_CSS` and the default shortcuts from `content/panel.js` to the git-ignored `generated/panel-ui.json`, and `components/real-panel.tsx` renders them in a shadow root. Change the panel in `content/panel.js` and the site follows on its next build, even before that version reaches the Web Store. The script fails the build if the panel changes shape. The manual's letter callouts are `HOME_BADGES` / `SETTINGS_BADGES` in `app/manual/page.tsx` (CSS selector -> letter; a selector with no match logs a console error)
- The changelog is `import`ed from `data/releases.json` at build time and pre-rendered — no runtime fetch. To add a release, append an entry to `data/releases.json`
- `public/` holds `demo-loop.mp4` (the product loop, 1600x900, from `site-video/`), its poster `demo-loop-poster.jpg` and `favicon.png`; Inter is self-hosted via `next/font`

Cloudflare Pages serves `out/manual.html` at `/manual` and redirects the old `/manual.html` URLs automatically, so pre-existing inbound links keep working.
