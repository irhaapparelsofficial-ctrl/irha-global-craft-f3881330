# Core RLS init-plan optimization — 2026-07-13

## Scope

Optimize the most frequently used public catalogue, lead, CMS and content policies by evaluating `auth.uid()` once per query rather than once per row.

Tables covered:

- `user_roles`
- `products`
- `categories`
- `inquiries`
- `catalogue_leads`
- `blog_posts`
- `faqs`
- `internal_links`
- `seo_page_overrides`
- `cms_documents`
- `cms_document_revisions`
- `content_change_log`

Policy names, roles, commands, public-read behavior and admin authorization semantics remain unchanged.

## Live activation

Applied to owner Supabase project `pvzjiozismyxqrzmtfbi` as migration:

`20260713202932_optimize_core_rls_auth_initplan`

## Regression evidence

Owner-admin simulation:

- admin role check: true
- products visible: 64
- categories visible: 26
- inquiries and catalogue-lead protected reads remained available
- CMS documents visible: 2
- owner role row visible: 1

Non-admin authenticated simulation:

- admin role check: false
- published products visible: 64
- published categories visible: 25
- published FAQs visible: 18
- inquiries, CMS documents and role rows remained hidden

Anonymous simulation:

- published products visible: 64
- published categories visible: 25
- published FAQs visible: 18
- direct CMS access remained denied

Focused direct per-row Auth calls fell to zero across the selected policies.

## Deliberately not changed

- no table rows or user roles;
- no public content visibility rules;
- no unused indexes were dropped;
- no mass foreign-key indexing;
- no archived `legacy_pre_irha` or migration-backup schema changes;
- no email, WhatsApp, social, shipment, payment or website deployment action.

Remaining advisor warnings will be handled in smaller evidence-backed batches.
