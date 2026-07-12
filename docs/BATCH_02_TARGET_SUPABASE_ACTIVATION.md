# Batch 02 — Target Supabase Activation Evidence

Date: 2026-07-13

## Runtime identity

- Lovable project: `da72a40a-7df3-44c3-a72d-f180d9ffcd25`
- GitHub repository: `irhaapparelsofficial-ctrl/irha-global-craft-f3881330`
- Source branch: `main`
- Owner Supabase project: `pvzjiozismyxqrzmtfbi`
- Former Lovable Cloud project: retained unchanged as rollback only
- Production publish: intentionally deferred until owner auth, Edge Functions and post-publish checks pass

## Activated schema and content

The owner Supabase database now contains the repository schema through Phase 3 Batch 3.2, including:

- core categories, products and public lead capture;
- Buyer CRM, lead acquisition, outreach, social, multilingual SEO and production workflows;
- automation control and safe draft business rules;
- audited catalog release controls;
- Blog, FAQ, SEO override and internal-link CMS;
- global website settings and reusable Media Library;
- unified Sales Pipeline tasks and activity audit;
- Buyer 360 contacts, notes, duplicate links and private files.

Latest activation added these repository migrations in order:

1. `20260713010000_catalog_release_control.sql`
2. `20260713010100_catalog_function_privileges.sql`
3. `20260713020000_content_seo_cms.sql`
4. `20260713020100_content_cms_seed_and_privileges.sql`
5. `20260713030000_global_site_settings_and_media.sql`
6. `20260713040000_sales_pipeline_tasks.sql`
7. `20260713050000_buyer_360.sql`

## Verified database state before final owner-auth QA

- Row Level Security enabled on every public table
- No RLS-enabled table without a policy
- 26 total categories; 25 in the public release because the archived nightwear parent remains unpublished
- 64 products; all 64 in the public release
- 18 verified public FAQ entries
- one published `site.global.settings` CMS document
- `site-media` bucket created with repository restrictions
- Sales Pipeline task and activity tables activated
- Buyer 360 tables and private CRM file bucket activated
- owner Auth users: 0
- admin roles: 0

## Safety gates still open

Do not publish production until all of these are verified:

1. The authorized owner creates the first account through Supabase Auth and successfully claims the one-time admin bootstrap.
2. Required repository Edge Functions are deployed to the owner Supabase project and their JWT settings match `supabase/config.toml`.
3. Private source storage needed for operations is transferred without exposing source or service credentials.
4. Quality Gate passes on the latest main commit.
5. Explicit post-publish production smoke passes on the custom domain.

External email sends, social publishing, listing changes, pricing and commercial commitments remain approval-controlled. AI business rules remain draft/plan-only until explicitly approved by the owner.