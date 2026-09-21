# Deploying a static site to Cloudflare Pages via GitHub Actions

How to wire up a GitHub repo so pushing to `main` (or pushing a release tag) deploys a static site to Cloudflare Pages — no Cloudflare git integration required. This is the setup used by this repo's `website/` (see `.github/workflows/deploy-website.yml`); use it as a template for other projects.

The site itself can be plain HTML or a framework's static output — the only difference is whether the workflow builds first (see step 4). This repo's `website/` is a Next.js static export, so it does.

This approach deploys via the Cloudflare API (through `wrangler`) instead of Cloudflare's own "connect to GitHub" integration. The two are independent — you never need to connect the repo to Cloudflare in the dashboard for this to work.

## 1. Create a Cloudflare API token

Cloudflare dashboard → click your profile icon → **My Profile** → **API Tokens** → **Create Token**.

Use a custom token with:
- Permission: **Account** → **Cloudflare Pages** → **Edit**

Copy the token now — Cloudflare only shows it once.

## 2. Get your Cloudflare Account ID

Cloudflare dashboard → any site or **Workers & Pages** overview page → the Account ID is shown in the right sidebar.

## 3. Add both as GitHub repo secrets

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

- `CLOUDFLARE_API_TOKEN` — from step 1
- `CLOUDFLARE_ACCOUNT_ID` — from step 2

## 4. Add the workflow file

Create `.github/workflows/deploy-website.yml` (adjust `project-name` and the directory passed to `pages deploy`):

```yaml
name: Deploy Website

on:
  push:
    branches: [main]
    tags: ["v*"]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4

      # wrangler pages deploy errors if the project doesn't exist yet — it
      # does not auto-create one. This is a no-op (continue-on-error) once
      # the project exists from the first run.
      - name: Ensure Cloudflare Pages project exists
        uses: cloudflare/wrangler-action@v3
        continue-on-error: true
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages project create <project-name> --production-branch=main

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy <directory-to-deploy> --project-name=<project-name> --commit-dirty=true
```

Notes on the triggers and flags:
- `tags: ["v*"]` alongside `branches: [main]` means a release tag redeploys the site even if that exact tagged commit didn't touch the site's files — useful when a release process touches multiple things and you want the deploy to happen unconditionally on release.
- Add a `paths:` filter under `push` if the repo has other unrelated content (e.g. extension source code) you don't want triggering a deploy on every commit. Skip it if the deploy is cheap (no build/test steps), since keeping the site in sync is usually worth the extra runs.
- `--commit-dirty=true` silences a spurious "working directory has uncommitted changes" warning that `wrangler pages deploy` prints even against a clean CI checkout.
- If the repo has a build step (a framework, not a plain static site), add the install/build steps before the deploy step and point `pages deploy` at the build output directory instead of the source directory. That's what this repo does — `actions/setup-node` with `cache: npm`, then `npm ci && npm run build` in `website/`, then `pages deploy website/out`.
- Pages serves `out/manual.html` at `/manual` and redirects `/manual.html` → `/manual` on its own, so a framework's static export keeps working with links written against the old flat-HTML URLs. No `_redirects` file needed for that case.

## 5. First run creates the project

Push to `main` (or run the workflow manually via **Actions** → the workflow → **Run workflow**). The "Ensure project exists" step creates the Cloudflare Pages project on the first run; every run after that, it's a no-op that fails harmlessly (`continue-on-error: true`) because the project already exists.

The deploy step's log prints a `*.pages.dev` URL — that always works immediately, before any custom domain is attached.

## 6. Attach the custom domain

This step can't be done from CI — it's a one-time manual step in the dashboard:

Cloudflare dashboard → **Workers & Pages** → the new Pages project → **Custom domains** tab → **Set up a custom domain** → enter the domain.

If the domain's DNS zone is already on Cloudflare (same account), Cloudflare creates/updates the DNS record automatically — no manual DNS edit needed.

## Migrating a project off Cloudflare's git integration

If a project was previously deployed via Cloudflare's "connect to GitHub" integration and you're switching to this Action-based approach:

1. In the Cloudflare dashboard, disconnect the git integration (or delete the old Pages project if you want a clean start — note this also deletes its managed DNS record for any attached custom domain, so the domain will stop resolving until you redo step 6 above).
2. Follow steps 1–6 above.
3. Re-attach the custom domain (step 6) — it does not carry over automatically if the old project was deleted.

## Troubleshooting

- **`Project not found. The specified project name does not match any of your existing projects.`** — the "Ensure project exists" step is missing, didn't run, or the project name doesn't match between the two `wrangler` commands. Check the workflow logs for the create step specifically.
- **Domain doesn't resolve after switching from git integration** — the old Pages project (and its managed DNS record) was likely deleted. Redo step 6 once the new project exists.
- **Deploy succeeds but the live site looks stale** — this is almost always a browser cache on your end, not a CI/deploy problem. `curl -sI <url>` and check the response body/headers directly before assuming the deploy didn't work.
