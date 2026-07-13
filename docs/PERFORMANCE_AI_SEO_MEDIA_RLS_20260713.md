# AI, SEO and Media RLS optimization — 2026-07-13

## Live migrations

- `20260713210347_optimize_ai_seo_media_rls_auth_initplan`
- `20260713210513_repair_public_seo_rls_anon_access`

## Scope

Optimize AI, automation, SEO and Media policies while preserving admin-only control and public SEO reads.

## Regression caught and repaired

The first optimization preserved an admin helper inside the shared anonymous SEO policy. Because anonymous callers intentionally have no direct execute permission on that helper, the anonymous regression test returned a permission error.

An append-only repair immediately removed the helper from public policies. Admins already have full access through their separate admin policies.

## Verified result

- owner: 1 AI rules row, 1 automation settings row and all 53 SEO locale records visible;
- non-admin authenticated: private AI/automation/media data hidden, 8 active SEO locales visible;
- anonymous: 8 active SEO locales visible;
- published localized-page visibility unchanged;
- no AI action, SEO publication or media mutation occurred.
