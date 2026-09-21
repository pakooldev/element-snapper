---
name: website-sync
description: Update the marketing website so its popup mockups (and copy) match the real extension UI/behavior. Use whenever the popup/panel UI changed (new setting, renamed button, new output mode, etc.) and the website needs to reflect it, or when the user says the website mockup "doesn't match", "looks wrong", or "is out of sync" with the extension. Triggers on phrases like "update the website to match the extension", "sync the website", "the mockup is wrong/outdated".
---

# Website ↔ Extension Sync

The website (`website/`, a Next.js app) contains hand-coded JSX/CSS replicas of the extension's floating panel — it does not render the real extension. These replicas drift from `content/panel.js` (the actual UI) and from each other unless you deliberately keep them in sync. This skill is about closing that gap correctly, not just cosmetically.

## Why this keeps happening

There are (at least) two independent mockups of the same panel:

- `website/components/hero-mockup.tsx` — the hero mockup (`.extension-popup` wrapper)
- `website/app/manual/page.tsx` — the step-by-step diagram (`.manual-popup` wrapper, with lettered `num-badge` callouts + a legend)

Both should use the **same shared CSS classes** (`mp-header`, `mp-brand`, `mp-title`, `mp-header-right`, `mp-status`/`mp-dot`, `mp-settings-btn`, `mp-close-btn`, `mp-main-btn`, `mp-actions`/`mp-action-btn`, `mp-setting-group`/`mp-setting-label`, `mp-toggle-group`/`mp-toggle-opt`, `mp-link-btn`, `mp-switch-row`, etc.) defined once in `website/app/globals.css`. If you ever find yourself inventing a new one-off class (e.g. the old `ext-*` set that used to live only in the hero mockup), stop — that's exactly how the two pages end up disagreeing with each other. Reuse the `mp-*` class, and extend `website/app/globals.css` if the real UI has a component that has no `mp-*` equivalent yet.

## Step 1 — Read the real source of truth

The actual UI lives in `content/panel.js`:
- `PANEL_HTML` (the template string, search for `PANEL_HTML = `) is the real markup — header, buttons, settings, everything.
- `PANEL_CSS` (search for `PANEL_CSS = `) is the real styling — exact border-radius values (`--radius-sm: 6px`, `--radius-md: 12px`), the uppercase/letter-spaced `.setting-label`, the dot-only `.status-pill` (no text label), toggle-group padding/radius, etc.

Read the relevant section fully before touching the website. Don't guess at spacing/colors — copy the actual values.

Also check `CLAUDE.md`'s Storage Schema table and the Popup/Content Scripts architecture sections for behavior semantics (what a setting does), separate from what it looks like.

## Step 2 — Find every place the website depicts this UI

```bash
grep -n "mp-header\|mp-toggle-group\|mp-setting-group\|mp-actions\|mp-switch-row\|mp-link-btn" website/components/hero-mockup.tsx website/app/manual/page.tsx
```

Update **every** matching mockup, not just the one the user pointed at. The manual page's diagrams also carry `num-badge` callouts (A, B, C…) tied one-to-one to `legend-item`s below — if you add a new visual element, add both the badge on the diagram AND the legend entry, and if you're just fixing copy, check for orphaned badges/legend entries (a legend item with no matching badge on the diagram, or vice versa) while you're in there.

## Step 3 — Match structure, not just color

Prefer copying the actual markup fragment (icons, element order, class names) over re-describing it. Things that are easy to silently drop when hand-copying:
- The brand logo SVG in the header
- Header-right icon buttons (settings gear, close X) — not just the status dot
- The status pill is a **dot only**, never a text label like "Ready"
- `setting-label` text is uppercase + letter-spaced
- Any link-style row below settings (e.g. "View history") — these are easy to forget entirely

## Step 4 — Verify visually, don't just eyeball the source

Reading HTML/CSS side by side is not reliable enough — use the `webapp-testing` skill to actually render and screenshot both:

1. **Real panel**: build a tiny harness HTML page that stubs `window.chrome` (`storage.local.get/set` as no-ops returning `{}`, `runtime.onMessage.addListener` as a no-op, `runtime.sendMessage` as a no-op) and loads `content/panel.js` via `<script src="file://...">`. It's a self-invoking IIFE that appends a shadow-DOM host to `document.body` on load — no extension environment needed.
2. **Website mockup**: the site is a Next.js app — run `cd website && npm run dev`, then `page.goto("http://localhost:3000/")` (or `/manual`) and screenshot the relevant `.extension-popup` / `.manual-popup` element. `file://` won't work anymore.
3. Read both screenshots and compare them directly — don't just diff CSS property lists, actually look for missing icons, wrapped text, wrong casing, wrong roundness.

## Step 5 — Don't forget the cache gotcha

`next dev` hot-reloads, but the open browser tab can still be showing a stale render (and a `next build` output in `out/` is a snapshot from whenever you last built). Before concluding a fix didn't work, `curl` the dev server directly to confirm what bytes it's actually serving, and have the user hard-refresh (Cmd+Shift+R) before trusting a fresh screenshot.

## Out of scope

Version bumps, `website/data/releases.json` entries, and the hero version badge are handled by the `release-notes` skill — don't duplicate that work here. This skill is purely about the UI mockups and instructional copy matching current extension behavior.

## Finishing up

Do NOT create a git commit unless the user explicitly asks. Summarize: which files changed, what specifically was out of sync (with a one-line "before → after" per item), and any legend/badge additions on the manual page.
