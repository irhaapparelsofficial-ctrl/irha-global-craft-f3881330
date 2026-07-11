# Irha Apparels — Final Backend Activation Manifest

_Last prepared: 2026-07-11_

## Purpose

This is the controlled final backend phase for the existing Irha Apparels website and admin system. It must activate the prepared database migrations, Edge Functions, AI engines and connector bindings without rewriting the completed frontend, changing product media, disconnecting Lovable Cloud early or claiming external actions that were not verified.

## Non-negotiable safety rules

1. Fetch and use the latest GitHub `main` commit before any change.
2. Do not rewrite completed frontend pages or admin playbooks.
3. Do not touch product images, galleries, catalog media or product-media manifests.
4. Do not rotate, expose, print or hardcode secrets.
5. Do not create a replacement API key when an existing approved connection/key can be bound.
6. Do not connect or switch to an external Supabase project until the current Lovable Cloud database is backed up and parity checks pass.
7. Do not send email to a real prospect or publish a public social post during activation tests.
8. A draft, profile check, queued job or failed API call is never reported as sent, published or complete.
9. Every migration/deployment must be idempotent or guarded against duplicate application.
10. Preserve a written rollback point before database, function, connector or domain cutover.

## Current workspace connection evidence

Audited through Lovable workspace connections on 2026-07-11:

- Gmail — ready
- Firecrawl — ready
- Google Search Console — ready
- LinkedIn — ready
- TikTok — ready
- Google Drive — ready

These are builder/workspace connection states. Each deployed Edge Function must still prove that its runtime connection key/secret is visible and that a live read-only identity or health request succeeds.

## Database migrations

### Current Lovable Cloud

Inspect migration history first. Apply only pending repository migrations in chronological order. Never paste or rerun a migration manually if the migration ledger says it was already applied.

Priority prepared migrations:

1. `20260708091000_buyer_crm_foundation.sql`
2. `20260711113000_ai_command_center_foundation.sql`
3. `20260711144301_69b79df6-62f1-42d5-8033-41c58e79ad07.sql`
4. `20260711161957_79d8d92a-d5ff-46e7-8da8-3b3e7d395bb4.sql`
5. `20260711172000_lead_acquisition_engine.sql`
6. `20260711193000_ai_outreach_engine.sql`
7. `20260711194500_ai_outreach_command_center.sql`
8. `20260711203000_social_content_calendar.sql`
9. `20260711204000_social_calendar_format_guard.sql`
10. `20260711213000_multilingual_seo_engine.sql`
11. `20260711224400_public_submission_rate_limit_rpc.sql`
12. `20260711224500_secure_public_lead_capture.sql`
13. `20260711224700_skip_gateway_double_rate_limit.sql`

For a new user-owned Supabase project, apply **all** repository migrations from the earliest file through the latest file in order. Do not start from only the priority list above.

### Required post-migration table checks

Verify table readability and expected workflow columns for:

- `inquiries`
- `catalogue_leads`
- `b2b_leads`
- `ai_runs`
- `ai_actions`
- `business_listings`
- `lead_campaigns`
- `lead_search_runs`
- `lead_candidates`
- `outreach_campaigns`
- `outreach_messages`
- `outreach_events`
- `suppressed_emails`
- `social_campaigns`
- `social_calendar_items`
- `social_delivery_attempts`
- `seo_locales`
- `seo_keyword_clusters`
- `seo_localized_pages`

Verify RLS and admin-only access for all admin/automation tables. Verify public read access only where intentionally required, such as published/indexable localized pages. Verify public lead submission uses the secure gateway and rate-limit RPC rather than direct unrestricted inserts.

## Edge Functions

Inspect deployed versions and deploy missing/changed functions from the repository. Preserve the JWT policy in `supabase/config.toml`.

### Public functions

- `chat` — `verify_jwt = false`
- `public-lead-gateway` — `verify_jwt = false`
- `outreach-unsubscribe` — `verify_jwt = false`

Public functions must still validate input, rate limits, honeypots, file policy, tokens and allowed actions server-side.

### Admin/authenticated functions

- `gsc-inspect`
- `sitemap-ping`
- `admin-chat`
- `admin-agent`
- `admin-agent-execute`
- `admin-agent-health`
- `lead-research`
- `multilingual-seo`
- `outreach-engine`
- `process-email-queue`
- `social-calendar`
- `social-multi-sync`

These must retain `verify_jwt = true` and enforce the admin role inside the function.

### Additional repository functions to verify

- `gsc-analytics`
- `generate-mockup`
- `mcp`
- `social-publish`
- `sync-pricing`

Do not deploy obsolete duplicate behavior over the newer guarded engines. Compare callers and current function responsibilities before deployment.

## Runtime secrets and connector bindings

Never print secret values. Report only `present/missing`, identity/permission result and last checked timestamp.

### Shared

- `LOVABLE_API_KEY`
- standard Supabase runtime variables supplied by the platform

### Lead research

At least one compatible Firecrawl runtime credential:

- `FIRECRAWL_API_KEY`, or
- `LOVABLE_FIRECRAWL_API_KEY`, or
- `CONNECTOR_FIRECRAWL_API_KEY`

### Gmail outreach

- `GOOGLE_MAIL_API_KEY`
- `LOVABLE_API_KEY`

The Gmail profile endpoint must succeed before `ready_to_send = true`.

### Social calendar

