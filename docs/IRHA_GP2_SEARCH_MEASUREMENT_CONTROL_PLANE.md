# Irha Apparels GP-2 Search Measurement / Commercial Control Plane

Control-plane ID: `IRHA-GP2-MEASUREMENT-CONTROL-PLANE-20260809`

This document defines the production measurement source of truth for GP-3 through GP-10. It does not authorize new SEO landing pages or content expansion.

## Search systems

### Google Search Console

- Canonical property: `sc-domain:irhaapparels.com`.
- Runtime integration: `supabase/functions/gsc-analytics` and `supabase/functions/gsc-inspect`.
- Credentials remain server-side Google OAuth refresh-token credentials.
- The browser/admin panel never receives Google access tokens, refresh tokens, client secrets or client IDs.
- GP-2 stores sanitized Search Analytics observations in `search_console_observations` and run state in `search_measurement_runs`.
- Search queries containing email-like or phone-like values are not persisted.
- Canonical page URLs are normalized to apex/www-independent paths before joining to catalogue records.
- A missing observation is `NO DATA / NOT OBSERVED`; it is not a zero-performance assertion.
- Google reprocessing/canonical selection is observational evidence and must not be inferred from a code deployment.
- Separate generative-AI performance reporting is represented as `NOT CURRENTLY AVAILABLE` unless Google exposes distinct property evidence in a future supported surface.

### Bing / IndexNow

- IndexNow source of truth remains `.github/workflows/indexnow-after-production.yml`.
- The workflow is production-identity gated, validates the key endpoint, and submits only materially changed canonical URLs.
- GP-2 does not add redundant submissions.
- Bing Webmaster search-performance claims require authenticated Bing Webmaster evidence. IndexNow success is not Bing Webmaster performance evidence.

## Commercial measurement

Private table: `commercial_measurement_events`.

Stable taxonomy:

- acquisition: `page_view`, `organic_landing`, `campaign_landing`
- browsing: `category_view`, `product_type_view`, `product_view`, `manufacturing_resource_view`
- intent: `inquiry_cta_click`, `whatsapp_click`, `email_click`, `sample_cta_click`, `quote_cta_click`, `rfq_start`
- accepted submission: `rfq_submit`, `general_inquiry_submit`, `product_inquiry_submit`

Browser engagement events are emitted only after Analytics consent. The existing operational `site_visitors` presence/owner-notification service remains separate from commercial analytics.

Accepted submission events are observed at the database boundary after the CRM inquiry/catalogue row exists. This prevents a frontend click or failed form submission from becoming a fabricated conversion.

## Attribution contract

First-touch/session attribution may retain only bounded, non-PII fields:

- source
- medium
- campaign
- content
- term
- canonical landing path
- referrer host
- product/category context when resolved from the authoritative catalogue
- country code/device class when safely available

Rules:

1. Never infer a Google organic query from referrer/GA traffic. Query evidence comes from Search Console only.
2. Strip arbitrary URL query strings and fragments from stored paths.
3. Preserve only allowlisted UTM fields after PII-like value rejection.
4. Do not store buyer names, email addresses, phone numbers, messages, uploaded filenames or confidential design information in commercial analytics.
5. Admin/auth/private routes are outside the public commercial tracking contract.

## Product/category observability

`gp2_product_search_observability` is derived from the authoritative `products` table and therefore expands/contracts with the published catalogue without a hard-coded product list.

It joins:

- canonical product identity
- reference/SKU
- main category
- audience group
- product type
- current Search Console page observations when available
- product views
- buyer-intent events
- accepted submission events
- last observed timestamps/data state

`gp2_category_observability` provides the equivalent division/category rollup.

## Opportunity model

The admin control plane exposes evidence candidates, not automatic page creation:

- high impression / low CTR
- average position 4–15 near wins
- page visibility decline against the previous 28-day window
- top query/page/country/device observations
- product/category demand and buyer-intent joins

Any page/taxonomy/content action derived from these candidates belongs to GP-3/GP-4 and requires intent/architecture review there.

## Owner dashboard

`GoogleSearchCenter` remains the authenticated read-only Google proof surface. `GrowthControlPlane` extends that owner area with:

- search impressions/clicks/CTR/position
- top queries/pages
- countries/devices from stored GSC evidence
- near wins and CTR opportunities
- product/category observability
- visitors, buyer-intent actions, WhatsApp clicks and accepted submissions
- explicit `NO DATA / NOT OBSERVED` states

No raw engineering logs or credential material is exposed.

## Automated monitoring

The existing operations schedule remains authoritative. Its existing `daily` run now performs one Search Console measurement sync alongside the existing daily health/sitemap work.

The existing one-time `operations_call_tokens` nonce remains the only database-to-orchestrator authorization path; GP-2 does not create another cron credential or scheduler function. `operations-orchestrator` calls private `gsc-analytics` with its runtime service credential, and health snapshots expose the latest search-measurement readiness/freshness.

## Release rules

GP-2 is complete only after exact-head checks, merge, repository-led migration/function deployment, exact production identity, real GSC sync evidence (or an explicitly isolated external access blocker), event-ingestion verification, RLS/privacy verification, and Supabase parity.
