# Building with Element Snapper

The marketing-site design system behind [element-snapper.pakool.com](https://element-snapper.pakool.com/) — a **dark-first, glassmorphic** language shared with the Chrome extension's popup UI. Dark is the only theme; there is no light mode.

## Setup

No provider, no theme object, no client-side init. Import the stylesheet and the components render correctly:

- `styles.css` is the single entry — it pulls in `fonts/fonts.css` (Inter, self-hosted variable woff2) and `_ds_bundle.css` (tokens + every component rule).
- It sets `body { background-color: var(--bg-dark); color: var(--text-primary); font-family: var(--font-sans) }`. **Anything you render must sit on that dark background.** If you put components in a container with its own background, set it to `var(--bg-dark)` — light-on-white is the one way to make this system look broken.
- `.bg-glow` with `.glow.glow-1` / `.glow.glow-2` inside is the ambient backdrop the pages use (two blurred blobs, `position: fixed`, `z-index: -1`). Optional, but it's most of the atmosphere.

## Styling idiom: semantic global classes + tokens

Not utility classes and not style props — **named component classes in one global stylesheet**, plus `var(--token)` for anything custom. Never invent a class name; use one of these or write inline styles with the tokens.

| Family | Classes |
|---|---|
| Layout | `.container` (max-width + gutter), `.hero`, `.hero-container` (the two-column hero grid), `.hero-actions`, `.features-section`, `.features-grid`, `.video-section`, `.manual-section`, `.test-section` |
| Surfaces | `.glass-panel` (the signature: translucent fill, `backdrop-filter: blur(16px)`, 16px radius, deep shadow), `.feature-card`, `.tip-card`, `.release-card`, `.privacy-container` |
| Buttons | `.btn` + one of `.btn-primary` (blue gradient), `.btn-outline`, `.btn-bmc` |
| Type | `.hero-title`, `.hero-subtitle`, `.section-title`, `.section-subtitle`, `.step-title`, `.step-desc`, `.text-gradient` (blue gradient on a highlighted word) |
| Bits | `.badge` (version pill), `.stat`, `.num-badge`, `.legend-badge`, `.test-tag`, `.spinner` |

Tokens (all of them — there are exactly 15):

```
--bg-dark #0f172a   --bg-card #1e293b   --bg-hover #334155
--text-primary #f8fafc   --text-secondary #94a3b8   --text-muted #64748b
--accent-primary #3b82f6   --accent-hover #2563eb   --accent-glow rgba(59,130,246,.4)
--success #10b981   --error #ef4444   --warning #f59e0b
--border-light rgba(255,255,255,.08)   --border-strong rgba(255,255,255,.15)
--font-sans
```

Radii are 16px for panels, 8px for buttons. The `.mp-*` family (50+ classes) is the extension-popup replica used inside `HeroMockup` — reuse those only when mocking the extension UI.

## Where the truth lives

Read `_ds_bundle.css` before styling anything non-trivial; it is the complete, real stylesheet, and the class list above is only its spine. Per-component API and usage are in each `components/general/<Name>/<Name>.prompt.md` and `<Name>.d.ts`.

## Idiomatic example

Every component here takes **no props** — they're page furniture that manages its own state. Compose them; style your own glue with the classes and tokens.

```jsx
<>
  <Navbar />
  <header className="hero">
    <div className="container">
      <div className="badge">Version 1.5.0 is out! ✨</div>
      <h1 className="hero-title">
        Pixel-Perfect <span className="text-gradient">Element Capture</span>
      </h1>
      <p className="hero-subtitle">Flawless, high-DPR screenshots of any element.</p>
      <div className="hero-actions">
        <a className="btn btn-primary" href="#">Add to Chrome</a>
        <a className="btn btn-outline" href="#">Learn more</a>
      </div>
    </div>
  </header>
  <section className="features-section">
    <div className="container">
      <div className="features-grid">
        <div className="feature-card glass-panel">
          <h3>DPR-Aware Cropping</h3>
          <p style={{ color: "var(--text-secondary)" }}>Never blurry on Retina.</p>
        </div>
      </div>
    </div>
  </section>
  <Footer />
</>
```

## Component notes

- `DemoVideo` hardcodes `src="/demo.mp4"`. Unless something serves that path, it stays in its loading state (spinner over a `.glass-panel` frame).
- `GlowCursor` renders `null` — it only attaches a `mousemove` listener that drifts `.glow-2`. Pair it with `.bg-glow`.
- `FloatingAd` is `position: fixed` (bottom-right). It anchors to the viewport unless an ancestor has a `transform`.
