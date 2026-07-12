# Irha Apparels — Owner Supabase Cutover R11

_Last verified during preparation: 2026-07-13_

## 1. Purpose

Move the website runtime from Lovable Cloud Supabase to the existing Supabase project owned by Irha Apparels, without deleting the Lovable Cloud source. The source remains the rollback and historical archive until the owner login, public forms, live website and explicit post-publish smoke test all pass.

## 2. Verified identities

- Lovable project: `da72a40a-7df3-44c3-a72d-f180d9ffcd25`
- GitHub repository: `irhaapparelsofficial-ctrl/irha-global-craft-f3881330`
- Source Lovable Cloud database: `mlefxgyaqoisvdmoiapq`
- Target owner Supabase project: `pvzjiozismyxqrzmtfbi`
- Production origin: `https://www.irhaapparels.com`
- Release marker: `frontend-live-2026-07-13-r11`

Only the public/publishable Supabase credential belongs in frontend code. Service-role credentials, passwords and provider secrets must never be committed.

## 3. Target database state prepared before publish

The target database contains the current Irha schema and security policies, including:

- owner roles and RLS
- inquiries, catalogue leads and secure public-submission rate limits
- 26 categories and 64 published products
- Buyer CRM fields and history
- one DACH/NL lead campaign and 23 evidence-backed candidates in review state
- email queue infrastructure and suppression records schema
- AI command center and guarded business rules
- lead acquisition and approval-based outreach
- social calendar with delivery guards
- multilingual SEO registry and draft workflow
- sample/production/QC/shipping workflow
- WhatsApp Business inbox foundation
- guarded automation settings, two historical planning runs and eight review tasks
- daily internal planning scheduler

All copied catalogue content was rechecked after transfer. Fixed MOQ, fixed production timing and unsupported certification claims were removed or converted to requirement-led wording.

## 4. Authentication model

The private admin application accepts only `irhaapparelsofficial@gmail.com`.

The first owner session must:

1. open `/auth` after R11 is published;
2. enter a new private password;
3. choose **Initialize owner account**;
4. confirm the newest Supabase email if email confirmation is requested;
5. sign in again;
6. let `claim_owner_admin()` create and verify the single admin role.

The password is sent directly to Supabase Auth and is never stored in the repository. Any password previously typed in a chat or shared channel must be treated as exposed and replaced with a new one.

## 5. Edge Functions prepared

Publish-critical functions deployed to the target project:

- `public-lead-gateway` — ACTIVE; inquiry, catalogue lead and signed-upload gateway; custom validation and rate limiting; public JWT verification intentionally disabled because the function performs its own validation.
- `chat` — ACTIVE; public website assistant endpoint. Gemini requires a target-project `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY`. Without that secret the endpoint returns a truthful unavailable response and the frontend deterministic fallback remains available.

Admin and connector functions that depend on Google, Meta, WhatsApp, email-provider or other secrets must be deployed and activated only after their target-project secrets and external account identities are verified.

## 6. Storage parity

Created as private target buckets:

- `inquiry-uploads`
- `mockup-cache`
- `mockup-uploads`
- `social-uploads`

Private source objects were not blindly exposed or claimed as migrated. The source currently remains the archive for historical mockup cache, one social upload and the private database backup. New buyer uploads after cutover write to the target project. Cache assets can be regenerated as required.

## 7. Data intentionally not copied

- source Auth sessions and users — the target owner account is initialized fresh;
- historical page-view rows — source stays the analytics archive;
- private storage object bytes — retained in the source until a verified private transfer is performed;
- external provider secrets — must be configured directly in the target Supabase secret store;
- unverified outbound sends or public posts — none were executed during migration.

## 8. Smoke-test architecture

PR and normal commit checks are deterministic only:

- install
- typecheck
- unit tests
- production build
- repository/business-claim guards

The live-domain Production Smoke workflow is manual and strict. It must run only after the owner explicitly publishes Lovable. It polls for the R11 release marker for a bounded period, then verifies domains, crawler controls, critical pages and the public lead gateway.

This separation permanently prevents an unpublished or slowly propagating Lovable release from failing unrelated pull requests.

## 9. Publish gate

Do not publish until the R11 pull request is green and merged.

After merge:

1. press Lovable **Update** and then **Publish**;
2. verify `/build.json`, `/release.txt` and the HTML release/Supabase identity markers;
3. initialize the owner account at `/auth` with a new password;
4. confirm one target Auth user and one admin role;
5. submit owner-only QA inquiry/catalogue/upload checks and remove or label QA records;
6. dispatch **Production Smoke** with the R11 release values;
7. inspect Gmail for Supabase confirmation and GitHub workflow results;
8. keep the source Lovable Cloud database intact until all checks pass.

## 10. Rollback

If the live release fails before new buyer data is accepted:

1. do not delete or alter the source Lovable Cloud project;
2. revert the R11 runtime configuration commit to the last R10 source configuration;
3. publish the reverted main branch through Lovable;
4. run the explicit R10/R11-appropriate live smoke contract;
5. preserve target database records for investigation.

If new buyer records have already reached the target, export or reconcile them before any rollback so no lead is lost.
