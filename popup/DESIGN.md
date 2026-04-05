# Popup Design Document

Element Snapper's popup is a 340px-wide Chrome extension panel built with plain HTML/CSS/JS. It has two views (Home and Settings) that slide horizontally, and the popup body animates its height to fit the active view.

---

## Design Goals

- **Minimal footprint** — everything the user needs in one small panel, no scrolling.
- **Clear capture mode feedback** — the user should always know what state the extension is in (ready / selecting / working / done / error).
- **Dark, focused aesthetic** — dark background reduces visual noise when overlaid on bright web pages.

---

## Layout & Dimensions

| Property | Value |
|---|---|
| Popup width | `340px` (fixed) |
| Popup height | Dynamic — body height animates to match the active view |
| Padding | `16px` top/bottom, `20px` left/right per view |
| Gap between sections | `12px` (main content), `16px` (settings sections) |

The popup uses a **slide navigation** pattern. Both views are absolutely positioned. The Settings view starts at `translateX(100%)` and slides in on top of Home when activated.

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

---

## Design Tokens

### Colors

| Token | Value | Usage |
|---|---|---|
| `--bg-dark` | `#0f172a` | Page/view background |
| `--bg-card` | `#1e293b` | Card surfaces, button backgrounds |
| `--bg-hover` | `#334155` | Icon button hover state |
| `--text-primary` | `#f8fafc` | Headings, button labels |
| `--text-secondary` | `#94a3b8` | Descriptions, icon buttons, labels |
| `--text-muted` | `#64748b` | Idle status dot fill |
| `--accent-primary` | `#3b82f6` | CTAs, active states, slider fill |
| `--accent-hover` | `#2563eb` | Gradient end of primary button |
| `--accent-alpha` | `rgba(59,130,246,0.2)` | Button glow shadow, slider ring |
| `--success` | `#10b981` | Success state dot |
| `--error` | `#ef4444` | Error state dot |
| `--warning` | `#f59e0b` | Capturing state dot |
| `--border-light` | `rgba(255,255,255,0.1)` | Default card borders |
| `--border-hover` | `rgba(255,255,255,0.2)` | Hovered card borders |

### Typography

| Token | Value |
|---|---|
| `--font-sans` | `"Inter", -apple-system, sans-serif` |
| Base size | `14px` |
| Brand title | `16px / 600` |
| Button label | `16px / 600` |
| Action buttons | `12px / 500` |
| Toggle label | `14px / 500` |
| Toggle description | `12px` / `--text-secondary` |
| Setting label | `12px / 600`, uppercase, `letter-spacing: 0.05em` |
| Slider value | `12px` monospace |

### Radii & Shadows

