# Irha Apparels — Batch 01 Production Alignment

_Last updated: 2026-07-12_

## Objective

Align the published custom domain with the latest GitHub `main` release and replace narrow release-specific checks with a reusable production audit covering the complete B2B taxonomy.

## Verified starting state

- Global audience-first taxonomy is already merged in PR #56.
- The implemented public flow is Main Category → Audience → Product Category → Products.
- English, German, French and Spanish taxonomy routes are present in the codebase.
- Existing product URLs remain supported.
- The complete catalogue utility is available at `/products/all` and intentionally excluded from the sitemap.
- PR #56 Quality Gate passed.
- The earlier R9 live post-publish workflow failed because the published domain did not match the expected release/content at the time of that run.
- Gmail contains a Supabase warning that user-owned project `pvzjiozismyxqrzmtfbi` may be paused for inactivity. This project must not be selected for cutover without confirming its ownership, purpose, active state and parity plan.

## Changes in this batch

1. Add a full desktop/mobile Playwright audit for release R10.
2. Cover all five main product categories.
3. Cover representative Men, Women, Kids, Unisex, Team & Club and Family/Hospitality routes.
4. Cover representative German, French and Spanish routes.
5. Verify canonical URLs, exactly one H1, unique meta-description output, JSON-LD validity, hreflang/x-default, release markers, images, overflow, console/network errors, tracking consent, sitemap and robots.
6. Store screenshots, JSON evidence and a Markdown summary as a GitHub Actions artifact.
7. Give `/products/all` a dedicated self-canonical, noindex SEO boundary so it remains a useful buyer search tool without competing with the main `/products` architecture page.

## Not included in this batch

- No product image or gallery changes.
- No Lovable Cloud database migration.
- No user-owned Supabase cutover.
- No real buyer email.
- No public social post.
- No unsupported manufacturing, certification, price or ranking claims.

## Publish gate

This batch is ready to publish only after:

- the normal Quality Gate passes;
- the R10 live workflow is expected to fail before Lovable publication if production is still behind;
- the latest GitHub branch is published through Lovable;
- the R10 live workflow is rerun and passes against `https://www.irhaapparels.com`;
- the exact release marker, sitemap, robots and rollback point are recorded.

## Next large batch

After production alignment, the next batch should activate and verify the prepared backend foundation in controlled order:

1. migration ledger and database backup evidence;
2. secure public lead gateway and rate limiting;
3. Buyer CRM workflow fields and history;
4. AI/lead/outreach/social/multilingual function health;
5. connector identity checks without exposing secrets;
6. controlled owner-only QA records;
7. user-owned Supabase parity plan only after Lovable Cloud is stable.
