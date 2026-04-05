---
name: release-notes
description: Generate a new release for Element Snapper. Use this skill whenever the user wants to cut a release, create release notes, bump the version, or publish a new version. Triggers on phrases like "make a release", "create release notes", "bump version", "release v1.x", or "what should the next version be".
---

# Release Notes Generator

You help cut a new release for the Element Snapper Chrome extension. This involves coordinated steps: determining the next version, writing detailed release notes, updating extension/version metadata files, refreshing website release info, and packaging the extension zip.

## Step 1 — Gather context

Run these commands to understand what has changed:

```bash
# Get the latest tagged version
git tag --sort=-v:refname | head -n 1

# Get all commits since that tag
git log <latest-tag>..HEAD --oneline

# Get full commit details for deeper analysis
git log <latest-tag>..HEAD --format="%h %s%n%b"
```

If there are no tags yet, treat all commits as the full history.

Read the most recent release note file from `release-notes/` and the current `website/data/releases.json` to understand tone and format before writing anything.

## Step 2 — Decide the next version

Use semantic versioning (MAJOR.MINOR.PATCH) relative to the latest tag:

- **Patch** (x.x.+1): Only bug fixes, copy/label tweaks, refactors with no user-visible impact
- **Minor** (x.+1.0): New features, new UI, new capabilities, UX improvements — the usual case for this extension
- **Major** (+1.0.0): Breaking changes, complete redesigns, or when specifically requested

If the user specifies a version, use that. Otherwise, infer from the commits and tell the user your reasoning before proceeding (give them a chance to correct you).

Today's date is available in the system context as `currentDate`.

## Step 3 — Create `release-notes/vX.X.X.md`

Write a detailed, developer-friendly release note. Match the existing format exactly:

```markdown
# vX.X.X (YYYY-MM-DD)

One-sentence summary of the overall theme of this release.

### ✨ New Features

- **Feature name**: Description of what it does and why it matters.

### 🎨 Improvements

- **Improvement name**: What changed and how it's better.

### 🐛 Fixes

- **Bug fixed**: What was broken, what the symptom was, and how it's now resolved.
```

Guidelines:
- Only include sections that have content — skip empty sections entirely
- Group related commits together into a single bullet rather than listing each commit separately
- Write from the user's perspective ("you can now…", "the panel now…") — not from a code perspective
- Be specific: name the UI element, describe the behavior change, mention the trigger/context
- `fix:` prefixed commits go under Fixes, `feat:` under New Features, improvements and refactors under Improvements

## Step 4 — Update `manifest.json`

Set the extension version to match the release version exactly (without the `v` prefix):

- Release `v1.4.0` → `"version": "1.4.0"`

Do not modify unrelated manifest fields.

## Step 5 — Update `website/data/releases.json`

Prepend a new entry at the **top** of the array (newest first). Keep it concise — this is what users see on the public website:

```json
{
  "version": "vX.X.X",
  "date": "YYYY-MM-DD",
  "summary": "One or two sentences describing the release theme for a general audience.",
  "highlights": [
    "Short user-facing highlight (3-6 words, no leading verb)",
    "Another highlight",
    "Up to 4 highlights total"
  ]
}
```

The summary should be written for end users, not developers — focus on what they get, not how it works. Highlights should be short noun phrases (e.g., "Configurable keyboard shortcuts" not "Added ability to configure keyboard shortcuts").

## Step 6 — Update `website/index.html`

Update the hero release badge text so it announces the new version:

- Find the badge in the hero section (e.g., `Version 1.2.3 is out! ✨`)
- Replace only the version number with the new release number
- Keep the existing wording/style unless the user explicitly asks for marketing copy changes

## Step 7 — Update `README.md`

Find the version badge line near the top — it looks like:

```
**vX.X.X** — A professional Chrome extension that captures...
```

Update the version number. Also update the feature list if significant new features were added — scan the `## Features` section and add bullets for anything genuinely new that isn't already listed. Don't remove existing bullets unless a feature was removed.

## Step 8 — Create release zip

Create a distributable zip from the repository root that includes exactly these extension assets:

- `background/`
- `content/`
- `icons/`
- `popup/`
- `manifest.json`

Use a versioned filename:

```bash
zip -r element-snapper-vX.X.X.zip background content icons popup manifest.json
```

If a zip with that name already exists, replace it so the archive matches the current release files.

## Finishing up

After making all changes, summarize what was done:
- The new version number and the rationale
- The files changed
- The generated zip filename
- Any judgment calls you made (e.g., why minor vs patch)

Do NOT create a git commit, git tag, or push anything unless the user explicitly asks.
