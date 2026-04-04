# Website Design Document

The Element Snapper website is a static, no-build landing site. It shares the same design language as the popup (same CSS variables, same logo SVG, same color palette) to present a unified brand. It consists of three pages served from a single `styles.css`.

---

## Pages

| File | Purpose |
|---|---|
| `index.html` | Landing page — hero, demo video, features |
| `releases.html` | Changelog — dynamically populated from `data/releases.json` |
| `privacy.html` | Privacy policy — plain reading page |

All three pages share the same navbar, footer, background glow effects, and `styles.css`.

---

## Design Goals

- **Match the popup's identity** — reuse the exact same color tokens and logo so the extension and website feel like one product.
- **Show, don't tell** — the hero section contains a live, interactive replica of the extension popup embedded inside a browser mockup.
- **Dark glassmorphism** — frosted glass cards on a deep navy background give a premium feel without heavy assets.
- **Responsive** — degrades gracefully from a two-column hero layout down to a single-column stacked layout.

---

## Design Tokens

### Colors

Same base palette as the popup, with two additions for the wider display context:

| Token | Value | Usage |
|---|---|---|
| `--bg-dark` | `#0f172a` | Page background |
| `--bg-card` | `#1e293b` | Card/surface fills |
| `--bg-hover` | `#334155` | Hover fill for interactive elements |
| `--text-primary` | `#f8fafc` | Headings, body copy |
| `--text-secondary` | `#94a3b8` | Subtitles, descriptions |
| `--text-muted` | `#64748b` | Footer text, dates |
| `--accent-primary` | `#3b82f6` | CTAs, active states, release card accents |
| `--accent-hover` | `#2563eb` | Gradient end on primary button |
| `--accent-glow` | `rgba(59,130,246,0.4)` | Button glow shadow (stronger than popup) |
| `--success` | `#10b981` | Version badge, stat checks, mock selection state |
| `--error` | `#ef4444` | Error states |
| `--warning` | `#f59e0b` | (Available, not used in current UI) |
| `--border-light` | `rgba(255,255,255,0.08)` | Default card borders (slightly subtler than popup) |
| `--border-strong` | `rgba(255,255,255,0.15)` | Hover card borders, video container |

### Typography

| Usage | Size / Weight |
|---|---|
| Hero title | `4rem / 800`, `letter-spacing: -0.02em`, `line-height: 1.1` |
| Section titles | `2.5rem / 700` |
| Release version | `2rem / 700` |
| Hero subtitle | `1.25rem / 400` / `--text-secondary` |
| Body / feature card | `0.95–1.1rem / 400` / `--text-secondary` |
| Nav links | `500` / `--text-secondary` |
| Logo | `1.2rem / 700` |
| Buttons | `1rem / 600` |
| Font | `"Inter"`, system-ui, -apple-system |

The `.text-gradient` utility applies a `#60a5fa → #3b82f6` gradient clip for highlighted headline words.

### Spacing

| Token | Value |
|---|---|
| Container max-width | `1200px`, `padding: 0 24px` |
| Section padding | `60–100px` top/bottom |
| Hero padding | `80px 0 120px` |
| Features grid gap | `30px` |
| Nav links gap | `32px` |

### Border Radius

| Context | Value |
|---|---|
| `.glass-panel` cards | `16px` |
| Buttons | `8px` |
| Browser mockup | `12px` |
| Feature icons | `12px` |
| Release date pill | `100px` (fully rounded) |
| Version badge | `100px` |

---

## Background Effects

Two absolutely positioned blurred circles (`filter: blur(120px)`, `pointer-events: none`, `z-index: -1`) create ambient depth:

| Element | Color | Position | Size | Opacity |
|---|---|---|---|---|
| `.glow-1` | Blue (`--accent-primary`) | Top-left (`-10vw, -10vw`) | up to `500px` | `0.4` |
| `.glow-2` | Purple (`#8b5cf6`) | Right side, `top: 400px` | up to `400px` | `0.2` |

