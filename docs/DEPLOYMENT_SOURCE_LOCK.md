# Irha Apparels — Deployment Source Lock

## Purpose

Prevent `irhaapparels.com` from silently serving an old Lovable deployment or a different Lovable project while GitHub `main` contains the approved website.

## Locked production identity

- Production origin: `https://www.irhaapparels.com`
- Lovable project: `da72a40a-7df3-44c3-a72d-f180d9ffcd25`
- GitHub repository: `irhaapparelsofficial-ctrl/irha-global-craft-f3881330`
- Source branch: `main`
- Deployment policy: `latest-main-only`

These values are present in:

- `public/build.json`
- `public/release.txt`
- static HTML meta tags
- production propagation checks
- production smoke tests
- post-publish live audit workflow

## Build-time protection

`npm run build` first runs `scripts/verify-deployment-source.mjs`.

The build fails when release, project ID, repository, origin, branch, policy, HTML markers or no-cache header rules disagree.

## Runtime protection

`scripts/wait-for-production-release.mjs` checks all three independently:

1. `/build.json`
2. `/release.txt`
3. homepage HTML

A matching release name alone is insufficient. All sources must identify the correct Lovable project and GitHub repository.

## Caching protection

`/build.json`, `/release.txt`, `/` and HTML responses declare `no-store` and `must-revalidate` so deployment evidence cannot legitimately remain cached as an older release marker.

## Custom-domain mismatch recovery

When the source lock reports `CUSTOM DOMAIN TARGET MISMATCH`:

1. Open Lovable project `da72a40a-7df3-44c3-a72d-f180d9ffcd25`.
2. Verify `irhaapparels.com` and `www.irhaapparels.com` are attached to this project, not an older Lovable project.
3. Detach the domains from the old project if they are still assigned there.
4. Attach both domains to the correct project.
5. Publish the latest synced GitHub `main`.
6. Run **Production Smoke** manually.
7. Run **Live Production R10 Audit** only after Production Smoke passes.

Historical deployment records may remain in the hosting provider's internal history. They are not considered live when the custom domain points exclusively to the correct project and the source lock passes.

## Non-negotiable rule

Never weaken or remove the source identity checks merely to obtain a green workflow. Fix the Lovable domain attachment or publish state instead.
