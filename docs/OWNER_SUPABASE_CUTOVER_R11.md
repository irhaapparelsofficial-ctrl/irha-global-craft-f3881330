# Irha Apparels — Owner Supabase Cutover and Rollback Runbook

_Last verified: 2026-07-16_

## 1. Purpose

Irha Apparels production runs on the Supabase project owned by Irha Apparels and is released through GitHub Actions to Cloudflare Pages. Lovable may remain an editor/reference, but Lovable credits, Lovable Update and Lovable Publish are not required for the approved production path.

The old Lovable Cloud backend remains untouched as a historical archive and emergency comparison source until the final migration checklist is closed.

## 2. Immutable identities

- Lovable project: `da72a40a-7df3-44c3-a72d-f180d9ffcd25`
- GitHub repository: `irhaapparelsofficial-ctrl/irha-global-craft-f3881330`
- Historical Lovable Cloud database: `mlefxgyaqoisvdmoiapq`
- Owner Supabase project: `pvzjiozismyxqrzmtfbi`
- Canonical production origin: `https://irhaapparels.com`
- Cloudflare Pages project: `irha-apparels`
- Release marker: `frontend-live-2026-07-13-r11`
- Known-good production rollback branch: `release/approved-production-20260716`
- Known-good production source on that branch: `6853ae7fdd0d59f0fa6757ad778c1a4ee85d862a`

Only the publishable Supabase client credential may be present in frontend code. Service-role credentials, passwords, provider tokens and OAuth secrets must remain in managed secret stores and must never be committed, printed or copied into public issues.

## 3. Verified owner-backend state

Evidence collected on 2026-07-16 confirms:

- all 129 public tables have Row Level Security enabled;
- the owner Auth user exists and has the single required admin role;
- owner-context admin insert, read, update and delete operations pass RLS;
- the public inquiry and catalogue gateway writes to owner Supabase;
- synthetic inquiry and catalogue records were verified and removed;
- public browser execution was revoked from internal trigger helper functions;
- intended anonymous read RPCs remain available;
- unindexed public foreign-key audit returned no uncovered foreign keys;
- core runtime Edge Functions are deployed and ACTIVE;
- `operations-orchestrator` version 2 uses the apex origin and passed an authenticated one-time health request;
- public health checks for `/`, `/products/` and `/sitemap.xml` returned HTTP 200;
- the health-test token, run and snapshot were removed after verification.

Current provider readiness remains truthful and independent of core website health. Google Search Console gateway, WhatsApp Cloud API, social renderer and connected social accounts must not be described as connected until their provider secrets and live account identities are verified.

## 4. Authentication model

The private admin application is restricted to the approved Irha Apparels owner account.

Verified state:

- one confirmed owner Auth user;
- one matching admin role;
- successful owner sign-in history;
- admin RLS guard verified with `authenticated` role context.

Google OAuth is a separate optional provider gate. It requires valid Google OAuth credentials plus the production Site URL and redirect allow-list in owner Supabase. Email/password owner access remains the verified recovery method until Google OAuth is explicitly tested.

## 5. Public and protected Edge Functions

Public functions may have platform JWT verification disabled only when their source implements a reviewed custom validation or webhook-signature contract. Protected admin functions must retain JWT verification or an equivalent reviewed one-time-token contract.

Verified examples:

- `public-lead-gateway` — public custom validation and rate limiting; live inquiry/catalogue round trip passed;
- `operations-orchestrator` — custom single-use `x-irha-ops-token`; version 2 ACTIVE; one-time health test passed;
- protected admin, outreach, SEO, social and WhatsApp functions — deployed ACTIVE, but each external provider remains blocked until its own credential and live-account health test passes.

A function being ACTIVE proves deployment, not provider readiness. Never convert a missing provider credential into a fake green state.

## 6. Approved release process without Lovable credits

1. Resolve the exact latest `main` SHA.
2. Run the required Quality Gate for that exact SHA.
3. Classify missing CI as `no run–unverified`, not failure.
4. Proceed only when source lock, secret scan, migration order, typecheck, tests, build, release identity and legacy-claim guard are green.
5. Deploy through the guarded GitHub-to-Cloudflare production workflow.
6. Verify cache-busted `build.json` and `cloudflare-deployment.json` on both the Pages host and canonical custom domain.
7. Require exact source SHA and build-fingerprint parity.
8. Verify canonical redirects, public routes, sitemap and private-route noindex behavior.
9. Record sanitized evidence only; never publish raw secrets or diagnostic dumps.

Lovable Update/Publish must not be used as a substitute for this release chain.

## 7. Database and Storage safety

- Keep the historical Lovable Cloud project unchanged until migration sign-off.
- Do not bulk-copy or delete storage objects without a manifest, checksum evidence and rollback checkpoint.
- Do not delete owner Supabase records during a frontend rollback.
- New buyer records must always be exported or reconciled before any backend rollback.
- Synthetic QA records must use unique markers and be removed immediately after evidence is captured.

## 8. Rollback procedure

### 8.1 Preflight

1. Stop new production changes and outbound automation.
2. Resolve and record current `main`, current production source SHA and build fingerprint.
3. Confirm the known-good branch `release/approved-production-20260716` still points to `6853ae7fdd0d59f0fa6757ad778c1a4ee85d862a`.
4. Export or reconcile any buyer records created after the known-good release.
5. Create a new backup branch from the current `main` before changing code.

### 8.2 Restore safely

1. Do not force-reset shared history.
2. Create a normal revert/restore commit on `main` that restores the known-good application tree while preserving subsequent database migrations that are already applied.
3. Run the exact-current-main Quality Gate.
4. Deploy only after the restored commit is green.
5. Verify cache-busted production source identity and fingerprint.
6. Smoke-test home, products, catalogue, inquiry, admin authentication, public lead submission and sitemap.

### 8.3 Abort conditions

Abort rollback and investigate if:

- current buyer records have not been reconciled;
- the restored build points to the historical Lovable database;
- current-main Quality Gate is not green;
- production source identity is unverified;
- a required migration would be reversed destructively;
- public forms or owner admin access fail.

## 9. Repository privacy and credential rotation

The temporary public-repository phase is only for completing the current work while GitHub-hosted Actions are available. Before the next private development phase:

1. finish and verify the current task batch;
2. change the repository back to private;
3. rotate any Cloudflare or Supabase privileged credential that may have appeared in public logs, issues or history;
4. update managed GitHub/Supabase secrets;
5. run a fresh secret scan and a protected deployment smoke test;
6. keep the repository private for subsequent work.

Repository privacy does not invalidate copies or forks made while it was public, so credential rotation is mandatory even after visibility is changed.

## 10. Final sign-off gate

Do not declare the migration fully complete until all of the following are proven:

- exact latest `main` Quality Gate is green;
- production serves the approved exact source and fingerprint;
- owner Auth and admin RLS work;
- inquiry, quote and catalogue flows write only to owner Supabase;
- required protected functions are health-tested with their real provider credentials;
- storage parity or an approved archive decision is documented;
- rollback procedure has a non-destructive dry-run record;
- repository is private again;
- exposed privileged credentials have been rotated.
