# Production Smoke Marker — e6b66d99

Purpose: trigger the strict post-publish production verification for the exact latest-main release after homepage image resilience, persistent-action cleanup and density polish.

Expected checks:
- apex and www custom-domain behavior;
- approved Lovable project/repository/release identity;
- homepage, product, inquiry and auth route availability;
- canonical host and route-specific crawler shells;
- robots.txt and sitemap.xml;
- legacy redirect/noindex behavior and CSP fallback;
- owner Supabase project identity and non-destructive backend health.

This marker changes no application runtime, database, storage, buyer record, email, WhatsApp, social post, shipment or payment state.

Published source target: `e6b66d99eae3691eace9d2a0669952399cb4049e`.