- `LINKEDIN_API_KEY`
- `TIKTOK_API_KEY`
- optional `LINKEDIN_ORG_URN` when posting as an approved organization
- `META_PAGE_ACCESS_TOKEN` or `META_ACCESS_TOKEN`
- `META_FB_PAGE_ID` or `META_PAGE_ID`
- `META_IG_BUSINESS_ACCOUNT_ID` or `IG_ACCOUNT_ID`
- optional `SOCIAL_CONTENT_MODEL`

LinkedIn/TikTok workspace accounts are currently connected, but runtime keys and permissions must be checked independently. TikTok profile verification is **not** public-post capability. Meta must remain unavailable/blocked unless valid Page and Instagram Business credentials are present and verified.

### Google Search Console

Inspect `gsc-inspect` and `gsc-analytics` for their current connector binding names. Bind the existing ready Search Console connection without inventing new credentials. Verify property access for the canonical `https://www.irhaapparels.com/` URL-prefix property and domain property where available.

### Other functions

Inspect each function for `Deno.env.get(...)` dependencies and produce a redacted inventory before deployment. Missing optional integrations must appear as unavailable, not as runtime failures or fake success.

## Controlled activation tests

### 1. Database and admin

- Open `/admin` with the approved Google admin account.
- Verify Dashboard, Buyer Inbox, AI Command Center, Lead Acquisition, Mailing, Social Calendar, Multilingual SEO, Google Search and Production Health.
- Confirm mobile navigation and no horizontal overflow.
- Verify CRM source reads, updates, history and signed private-file access.

### 2. Public routes

- Verify homepage, products, catalogue, buyer trust, factory video call, resources, FAQ, inquiry, repeat order, contact, privacy and terms.
- Verify current release marker, sitemap and robots.
- Verify no legacy unsupported claims.

### 3. Public lead gateway

Run read-only invalid-action and invalid-file-policy probes first. Then create one clearly labelled QA inquiry using owner-controlled data, confirm it appears in Buyer Inbox and confirm notification/queue evidence. Remove or archive the QA record after evidence is stored.

### 4. AI Command Center

Run one non-external command, such as a weekly plan. Verify one `ai_runs` row and structured `ai_actions` rows. Do not approve an external action in this test.

### 5. Lead Acquisition

- Health must prove database + AI + Firecrawl runtime readiness.
- Run one low-cost test campaign with a maximum of 3 candidates.
- Confirm source URLs/evidence and duplicate checks.
- Do not import candidates into Buyer CRM during activation unless separately approved.

### 6. Gmail Outreach

- Verify Gmail profile identity.
- Generate one draft for an owner-controlled QA lead.
- Confirm generation does not send.
- For transport proof, send at most one QA email only to the authenticated owner's own mailbox, after explicit confirmation in the activation run.
- Verify stored Gmail message ID/thread ID and duplicate-send recovery.
- Never send to a real prospect during activation.

### 7. Social Calendar

- Generate one draft item.
- Verify it remains draft/unapproved.
- Verify LinkedIn and TikTok identity/permission states.
- Do not publish a public post during activation.
- TikTok must remain `verified_only` or `manual_required` unless Content Posting API scope and audit are actually proven.

### 8. Multilingual SEO

- Generate one German draft from an existing English route.
- Run AI quality review.
- Keep it noindex and unpublished.
- Verify it is absent from the public sitemap until separate native review, approval and publish action.

### 9. Search Console

- Verify property identity.
- Inspect homepage, products, inquiry and repeat-order URLs.
- Read sitemap status and recent indexing reasons.
- Do not claim indexing success from an inspection request alone.

## Migration to a user-owned Supabase project

This is a separate cutover phase after Lovable Cloud backend activation is stable.

1. Create/export a dated backup of the current database and storage inventory.
2. Record row counts for every table, storage bucket/object counts, current auth/admin identities and function/secret inventory.
3. Create the user-owned Supabase project under the user's account/organization.
4. Apply every repository migration in chronological order.
5. Export and import business data with primary keys/timestamps preserved where safe.
6. Migrate storage buckets and objects; verify private/public policies.
7. Recreate auth redirect URLs, admin role membership and required auth settings.
8. Deploy all required Edge Functions with the same guarded JWT policy.
9. Bind secrets/connections without exposing values.
10. Run parity checks: table counts, sampled hashes/IDs, product/category counts, inquiry/CRM counts, storage counts and function health.
11. Connect Lovable to the external Supabase project only after staging parity passes.
12. Update frontend environment references in one controlled commit.
13. Publish and run the full production smoke suite.
14. Keep the Lovable Cloud rollback point until at least one complete verified production cycle has passed.

## Definition of done

Backend activation is complete only when:

- all pending migrations are applied once and schema checks pass
- required functions are deployed with correct JWT policy
- runtime secrets are present without exposure
- Gmail, Firecrawl, Search Console, LinkedIn and TikTok identity/health checks are recorded
- Buyer CRM works against the active database
- public lead capture works through the secure gateway
- AI, lead, outreach, social and multilingual engines pass controlled non-destructive tests
- no real prospect email or public social post was sent during activation without separate owner confirmation
- Production Health distinguishes Ready, Pending, Partial and Blocked truthfully
- build, typecheck, tests, claim guard and production smoke pass
- exact commit SHA, Lovable edit ID, publish evidence and rollback point are reported
