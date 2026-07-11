# Final Lovable Activation Prompt

Use this only after all frontend and product-media work has been merged into GitHub `main`.

---

Work on the existing Irha Apparels project only.

Project ID: `da72a40a-7df3-44c3-a72d-f180d9ffcd25`
GitHub: `irhaapparelsofficial-ctrl/irha-global-craft-f3881330`
Branch: `main`
Website: `https://www.irhaapparels.com`

First fetch the latest GitHub `main` commit and read `docs/FINAL_BACKEND_ACTIVATION_MANIFEST.md` completely. Treat it as the authoritative execution and safety checklist.

## Strict boundaries

- Do not redesign or rewrite completed frontend pages, admin workspaces, navigation, forms, SEO components or playbooks.
- Do not touch product images, galleries, catalog media, product-media manifests or the separate media workflow.
- Do not expose, print, rotate, replace or hardcode secrets.
- Do not create a new API key when an approved existing connection/key can be bound.
- Do not claim any email, social post, lead import, indexing result or external action succeeded without exact API/database evidence.
- Do not send email to a real prospect or publish a public social post during activation tests.
- Do not disconnect Lovable Cloud or switch the live app to an external Supabase project until backup, migration and parity checks pass.
- Preserve a rollback point before every database, function, connector and final cutover step.

## Phase 1 — Sync and audit

1. Confirm the project source exactly matches the latest GitHub `main` commit.
2. Record the current commit SHA, Lovable edit state, published deployment identifier and current database/project reference.
3. Audit the migration ledger, database schema, RLS, storage buckets, Edge Function deployments, JWT settings, runtime environment-variable names and connected workspace accounts.
4. Produce a redacted preflight table showing `ready`, `missing`, `outdated` or `blocked`; never show secret values.
5. Confirm existing workspace connections for Gmail, Firecrawl, Google Search Console, LinkedIn, TikTok and Google Drive, then separately verify whether each required Edge Function can access its runtime connection key.

## Phase 2 — Current Lovable Cloud backend activation

1. Apply only pending repository migrations in chronological order. Never rerun a migration already recorded as applied.
2. Verify the schema and admin-only RLS for Buyer CRM, AI Command Center, lead research, outreach, social calendar and multilingual SEO tables listed in the manifest.
3. Deploy missing or changed Edge Functions from the repository.
4. Preserve `supabase/config.toml` JWT rules:
   - public only: `chat`, `public-lead-gateway`, `outreach-unsubscribe`
   - authenticated/admin: all admin, lead, outreach, social, SEO, GSC and queue functions
5. Bind required existing runtime connections/secrets without exposing values:
   - `LOVABLE_API_KEY`
   - a compatible Firecrawl runtime credential
   - `GOOGLE_MAIL_API_KEY`
   - `LINKEDIN_API_KEY`
   - `TIKTOK_API_KEY`
   - valid Meta credentials only when already approved and present
   - current Search Console connector binding used by `gsc-inspect`/`gsc-analytics`
6. Inspect every function for additional `Deno.env.get(...)` dependencies and report present/missing states.
7. Do not mark an optional integration as failed merely because it is intentionally not configured; report it as unavailable/pending.

## Phase 3 — Controlled verification

Run the exact non-destructive test sequence from the manifest:

1. Verify all admin workspaces on desktop and mobile.
2. Verify public routes, current release marker, sitemap, robots and absence of unsupported legacy claims.
3. Probe `public-lead-gateway` with invalid action/file requests, then create one clearly labelled owner-controlled QA inquiry and confirm Buyer CRM + notification evidence. Remove/archive the QA record after evidence is saved.
4. Run one AI planning command; verify audit rows; do not approve external actions.
5. Run a maximum-3-candidate lead research test; verify evidence and duplicate logic; do not import to CRM without separate approval.
6. Verify Gmail profile and generate one owner-controlled draft. Sending is allowed only to the authenticated owner's own mailbox and only after an explicit confirmation during this run. Never send to a prospect.
7. Generate one social draft and verify channel health. Do not publish. TikTok verification must remain `verified_only`/`manual_required` unless Content Posting API permission and audit are truly proven.
8. Generate and AI-review one German localized draft, keep it noindex/unpublished and confirm it is absent from the sitemap.
9. Verify Search Console property access, URL inspection and sitemap status without equating inspection with indexing success.
10. Run typecheck, tests, production build, legacy-claim guard and production smoke.

Fix any real schema, function, RLS, runtime or frontend-integration error found by these tests. Commit only focused fixes to GitHub `main`, re-read changed files and rerun the failed checks. Do not add fake fallback success states.

## Phase 4 — User-owned Supabase migration and cutover

After Phase 1–3 are fully green:

1. Create a dated backup/export and row/storage/auth/function inventory of the current Lovable Cloud backend.
2. Use the user-approved external Supabase project. Do not create or connect an unrelated project.
3. Apply all repository migrations from the earliest migration through the latest in chronological order.
4. Migrate business data, storage objects/policies, auth redirects/settings, admin role membership, Edge Functions and redacted secret bindings.
5. Verify parity with table row counts, sampled IDs/hashes, product/category counts, inquiry/CRM counts, storage counts and health results.
6. Connect Lovable to the external Supabase project only after staging parity passes.
7. Update frontend environment references in one controlled commit; never hardcode the URL or keys into source files outside the approved environment configuration.
8. Publish once, then run the full verification sequence again on the custom domain.
9. Keep the Lovable Cloud rollback point until a complete production cycle is verified.

If the approved external Supabase project or required authorization is not available, do not improvise. Complete Phases 1–3, prepare the migration package and stop with exactly one clearly stated manual action required from the owner.

## Required final report

Return one evidence-based report containing:

- latest GitHub commit SHA
- Lovable edit/deployment ID
- migrations applied and migrations already present
- functions deployed with JWT state
- redacted runtime connection health
- database/RLS/storage verification
- controlled-test outcomes
- CI/build/smoke outcomes
- active Supabase project reference after cutover
- parity evidence and rollback point
- exact remaining blockers, if any

Use only `Ready`, `Pending`, `Partial` or `Blocked` states. Do not use persuasive wording in place of evidence.