The purple glow is intentionally subtle — it adds color depth without competing with the blue brand color.

---

## Glassmorphism Pattern

`.glass-panel` is the reusable surface style applied to feature cards, the video container, and the popup replica:

```css
background: rgba(30, 41, 59, 0.7);   /* semi-transparent --bg-card */
backdrop-filter: blur(16px);
border: 1px solid var(--border-light);
border-radius: 16px;
box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
```

---

## Shared Components

### Navbar

Sticky top bar with `padding: 24px 0` and `z-index: 100`.

- Left: animated logo (same SVG + marching-ants animation as popup)
- Right: text links (How it Works, Features, Releases) + outlined Download button

On hover, the logo scales 10% and rotates 5° (same behavior as popup). The `Releases` nav link uses `color: var(--text-primary)` to indicate the active page on `releases.html`.

### Footer

Simple single-row (`space-between`) with copyright text and two links (Privacy Policy, Chrome Web Store). At `≤768px` it stacks to a column centered layout.

---

## Page: Landing (`index.html`)

### Hero Section

Two-column CSS grid (`1fr 1fr`, `gap: 60px`, aligned to center). Left is content, right is the visual.

**Left column:**
1. **Version badge** — pill with `--success` color and border (`"Version 1.2.3 is out! ✨"`)
2. **H1** — `4rem / 800`, line-break before the gradient word
3. **Subtitle** — `1.25rem`, `max-width: 540px`
4. **CTA row** — Primary button (`Add to Chrome`) + BMC button (`Support Project`), `gap: 16px`
5. **Stats row** — Three checkmark items (`✓ Lossless PNG / JPG`, etc.), muted color, `gap: 24px`

**Right column — Browser Mockup:**

A 3D-tilted browser chrome replica (`perspective: 1000px`, default `rotateY(-5deg) rotateX(5deg)`) that flattens on hover and responds to mouse cursor with a live parallax tilt (±10° on each axis, handled by JS).

```
┌─────────────────────────────────────────────┐
│  ●●●  [  element-snapper.com  ]  [ext icon] │  ← browser-header
├─────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌───────────────┐ │
│  │  page skeleton      │  │ Extension     │ │
│  │  ─────────────────  │  │ Popup Replica │ │
│  │  ────────           │  │               │ │
│  │  ┌ ─ ─ ─ ─ ─ ─ ─ ┐ │  └───────────────┘ │
│  │  ┊  720 × 480    ┊ │                     │
│  │  └ ─ ─ ─ ─ ─ ─ ─ ┘ │                     │
└─────────────────────────────────────────────┘
```

The browser-header has macOS-style traffic-light dots (red `#ff5f56`, yellow `#ffbd2e`, green `#27c93f`), a monospace URL bar, and a glowing blue extension icon.

**Popup Replica** (inside `.browser-body`):
A functional pixel-for-pixel replica of the real popup UI — same styles, same toggle behavior. It slides in on page load via a `slideIn` keyframe (`translateY(-20px)` → `translateY(0)`). Clicking the "Select Element" button inside triggers a live demo: status pill turns green/Selecting, the dashed highlight box turns green, then resets after 3 seconds.

**Mock Page Content** (behind the popup):
Skeleton shimmer-style rectangles on a light (`#f8fafc`) background simulate a real webpage. A `mock-highlight-box` with a dashed blue border and a `selectPulse` breathing animation (background fades between `5%` and `15%` blue opacity every 2s) shows the selection state, with a blue pill label showing `720 × 480`.

### Demo Video Section (`#how-it-works`)

`padding: 60px 0`. Centered section title + subtitle. The video (`demo.mp4`) is `autoplay loop muted playsinline`.

A loading overlay (spinner + "Loading demo..." text) covers the video until the `loadeddata` event fires, then both the overlay fades out (opacity → 0, then `display: none`) and the video fades in (opacity → 1 over `0.5s`).

