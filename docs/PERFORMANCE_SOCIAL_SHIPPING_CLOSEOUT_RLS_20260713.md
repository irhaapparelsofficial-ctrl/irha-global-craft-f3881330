# Social, Shipping and Closeout RLS optimization — 2026-07-13

## Scope

Optimize private operational policies so authenticated identity is initialized once per query.

Covered modules:

- social calendar, accounts, rendering, publishing, analytics and delivery evidence;
- shipments, packages, documents, tracking and delivery evidence;
- closeout events, issues, costs, repeat-order opportunities and commercial closure.

## Live activation

Applied to owner Supabase project `pvzjiozismyxqrzmtfbi` as migration:

`20260713204923_optimize_social_shipping_closeout_rls_auth_initplan`

## Verification

- owner admin access remained available;
- non-admin authenticated access remained blocked;
- social, render, shipment and closeout tables remained unchanged and empty;
- focused direct per-row Auth calls remaining: 0.

## Safety

No social post, render completion, shipment, delivery confirmation, payment, cost entry or repeat-order action was created or changed.
