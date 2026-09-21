# design-sync notes — element-snapper website

Repo-specific gotchas for future syncs. Config lives in `.design-sync/config.json`.

## Why this repo needs an entry barrel

This is a **Next.js app, not a library**: `package.json` has no `main`/`module`/`exports`
and there is no `dist/`. Two consequences the converter can't discover on its own:

- Without `--entry`, it looks for `node_modules/<pkg>/package.json` (the self-install npm
  never creates) and dies with ENOENT. **Do not fix this with a self-symlink**
  (`ln -s ../ node_modules/element-snapper-website`) — it was tried and ts-morph's
  descendant walk follows it forever, failing with ENAMETOOLONG.
- The fix is `.design-sync/ds-entry.tsx` (committed) passed as `--entry`. The converter
  walks up from the entry to the nearest named `package.json`, which lands on the website
  root. Because there's no `.d.ts` tree, the export scan finds 0 names, so every component
  must be listed explicitly in `cfg.componentSrcMap` — that map is the component list here,
  not an override. **Add a component in two places**: an export line in `ds-entry.tsx` and
  an entry in `componentSrcMap`.

## The `process` shim is load-bearing

`next/link` and `next/navigation` read ~12 `process.env.__NEXT_*` flags plus `process.cwd`
and `process.nextTick`. The converter's esbuild pass only substitutes the exact expression
`process.env.NODE_ENV`, so everything else survives into the bundle and throws
`ReferenceError: process is not defined` at module init — which leaves `window.ElementSnapper`
unpopulated and every preview blank (`[BUNDLE_EXPORT] 6/6 not a component`).

`.design-sync/ds-process-shim.ts` installs an empty-env shim. **It must stay the first import
in `ds-entry.tsx`** — ES imports evaluate in order, so a bare assignment in the barrel body
would run after the Next-importing components had already initialized.

## Dark DS vs. the white card template

The preview card template hardcodes `body{margin:0;padding:24px;background:#fff}` *after* its
stylesheet links, so this dark system's `body{background-color:var(--bg-dark)}` always loses
and components render light-on-white. `cfg.provider` points at `DsBackdrop`
(`.design-sync/ds-backdrop.tsx`), which restores the dark surface; its negative margin cancels
the card's 24px padding. `DsBackdrop` is exported from the barrel but deliberately **absent
from `componentSrcMap`**, so it ships in the bundle as the provider without becoming a card.

## CSS is concatenated by `buildCmd`

The app has no single stylesheet: `app/globals.css` is global, `app/playground/playground.css`
is imported only by the playground route — but `FloatingAd` needs the latter's `.pg-*` rules.
`cssEntry` can't do this itself:

- `cssEntry` pointing at a file of `@import`s **does not work** — the converter copies the entry
  verbatim without inlining, so the imports dangle outside the bundle.
- `tokensGlob` **does not work either** — it requires `tokensPkg` and resolves inside
  `node_modules`, which wouldn't survive a fresh clone.

So `cfg.buildCmd` concatenates both into `.design-sync/.cache/ds-styles.css` and `cssEntry`
points there. Run `buildCmd` before every converter run (the re-sync driver does this).

## Fonts

Inter comes from `next/font`, which only exists inside a Next render. The woff2s were copied
out of the build into `.design-sync/fonts/` (committed) because `out/_next/static/media/` is
gitignored and content-hashed. next/font emitted **identical files for weights 400–800**, which
is how you can tell it's a variable font — two subsets (latin, latin-ext) at `font-weight: 100 900`
cover it.

Only `@font-face` rules are extracted from an `extraFonts` CSS file; any other rule is silently
dropped. That's why the `--font-inter` fallback had to go into `app/globals.css` instead:
`var(--font-inter)` with no fallback is unresolvable outside Next, and an unresolved `var()`
invalidates the whole declaration rather than falling through to the next font in the list — so
every component lost its font and rendered serif. Now `var(--font-inter, "Inter")`.

## Known render warns

- `[GRID_OVERFLOW]` on **FloatingAd** and **GlowCursor** — both legitimately use
  `position: fixed` (the ad itself; `.bg-glow` in GlowCursor's preview). Remedied with
  `cardMode: "single"` per the validator's own suggestion; the check exempts single cards, so
  these should not reappear.
- **DemoVideo never leaves its loading state** in any preview or design. It hardcodes
  `src="/demo.mp4"`, an app-absolute path nothing outside the site serves. This is real
  component behaviour, not a broken render — do not "fix" it by faking a poster.
- **GlowCursor renders `null`** by design (behaviour-only: a `mousemove` listener driving
  `.glow-2`). Before its preview was authored it tripped `[RENDER_BLANK]`.

## Findings

- `.hero-content` is used in `app/page.tsx` but has **no CSS rule** anywhere — an unstyled
  semantic wrapper. Kept out of `conventions.md` deliberately; don't document it as vocabulary.
- The extension's own UI (`popup/`, `content/panel.js`, `content/preview.js`) is hand-written
  CSS with no components, so **none of it can be synced**. Only the website's React components
  can. `DESIGN.md` documents all three surfaces; only one of them is in this project.

## Re-sync risks

- **Preview imports look broken in the editor.** `.design-sync/previews/*.tsx` import from
  `"element-snapper-website"`, which TypeScript can't resolve (the converter externalizes it to
  `window.ElementSnapper` at compile time). The editor shows "Cannot find module"; that is
  expected and harmless. `.design-sync`/`.ds-sync`/`ds-bundle` are excluded from the app's
  `tsconfig.json` so they can never break `next build`.
- **The font files are a point-in-time copy.** If the site upgrades Next or changes the
  `next/font` config, `.design-sync/fonts/*.woff2` will silently drift from what the site
  serves. Re-extract with
  `grep -o '@font-face{[^}]*}' out/_next/static/chunks/*.css` after a `npm run build`.
- **`componentSrcMap` is the component list.** A new shared component added to `components/`
  will NOT appear in the design system until it's added to both `ds-entry.tsx` and that map.
  Nothing warns about the omission.
- **The Next version is load-bearing for the shim.** If a future Next release reads a
  `process` member the shim doesn't implement, previews go blank again with a
  `ReferenceError` — add the member to `ds-process-shim.ts`.
- Only `general` grouping is used (no per-component docs exist, so `[DOCS_UNMAPPED]` fires for
  all 6 and `.prompt.md` files are synthesized from the `.d.ts` + previews). Adding
  `docs/<Name>.md` with `---\ncategory: <Group>\n---` frontmatter would group them properly.
