# Element Snapper — Design System

Element Snapper renders UI across three products — the extension popup, the in-page runtime UI, and the marketing website — all sharing one unwritten design language (dark glass, blue accent, `#0f172a`/`#1e293b`/`#3b82f6`). This is the single source of truth for that language, plus what's specific to each surface.

---

## Shared Design Tokens

Every surface below re-declares these as CSS custom properties (`popup.css`, `panel.js`, `preview.js`, `website/app/globals.css` each have their own copy — see [Known Duplication](#known-duplication)). Values must stay in sync.

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
| Font | `"Inter", -apple-system, sans-serif` (popup; the website is the same Inter, self-hosted by `next/font` and injected as `--font-inter`); `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (panel/preview); `ui-sans-serif, system-ui, ...` (on-page overlays/toast) — three near-identical stacks, worth unifying |
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
| Website | `website/app/**/page.tsx`, `app/globals.css` | Next.js static export served at element-snapper.pakool.com | Landing, manual, playground, releases, privacy pages |

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
│  │ Output │Download│Image│Prompt│  │  ← 3-way segmented control
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

### Components

- **Header** — shared between both views, always `32px` tall. Home: `[Logo + Title]` left, `[Status Dot] [Settings Gear]` right. Settings: `[Back Arrow] [Title]` left, `[Help icon] [Close X]` right. The brand logo is an inline SVG (dashed marching-ants bounding box + four blue corner crops + camera lens) that scales 10% and rotates 5° on hover.
- **Status Pill** — rounded badge in the header, colored 6px dot only (no text): `idle`/`selecting` → blue (pulsing when selecting), `capturing` → amber, `success` → green, `error` → red.
- **Primary Capture Button** — 54px tall, full-width, blue gradient, lifts on hover, scales to 98% on active. Drives its look off `data-state` (`idle`/`selecting`/`capturing`/`success`/`error`), each with its own label and style (e.g. `selecting` swaps to outlined card style + "Cancel Selection"). Spinner is an SVG `stroke-dasharray` draw/undraw animation.
- **Secondary Action Buttons** — Area / Screen / Page, equal-width 3-col grid, card background, blue border + tint on hover.
- **Output Mode** (Download / Copy Image / Copy as Prompt) — segmented control from radio inputs, same `.toggle-group`/`.toggle-option` component the Settings Format control uses, just with 3 options and tighter sizing (`.toggle-group-3`) to fit the longer labels. "Copy as Prompt" only applies to element capture — selecting an element skips the screenshot entirely and copies a text description of it (tag, selector, dimensions, text content, a curated style allowlist, capped outerHTML, ancestor/DOM path) to the clipboard. Its hover highlight uses a distinct purple (`mode-prompt`) instead of the normal blue, since the click won't produce an image.
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

A single fixed-position `div` (`#element-screenshot-highlight-overlay`) is moved/resized on every `mousemove`, rather than re-styling the hovered element in place — avoids layout thrash and works on elements with `overflow:hidden` ancestors. The border color is driven by two independent things — the selected **output mode**, and whether the hovered element **extends beyond the viewport** (which always wins, since "this will trigger multi-tile stitching" is a more operationally important signal than which output mode is active):

| Class | Meaning | Style |
|---|---|---|
| `mode-download` | Output mode is "Download" | Dashed **green**, 7% green fill |
| `mode-image` | Output mode is "Copy Image" | Dashed **blue**, 7% blue fill |
| `mode-full-extends` | "Scroll Element" on AND element exceeds viewport | Dashed **indigo**, badge with `↕`/`↔` arrows + "Full Element" label — overrides `mode-download`/`mode-image` regardless of which is selected |
| `mode-prompt` | Output mode is "Copy as Prompt" | Dashed **purple**, badge always reads "Copy as Prompt" — overrides everything else since scroll/full-capture is meaningless when nothing is screenshotted |

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

Next.js (App Router) site built as a static export — one route folder per page under `app/`, all sharing `app/globals.css`. Shares the extension's color tokens and logo SVG to present a unified brand.

Every page is a Server Component; the only client islands are the ones that need an event handler: `components/navbar.tsx` (mobile menu), `hero-mockup.tsx` (parallax + playable popup replica), `demo-video.tsx` (loader fade), `floating-ad.tsx`, `glow-cursor.tsx`. Anything new that is purely presentational should stay a Server Component.

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

Both live in `components/` and are rendered once by `app/layout.tsx`, so every route gets them automatically — pages don't re-declare the nav, footer or background glows.

- **Navbar** (`components/navbar.tsx`) — sticky, `z-index: 100`. Logo (same marching-ants SVG + hover animation as popup/panel) left; text nav links + outlined Download button right. Active page indicated via `color: var(--text-primary)` on its nav link, derived from `usePathname()`.
  - **Two states.** At rest the bar is flush with the page — transparent, square, borderless — so it reads as part of the hero rather than an object on top of it. Past 8px of scroll it lifts into the floating pill: `rgba(15,23,42,.75)` + `blur(16px)`, `--border-light` hairline, 12px radius, `0 10px 30px -10px` shadow, faded over 0.3s (suppressed under `prefers-reduced-motion`). The component adds `.is-scrolled` on `.navbar`; the open mobile menu forces the same state so its dropdown doesn't hang off an invisible bar.
  - Only paint properties differ between the states — `.navbar` padding is constant and the resting border is a transparent 1px line — so the transition can't shift the page.
  - **Companion rule: `html { scroll-padding-top: 152px }`.** Because the bar floats over content, anything scrolled to the viewport top lands under it. Next calls `scrollIntoView()` on the new route's root element on every navigation, so without the reserve a route change from a scrolled page left the new page's own title behind the bar; `#anchor` jumps tucked under it the same way. The value must clear the tallest the stuck bar ever gets — **135px in the 769–990px band**, where the nav links wrap to a second row before the hamburger takes over, vs 106px ≤768px and 110px ≥991px. Deliberately one global value, not three: over-reserving is free on a route change (the target clamps to the document top regardless) and only widens the gap above an anchored section. Re-measure across widths if the navbar's height changes.
  - **`html` must NOT set `scroll-behavior: smooth`.** It applies to the scrollport, so it also caught Next's per-navigation `scrollIntoView` and animated every route change up from the previous page's scroll offset — the new page painted mid-document and slid to the top over ~1s (from 5000px it was still at 646px after 400ms). Route changes are instant; the two in-page section links opt into smooth themselves in `components/navbar.tsx`, which also respects `prefers-reduced-motion`. Cross-page anchors are left to Next and jump.
- **Footer** (`components/footer.tsx`) — single row (`space-between`), copyright + Privacy/Chrome Web Store links; stacks centered at `≤768px`.

### Landing Page (`app/page.tsx`)

- **Hero** — two-column grid. Left: version badge pill, `4rem/800` H1 with a `.text-gradient` (`#60a5fa → #3b82f6`) highlighted word, subtitle, CTA row (Add to Chrome + BMC), stats row. Right: a 3D-tilted (`perspective`, mouse-parallax ±10°) browser-chrome mockup containing a **functional pixel-for-pixel popup replica** — clicking "Select Element" in it runs a real 3-second demo (status pill → green, highlight box → green dashed, mock page content behind it with a breathing `selectPulse` animation).
- **Demo Video** (`#how-it-works`) — `autoplay loop muted` video inside a `.glass-panel` frame, with a spinner overlay until `loadeddata` fires.
- **Features** (`#features`) — 3-column grid of `.feature-card.glass-panel` (DPR-Aware Cropping / blue, Multi-Tile Stitching / green, Capture Delay / yellow), lift `5px` on hover.

### Releases Page (`app/releases/page.tsx`)

Data-driven — `data/releases.json` is `import`ed and pre-rendered at build time into `.release-card.glass-panel` cards (4px blue left border, version + date pill header, summary, `✨`-bulleted highlights list). No runtime fetch, so there's no loading state to design. To add a release, append an entry to `data/releases.json`.

### Manual (`app/manual/page.tsx`) and Playground (`app/playground/page.tsx`)

The manual is the lettered `.manual-popup` diagram + `.legend-grid` walkthrough (kept in sync with the real panel by the `website-sync` skill). The playground is a capture test bed of oversized `.pg-box` targets; its styles live in `app/playground/playground.css`, imported by that route alone so they never leak into other pages.

### Privacy Page (`app/privacy/page.tsx`)

Plain typographic reading layout, `max-width: 800px`, no custom components.

### Responsive Breakpoints

| Breakpoint | Changes |
|---|---|
| `≤992px` | Navbar → column; hero grid → single column, centered; hero title → `3rem`; features grid → single column |
| `≤768px` | Hamburger replaces the nav links, which become a dropdown panel; navbar gains `padding-block: 18px` (the pill holds only logo + menu button here); CTA buttons stack full-width; hero stats stack; footer stacks centered |
| `≤480px` | Hero title → `2.2rem`; replica action buttons go vertical |

---

## Known Duplication

`popup.css`, the inline `PANEL_CSS` in `panel.js`, the inline `PREVIEW_CSS` in `preview.js`, and `website/app/globals.css` each redeclare the same ~15 color/radius/motion tokens and several component patterns (toggle switch, toolbar button, status dot, logo animation). They've already drifted slightly — e.g. `--text-muted` and `--warning` exist in the panel's token block but not preview's (preview doesn't need a status dot), and the website uses its own radius scale (`16px`/`8px`) instead of `--radius-sm`/`--radius-md`. This is fine as four-copies-in-sync today, but is the first thing to watch if the palette ever changes.

---

## Ideas for Improvement

Not required, just things worth considering during the refactor:

1. **Single shared tokens file.** A tiny `design-tokens.css` (or JS string constant) referenced by popup/panel/preview/website would remove the 4-way copy-paste risk above, without needing a build step *on the extension side* — content scripts can load it via `web_accessible_resources` or a `<link>` inside each Shadow DOM, and the website can `@import` it from `app/globals.css` (it has its own Next.js build, but that build doesn't have to be the source of truth).
2. **Unify the font stack and radius scale.** Three near-identical font stacks and two unrelated radius scales (extension's `6px`/`12px` vs. website's `8px`/`16px`) exist for no functional reason — picking one of each would tighten the shared identity.
3. **Countdown could reuse the toast's glass-pill style** instead of being a bespoke circle — right now it's the one in-page surface with its own one-off shape language (60px circle vs. everything else's rounded-rect cards).
4. **The `mode-full-extends` indigo highlight is a genuinely good affordance** (tells the user *before* they click that this will trigger multi-tile stitching) but it's not explained anywhere in the popup/panel UI — a first-time user has no way to learn what the arrows/badge mean except by hovering something tall. Could surface a one-line hint in the Scroll Element toggle's description, and/or show it once in the website's demo.
5. **Z-index stacking relies on insertion order**, which is implicit and fragile (see [Z-Index Stacking](#z-index-stacking-in-page-surfaces-only)) — a comment at each injection site noting "must be inserted after X" would save someone a debugging session later.