The video container is a `.glass-panel` with an additional `8px` of padding that acts as a visual frame border around the video.

### Features Section (`#features`)

`padding: 100px 0`. Three-column CSS grid of `.feature-card.glass-panel` components. Cards lift `5px` and deepen their shadow on hover.

Each card has:
- A 48×48px icon container with a color-tinted background
- `H3` title
- `p` description in `--text-secondary`

| Card | Icon accent |
|---|---|
| DPR-Aware Cropping | Blue (`mb-blue`) |
| Multi-Tile Stitching | Green (`mb-green`) |
| Capture Delay | Yellow (`mb-yellow`) |

---

## Page: Releases (`releases.html`)

The releases list is data-driven — `releases.js` fetches `data/releases.json` and injects cards into `#releases-container` at runtime.

Each **release card** (`.release-card.glass-panel`, `max-width: 800px`) has:
- A `4px` solid blue left border (`:before` pseudo-element)
- `release-header`: version number (large, `2rem / 700`) + date pill (muted, rounded)
- `release-summary`: paragraph in `--text-secondary`
- `release-highlights`: an unordered list with `✨` accent-blue bullet icons

Cards lift `2px` on hover with a deeper shadow.

The data format in `releases.json`:
```json
{ "version": "v1.2.3", "date": "2026-03-04", "summary": "...", "highlights": ["...", "..."] }
```

---

## Page: Privacy (`privacy.html`)

Plain reading layout. `max-width: 800px`, `margin: 100px auto`. Uses the same shared tokens:
- H1: gradient text (`#60a5fa → #3b82f6`), `3rem / 800`
- H2: `1.5rem / 700`, `--text-primary`
- Body text: `1.1rem / 400`, `--text-secondary`, `line-height: 1.7`

No custom components — just typographic hierarchy.

---

## Responsive Breakpoints

### `≤992px`

- Navbar stacks to column layout
- Hero grid collapses to single column, text-centered
- Hero title shrinks to `3rem`
- Features grid collapses to single column
- Popup replica inside browser centers horizontally

### `≤768px`

- Nav links stack vertically (full-width)
- Hero padding reduced
- CTA buttons go full-width, stacked
- Hero stats stack vertically
- Footer stacks centered
- Release cards: reduced padding

### `≤480px`

- Hero title shrinks to `2.2rem`
- Popup replica: reduced padding
- Action buttons inside replica go vertical (`flex-direction: column`)

---

## Animations & Interactions

| Animation | Trigger | Behavior |
|---|---|---|
| `marchingAnts` | Always on (logo) | Stroke-dashoffset animates `-12` infinitely at `3s`; speeds to `1.5s` on hover |
| Logo hover | Mouse over `.logo` | Scale `1.1`, rotate `5deg`, marching ants speed up |
| `slideIn` | Page load (popup replica) | `translateY(-20px) opacity:0` → `translateY(0) opacity:1` over `0.5s` |
| `selectPulse` | Always on (highlight box) | Background blue oscillates `5% ↔ 15%` opacity every `2s` |
| 3D parallax tilt | Mouse move on `.hero-visual` | Browser rotates up to `±10deg` on both axes; snaps back to `rotateY(-5deg) rotateX(5deg)` on mouse leave |
| Interactive demo | Click "Select Element" in replica | Status pill → green Selecting; highlight box → green; resets after 3s |
| `spin` | Video loading | 40px spinner border rotates `360deg` linearly |
| Video fade-in | `loadeddata` event | Video opacity `0 → 1` over `0.5s`; loader fades out then hides |
| Feature card hover | Mouse over card | `translateY(-5px)`, shadow deepens |
| `.btn-primary` hover | Mouse over | `translateY(-2px)`, glow shadow increases |
| `.btn-bmc` hover | Mouse over | `translateY(-2px)`, yellow background brightens |
