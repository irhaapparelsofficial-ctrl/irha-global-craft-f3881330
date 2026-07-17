# Irha Apparels — Lovable-Free Operations

_Status: active production operating model. GitHub is the source of truth; Cloudflare Pages and owner Supabase are the runtime authorities._

## Decision

Irha Apparels does not require paid Lovable credits to build, test, deploy, operate or roll back the production platform.

Lovable may remain connected as an optional visual editor. Its preview, Update and Publish buttons are not part of the production release contract.

## Production authority

| Layer | Authority | Lovable required? |
|---|---|---:|
| Source code | GitHub `main` | No |
| Quality checks | GitHub Actions `Quality Gate` | No |
| Frontend hosting | Cloudflare Pages | No |
| Custom domains | `irhaapparels.com` and canonical `www` redirect | No |
| Database/Auth/Storage | owner Supabase `pvzjiozismyxqrzmtfbi` | No |
| Edge Functions | repository-controlled Supabase workflow | No |
| Release evidence | exact-SHA GitHub statuses and workflow logs | No |

## Canonical frontend release chain

Active workflows:

1. `.github/workflows/quality.yml` — validates the exact commit and builds the immutable release artifact.
2. `.github/workflows/cloudflare-current-main-reconcile.yml` — deploys only a green exact current-main artifact.
3. `.github/workflows/cloudflare-production-status.yml` — proves exact SHA/fingerprint parity on Pages and the apex domain, and verifies the canonical `www` redirect.

Release rules:

- A focused pull request must pass its current-head Quality Gate before merge.
- Only the exact latest `main` commit may reach production.
- Superseded runs are skipped or cancelled; a missing status is unverified, not a failure.
- `irha-apparels.pages.dev/build.json` and `irhaapparels.com/build.json` must expose the same verified source commit and deterministic build fingerprint.
- `www.irhaapparels.com` must redirect to the apex domain.
- A release is complete only when `Irha Quality Gate`, `Irha Supabase Database Sync` when applicable, and `Irha Cloudflare Production` are green for the same exact `main` SHA.

Result: no Lovable Update or Publish action is required.

## Optional owner release command

The guarded issue command `/deploy-current-main` may be posted by the repository owner on release issue #375. It re-runs the exact current-main Quality Gate; the normal Cloudflare reconciliation and production-proof stages remain authoritative.

The manual workflow `.github/workflows/lovable-free-release.yml` provides the same exact-SHA safety lock through `RELEASE_CURRENT_MAIN`. Neither path consumes Lovable credits.

## Owner Supabase release chain

Active workflows:

- `.github/workflows/supabase-database-auto.yml` — reconciles registered repository migrations after the exact-main Quality Gate.
- `.github/workflows/supabase-functions-auto.yml` — deploys changed repository Edge Functions after the exact-main Quality Gate.

Safety controls:

- target project is locked to `pvzjiozismyxqrzmtfbi`;
- repository migration checksums and order are verified before apply;
- already recorded migrations are not replayed blindly;
- database apply is transactional and exact-main gated;
- function deployment follows repository `supabase/config.toml` JWT settings;
- secrets remain in GitHub Actions and are never committed;
- destructive database reset is prohibited.

Required GitHub Actions secrets are managed by the repository owner:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_PROJECT_NAME`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD` where database connection requires it

## Normal development without Lovable

1. Start a branch from exact current `main`.
2. Make one focused change.
3. Open a pull request.
4. Verify the PR's exact current head is green.
5. Merge it.
6. Let the exact-main Quality Gate, Supabase reconciliation when applicable, Cloudflare reconciliation and production proof complete automatically.
7. Confirm live `build.json` matches exact current `main` before calling the release complete.

## Rollback

Frontend rollback:

- revert the faulty commit through a focused pull request; the green revert becomes the new exact current-main release;
- for an urgent incident, roll back Cloudflare Pages first, then immediately create the matching GitHub revert so source and production return to parity.

Backend rollback:

- prefer a new forward migration;
- never run remote `db reset`;
- restore an owner Supabase backup only for a confirmed destructive incident;
- redeploy Edge Functions from a previously verified Git commit when needed.

## WhatsApp policy

WhatsApp is optional and is not required for website availability or the core B2B lead flow. Public Live Chat, Request a Quote, catalogue requests, Buyer CRM, admin inbox, Gmail coordination and factory video-call scheduling remain the official operating stack.

A click-to-chat link may be enabled only with an owner-approved business number. WhatsApp Cloud API automation remains inactive until business verification, credentials, webhook proof and owner-approved messaging rules all exist.
