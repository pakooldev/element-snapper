# Element Snapper — Design System

Element Snapper renders UI across three products — the extension popup, the in-page runtime UI, and the marketing website — all sharing one unwritten design language (dark glass, blue accent, `#0f172a`/`#1e293b`/`#3b82f6`). This is the single source of truth for that language, plus what's specific to each surface.

---

## Shared Design Tokens

Every surface below re-declares these as CSS custom properties (`popup.css`, `panel.js`, `preview.js`, `website/styles.css` each have their own copy — see [Known Duplication](#known-duplication)). Values must stay in sync.

### Colors

| Token | Value | Usage |
|---|---|---|
| `--bg-dark` | `#0f172a` | Page/panel background, checkerboard dark square |
| `--bg-card` | `#1e293b` | Cards, buttons, tiles, thumb background |
| `--bg-hover` | `#334155` | Hover state for cards/icon buttons |
| `--text-primary` | `#f8fafc` | Headings, labels, button text |
| `--text-secondary` | `#94a3b8` | Descriptions, muted labels |
| `--text-muted` | `#64748b` | Idle status dot, footer text (website) |
| `--accent-primary` | `#3b82f6` | CTAs, active states, highlight outlines, slider fill |
| `--accent-hover` | `#2563eb` | Gradient end on primary buttons |
| `--accent-alpha` | `rgba(59,130,246,0.2)` | Glow shadows, focus rings (extension) |
| `--accent-glow` | `rgba(59,130,246,0.4)` | Button glow shadow — stronger variant used on the website |
| `--success` | `#10b981` | Success dot/toast, version badge (website) |
| `--error` | `#ef4444` | Error dot/toast, destructive actions |
| `--warning` | `#f59e0b` | Capturing/in-progress dot (unused on website) |
| `--border-light` | `rgba(255,255,255,0.1)` (extension) / `rgba(255,255,255,0.08)` (website) | Default borders |
| `--border-hover` | `rgba(255,255,255,0.2)` (extension) / `--border-strong: rgba(255,255,255,0.15)` (website) | Hovered borders |
| indigo `#818cf8` | — | Full-page/"extends beyond viewport" highlight variant (selector only) |
| purple `#8b5cf6` | — | Website ambient background glow only |

### Typography & Motion

| Token | Value |
|---|---|
| Font | `"Inter", -apple-system, sans-serif` (popup, website); `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (panel/preview); `ui-sans-serif, system-ui, ...` (on-page overlays/toast) — three near-identical stacks, worth unifying |
| Base size | `14px` (extension UI) |
| `--radius-sm` | `6px` |
| `--radius-md` | `12px` |
| Website card radius | `16px` (`.glass-panel`), `8px` (buttons) — its own scale, not shared with the extension |
| `--ease` | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| Standard transition | `0.2s`–`0.4s` using `--ease` |

### Z-Index Stacking (in-page surfaces only)

Every on-page surface sits at (or near) the browser's max z-index (`2147483647`), so **DOM insertion order — not z-index value — decides what's on top**. Current order (last-inserted wins):

1. Element/region selector overlay (`2147483645`–`2147483646`)
2. Countdown / toast (`2147483647`)
3. Floating panel host (`2147483647`, inserted on icon click)
4. Preview host (`2147483647`, inserted on first capture, so it renders above the panel)

This ordering is why `panel.js` explicitly hides itself before capture and before opening history (`content/panel.js:1088-1106`) — it can't rely on z-index to stay out of the screenshot or below the preview modal.

---

## Surfaces

| Surface | File | Injected/loaded by | Purpose |
|---|---|---|---|
| Popup | `popup/popup.html`, `.css`, `.js` | `default_popup` / extension click | Primary control UI when using the popup workflow |
| Floating panel | `content/panel.js` | Extension icon click (`background/service_worker.js` `onClicked`) | In-page equivalent of the popup, draggable, stays open across captures |
| Element selector overlay | `content/element_selector.js` + styles in `content/utils.js` | `startSelection` message | Hover-to-highlight + click-to-capture |
| Region selector overlay | `content/region_selector.js` + styles in `content/utils.js` | `startRegionSelection` message | Click-and-drag area capture |
| Countdown | `content/utils.js` (`showCountdownOverlay`) | Any capture with `delay > 0` | Circular countdown badge, top-right |
| Toast | `content/utils.js` (`showNotification`) | Any capture result outside the preview flow | Top-center status pill |
| Preview (thumb + modal + history) | `content/preview.js` | After every successful capture | macOS-style thumbnail → full preview → history strip |
| Website | `website/*.html`, `styles.css` | Static site at element-snapper.pakool.com | Landing, releases, privacy pages |

---

## Popup (`popup/`)

340px-wide, plain HTML/CSS/JS. Two views (Home and Settings) that slide horizontally; the popup body animates its height to fit the active view.

**Design goals:** minimal footprint (no scrolling), clear capture-mode feedback, dark focused aesthetic that doesn't compete with the page underneath.

### Layout

| Property | Value |
|---|---|
| Popup width | `340px` (fixed) |
| Popup height | Dynamic — body height animates to match the active view |
| Padding | `16px` top/bottom, `20px` left/right per view |
| Gap between sections | `12px` (main content), `16px` (settings sections) |

```
┌────────────────────────────────────┐
│  [Logo] Element Snapper  [●] [⚙]  │  ← Header (32px tall)
├────────────────────────────────────┤
│  ┌──────────────────────────────┐  │
│  │   [⊞]  Select Element       │  │  ← Primary capture button (54px)
│  └──────────────────────────────┘  │
│  ┌──────────┐┌──────────┐┌──────┐  │
│  │   Area   ││  Screen  ││ Page │  │  ← Secondary actions (3-col grid)
│  └──────────┘└──────────┘└──────┘  │
│  ┌──────────────────────────────┐  │
│  │ Clipboard  Copy not download │○│  ← Toggle row
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

### Components

- **Header** — shared between both views, always `32px` tall. Home: `[Logo + Title]` left, `[Status Dot] [Settings Gear]` right. Settings: `[Back Arrow] [Title]` left, `[Help icon] [Close X]` right. The brand logo is an inline SVG (dashed marching-ants bounding box + four blue corner crops + camera lens) that scales 10% and rotates 5° on hover.
- **Status Pill** — rounded badge in the header, colored 6px dot only (no text): `idle`/`selecting` → blue (pulsing when selecting), `capturing` → amber, `success` → green, `error` → red.
- **Primary Capture Button** — 54px tall, full-width, blue gradient, lifts on hover, scales to 98% on active. Drives its look off `data-state` (`idle`/`selecting`/`capturing`/`success`/`error`), each with its own label and style (e.g. `selecting` swaps to outlined card style + "Cancel Selection"). Spinner is an SVG `stroke-dasharray` draw/undraw animation.
- **Secondary Action Buttons** — Area / Screen / Page, equal-width 3-col grid, card background, blue border + tint on hover.
- **Toggle Switch** (Clipboard) — label + description left, custom 44×24px pill switch right, backed by a real hidden checkbox.
- **Settings: Format Toggle** — segmented PNG/JPG control from radio inputs.
- **Settings: Sliders** (Quality 1–100, Delay 0–10s) — `<input type="range">` with a custom white-circle thumb and a JS-driven filled track (`background-size` set on `input` events). Quality slider hides when PNG is selected.
- **Buy Me a Coffee Button** — card styled in BMC's yellow, at the bottom of Settings.

### State Machine

```
idle ──[click Select Element]──► selecting ──[element clicked]──► capturing ──► success ──(2s)──► idle
 ▲                                  │                               │
 │                                  └──[click Cancel / Escape]      └──► error ──(3s)──► idle
 └──────────────────────────────────────────────────────────────────────────────────────────────┘
```
Viewport, Full Page, and Select Area buttons follow a simplified path: directly to `capturing` (or `selecting` for area), then `success`/`error`.

### View Navigation

Clicking **Settings**: JS adds `.settings-open` to `.views-wrapper` → Home slides to `translateX(-30%)` at `opacity:0.5` (parallax depth cue) → Settings slides in from `translateX(100%)` → JS measures `scrollHeight` and animates `body.style.height` to match. **Back** reverses it. **Close** (X) calls `window.close()`.

### Accessibility

All icon-only buttons have `aria-label`s; radio/range inputs use real `<input>` + `<label>` pairs; toggle switches use a visually-hidden real `<input type="checkbox">` so keyboard/screen-reader users get the native control.

---

## In-Page Runtime UI (`content/`)

### Floating Panel (`content/panel.js`)

Nearly a 1:1 port of the popup (same Home/Settings sliding-view pattern, same component set — capture button, action grid, toggles, sliders) rendered inside a Shadow DOM host (`#__element-snapper-panel-host__`) so page CSS can't leak in. Differences from the popup:
- Draggable via a `.draggable` header (`mousedown`/`mousemove`/`mouseup` on `document`), clamped to the viewport.
- Adds a **Shortcuts** section (record-a-combo inputs, per-action reset, global enable toggle) that the popup doesn't have.
- Adds a **View history** link and a **Preview Captures** toggle, both wired to `preview.js`.
- Hides itself before triggering any capture (`hidePanel()`) so it never appears in the screenshot, then restores itself via the `captureSuccess`/`captureError`/`selectionCancelled` messages relayed from the service worker.

### Element Selector Overlay (`content/element_selector.js`)

A single fixed-position `div` (`#element-screenshot-highlight-overlay`) is moved/resized on every `mousemove`, rather than re-styling the hovered element in place — avoids layout thrash and works on elements with `overflow:hidden` ancestors. Three visual modes via class:

| Class | Meaning | Style |
|---|---|---|
| `mode-normal` | Regular capture (viewport-clipped) | Dashed blue, 7% blue fill |
| `mode-full-fits` | "Scroll Element" on, element fits in viewport | Same as normal |
| `mode-full-extends` | "Scroll Element" on, element exceeds viewport | Dashed **indigo**, badge with `↕`/`↔` arrows + "Full Element" label |

A dimension label (`123 × 456`) follows the bottom-right of the hovered element, flipping above when it would clip off the bottom edge.

### Region Selector Overlay (`content/region_selector.js`)

Full-screen dark scrim with a `clip-path` polygon cut-out over the drag rectangle (so the selection itself stays bright/unobscured, no double-layer needed). Live dimension label follows the drag. A centered hint (`"Click and drag to select area · Esc to cancel"`) shows until the first `mousedown`, then hides for the rest of the session.

### Countdown (`content/utils.js` → `showCountdownOverlay`)

A single 60px circle, top-right, counting down in 1s ticks with a slide-in/fade-out. No progress ring — just the number. Minimal by design (it's meant to be glanced at, not stared at).

### Toast (`content/utils.js` → `showNotification`)

Centered top, dark glass pill with a checkmark/warning SVG icon, 3s auto-dismiss with a fade+slide. Used for capture results that happen outside the preview flow (e.g. "Copied to clipboard", "Selection too small").

### Preview: Thumbnail → Modal → History (`content/preview.js`)

The most elaborate surface. Flow:
1. **Thumbnail** — 220×150px card, bottom-right, slides in. Auto-dismisses after 5s with a progress bar (`thumb-progress`) that pauses on hover. Click opens the full modal.
2. **Modal** — full-screen dark scrim + blur, centered image, toolbar below (Copy / Download / Remove / Close), all in one card-styled dock.
3. **History strip** — horizontal scroll of recent captures inside the modal, backed by `chrome.storage.session`. Its background is a blurred, saturated copy of the current image (`--strip-bg`) so the strip visually echoes whatever's on screen — a nice touch, purely decorative.

Uses a shared `.checker` background (CSS `linear-gradient` checkerboard) for transparent PNG regions, reused across thumb/modal/history tiles.

---

## Website (`website/`)

Static, no-build landing site (`index.html`, `releases.html`, `privacy.html` + one shared `styles.css`). Shares the extension's color tokens and logo SVG to present a unified brand.

**Design goals:** match the popup's identity, "show don't tell" (a live, interactive popup replica embedded in a browser mockup), dark glassmorphism, responsive down to a single-column mobile layout.

### Background Effects

Two absolutely positioned blurred circles (`filter: blur(120px)`, `z-index: -1`) for ambient depth: `.glow-1` blue top-left, `.glow-2` purple (subtler, `opacity: 0.2`) on the right.

### Glassmorphism Pattern

Reusable `.glass-panel` surface (feature cards, video container, popup replica):
```css
background: rgba(30, 41, 59, 0.7);
backdrop-filter: blur(16px);
border: 1px solid var(--border-light);
border-radius: 16px;
box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
```

### Shared Components

- **Navbar** — sticky, `z-index: 100`. Logo (same marching-ants SVG + hover animation as popup/panel) left; text nav links + outlined Download button right. Active page indicated via `color: var(--text-primary)` on its nav link.
- **Footer** — single row (`space-between`), copyright + Privacy/Chrome Web Store links; stacks centered at `≤768px`.

### Landing Page (`index.html`)

- **Hero** — two-column grid. Left: version badge pill, `4rem/800` H1 with a `.text-gradient` (`#60a5fa → #3b82f6`) highlighted word, subtitle, CTA row (Add to Chrome + BMC), stats row. Right: a 3D-tilted (`perspective`, mouse-parallax ±10°) browser-chrome mockup containing a **functional pixel-for-pixel popup replica** — clicking "Select Element" in it runs a real 3-second demo (status pill → green, highlight box → green dashed, mock page content behind it with a breathing `selectPulse` animation).
- **Demo Video** (`#how-it-works`) — `autoplay loop muted` video inside a `.glass-panel` frame, with a spinner overlay until `loadeddata` fires.
- **Features** (`#features`) — 3-column grid of `.feature-card.glass-panel` (DPR-Aware Cropping / blue, Multi-Tile Stitching / green, Capture Delay / yellow), lift `5px` on hover.

### Releases Page (`releases.html`)

Data-driven — `releases.js` fetches `data/releases.json` and renders `.release-card.glass-panel` cards (4px blue left border, version + date pill header, summary, `✨`-bulleted highlights list). To add a release, append an entry to `data/releases.json`.

### Privacy Page (`privacy.html`)

Plain typographic reading layout, `max-width: 800px`, no custom components.

### Responsive Breakpoints

| Breakpoint | Changes |
|---|---|
| `≤992px` | Navbar → column; hero grid → single column, centered; hero title → `3rem`; features grid → single column |
| `≤768px` | Nav links stack full-width; CTA buttons stack full-width; hero stats stack; footer stacks centered |
| `≤480px` | Hero title → `2.2rem`; replica action buttons go vertical |

---

## Known Duplication

`popup.css`, the inline `PANEL_CSS` in `panel.js`, the inline `PREVIEW_CSS` in `preview.js`, and `website/styles.css` each redeclare the same ~15 color/radius/motion tokens and several component patterns (toggle switch, toolbar button, status dot, logo animation). They've already drifted slightly — e.g. `--text-muted` and `--warning` exist in the panel's token block but not preview's (preview doesn't need a status dot), and the website uses its own radius scale (`16px`/`8px`) instead of `--radius-sm`/`--radius-md`. This is fine as four-copies-in-sync today, but is the first thing to watch if the palette ever changes.

---

## Ideas for Improvement

Not required, just things worth considering during the refactor:

1. **Single shared tokens file.** A tiny `design-tokens.css` (or JS string constant) referenced by popup/panel/preview/website would remove the 4-way copy-paste risk above, without needing a build step — content scripts can load it via `web_accessible_resources` or a `<link>` inside each Shadow DOM, and the website can `@import` it directly.
2. **Unify the font stack and radius scale.** Three near-identical font stacks and two unrelated radius scales (extension's `6px`/`12px` vs. website's `8px`/`16px`) exist for no functional reason — picking one of each would tighten the shared identity.
3. **Countdown could reuse the toast's glass-pill style** instead of being a bespoke circle — right now it's the one in-page surface with its own one-off shape language (60px circle vs. everything else's rounded-rect cards).
4. **The `mode-full-extends` indigo highlight is a genuinely good affordance** (tells the user *before* they click that this will trigger multi-tile stitching) but it's not explained anywhere in the popup/panel UI — a first-time user has no way to learn what the arrows/badge mean except by hovering something tall. Could surface a one-line hint in the Scroll Element toggle's description, and/or show it once in the website's demo.
5. **Z-index stacking relies on insertion order**, which is implicit and fragile (see [Z-Index Stacking](#z-index-stacking-in-page-surfaces-only)) — a comment at each injection site noting "must be inserted after X" would save someone a debugging session later.