| Token | Value | Applied to |
|---|---|---|
| `--radius-sm` | `6px` | Icon buttons, format toggle options |
| `--radius-md` | `12px` | Cards, primary button, action buttons |
| `--radius-lg` | `16px` | (Reserved, unused currently) |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Available |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.3)` | Available |
| Primary button glow | `0 4px 12px var(--accent-alpha)` | Capture button |

### Motion

| Token | Value |
|---|---|
| `--ease` | `cubic-bezier(0.2, 0.8, 0.2, 1)` — fast start, gentle overshoot |
| View slide duration | `0.4s` |
| Body height duration | `0.4s` |
| Hover transitions | `0.2s` |
| Toggle slide | `0.3s` |

---

## Components

### Header

Shared between both views. Height is always `32px`.

- **Home:** `[Logo + Title]` on the left, `[Status Dot] [Settings Gear]` on the right.
- **Settings:** `[Back Arrow] [Title]` on the left, `[Help Info icon] [Close X]` on the right.

The **brand logo** is an inline SVG: a dashed bounding-box rectangle (marching ants animation) with four solid-blue corner crops and a camera lens (filled circle with a dark hole). On hover the logo scales up 10% and rotates 5°, and the dashes speed up.

### Status Pill

A small rounded badge (border-radius `20px`) in the header showing the current extension state via a colored 6px dot. No text label is displayed.

| State | Dot color | Effect |
|---|---|---|
| `idle` | `--accent-primary` | Glow shadow |
| `selecting` | `--accent-primary` | Pulsing scale animation |
| `capturing` | `--warning` | None |
| `success` | `--success` | None |
| `error` | `--error` | None |

### Primary Capture Button

54px tall, full-width, gradient blue (`--accent-primary` → `--accent-hover` at 135°). Lifts 1px on hover (additional glow shadow). Scales to 98% on active.

**State behavior driven by `data-state` attribute:**

| `data-state` | Visual | Label |
|---|---|---|
| `idle` | Blue gradient | "Select Element" |
| `selecting` | Card background + blue border + blue text | "Cancel Selection" |
| `capturing` | Blue gradient + spinner (label hidden) | — |
| `success` | Blue gradient | "Captured!" |
| `error` | Blue gradient | "Retry" |

The loading spinner is an SVG circle with a CSS `stroke-dasharray` animation that draws and undraws a partial arc while rotating continuously.

### Secondary Action Buttons

Three equal-width buttons in a CSS grid (`1fr 1fr 1fr`), `14px` vertical padding with `8px` horizontal padding. Card background with light border. On hover: border turns accent blue, background gets a faint blue tint.

| Button | Label | Action |
|---|---|---|
| Area | `Area` | Click-and-drag region selection |
| Screen | `Screen` | Captures the current viewport |
| Page | `Page` | Scrolls and stitches the entire page |

### Toggle Switch (Clipboard / Scroll Element)

A `switch-row` card containing:
- Left: label + description stacked vertically.
- Right: custom CSS toggle (44×24px pill, hidden `<input type="checkbox">`).

Off state: dark pill, gray knob. On state: accent-blue pill, white knob that slides `translateX(20px)`.

### Settings: Format Toggle

A segmented control built from radio inputs + labels inside a card. Both labels flex equally. The checked label gets a filled accent-blue background and white text.

### Settings: Sliders (Quality / Delay)

`<input type="range">` with custom WebKit thumb styling (18px white circle, scales on hover with a blue ring shadow). The filled track is implemented via `background-size: var(--val) 100%` on a linear gradient — updated by JS on every `input` event.

Quality slider is hidden when PNG format is selected.

| Slider | Range | Display |
|---|---|---|
| Quality | 1–100 | `"95%"` format |
| Delay | 0–10 | `"Off"` at 0, `"Ns"` otherwise |

### Buy Me a Coffee Button

An `<a>` tag styled as a card with a faint yellow tint and `#fbbf24` text, matching the BMC brand color. Lifts on hover. Positioned at the bottom of the Settings view.

---

## State Machine

```
idle ──[click Select Element]──► selecting ──[element clicked]──► capturing ──► success ──(2s)──► idle
 ▲                                  │                               │
 │                                  └──[click Cancel / Escape]      └──► error ──(3s)──► idle
 └──────────────────────────────────────────────────────────────────────────────────────────────┘
```

Viewport, Full Page, and Select Area buttons follow a simplified path: directly to `capturing` (or `selecting` for area), then `success`/`error`.

---

## View Navigation

Clicking **Settings** (gear icon):
1. JS adds `.settings-open` to `.views-wrapper`.
2. CSS slides Home left to `translateX(-30%)` at `opacity: 0.5` (parallax depth cue).
3. CSS slides Settings in from `translateX(100%)` to `translateX(0)`.
4. JS calls `resizeToView(settingsView)` — measures the settings view's `scrollHeight` and sets that as `body.style.height`, triggering the animated resize.

Clicking **Back**:
1. JS removes `.settings-open`.
2. Transitions reverse.
3. JS calls `resizeToView(homeView)`.

Clicking **Close** (X button in Settings header):
- Calls `window.close()` — closes the popup immediately.

---

## Accessibility

- All icon-only buttons have `aria-label` attributes (`"Settings"`, `"Back"`, `"How it works"`, `"Close"`).
- Radio inputs and range inputs are proper `<input>` elements associated with `<label>` tags.
- Toggle switches use visually hidden `<input type="checkbox">` so keyboard and screen readers interact with the real control.
- The help icon in Settings links to external documentation.
