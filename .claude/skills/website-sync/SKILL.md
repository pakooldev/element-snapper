---
name: website-sync
description: Update the marketing website's copy so it matches the real extension UI/behavior. Use whenever the panel UI changed (new setting, renamed button, new output mode, etc.) and the website needs to reflect it, or when the user says the website "doesn't match", "looks wrong", or "is out of sync" with the extension. Triggers on phrases like "update the website to match the extension", "sync the website", "the mockup is wrong/outdated".
---

# Website ↔ Extension Sync

The panel on the website is the real one. `website/scripts/sync-panel.mjs` copies `PANEL_HTML`, `PANEL_CSS` and the default shortcuts from `content/panel.js` before every `dev` and `build`, and `website/components/real-panel.tsx` renders them in a shadow root. Never hand-copy panel markup or styles into the site. Its look follows on the next build.

What still needs a person is everything written around the panel.

## What to check after a panel change

1. **Build first.** `cd website && npm run build`. If the panel changed shape, `sync-panel.mjs` fails with a message saying what it couldn't find, and `RealPanel` fails on a `fields` id that no longer exists.
2. **Manual callouts** (`website/app/manual/page.tsx`). `HOME_BADGES` and `SETTINGS_BADGES` map CSS selectors inside the panel to letters, and `HOME_LEGEND` / `SETTINGS_LEGEND` explain each letter. A new control needs a badge and a legend entry. A renamed or removed one needs both updated. A selector with no match logs `RealPanel: no badge target` in the browser console.
3. **Simulated behavior** (`website/components/hero-mockup.tsx`). The hero wires the panel's buttons to a fake capture and copies one rule (Copy as Prompt disables Area/Screen/Page). `panel.js`'s own behavior isn't reused because it needs the chrome.* APIs, so a new rule the visitor would notice has to be added here.
4. **Default state** (`SETTINGS_FIELDS` in the manual page, `VIEW_CSS` in `real-panel.tsx`). These set up what JS does in the extension, such as a checked switch or the hidden Quality row.
5. **Copy.** Search the landing page (`website/app/page.tsx`) and manual text for the old name or behavior.

## Verify by looking

Use the `webapp-testing` skill to screenshot the site's panel (`.extension-popup` on `/`, `.manual-popup` on `/manual`) and the real one, then compare them. To run the real panel outside the extension, stub `window.chrome` (`storage.local.get/set`, `storage.onChanged.addListener`, `runtime.onMessage.addListener`, `runtime.sendMessage`) and load `content/panel.js` in a page. It is a self-invoking function that adds its own host.

`next dev` hot-reloads the site, but it doesn't rerun the sync script. After editing `content/panel.js`, restart it or run `npm run sync`.

## Out of scope

Version bumps, `website/data/releases.json` entries, and the hero version badge are handled by the `release-notes` skill. The store screenshots and promo video (`promo-video/`) are still separate replicas in Remotion, so they need updating by hand.

## Finishing up

Do NOT create a git commit unless the user explicitly asks. Summarize which files changed and what was out of sync.
