# Irha Apparels — Final Release Evidence

Date: 2026-07-17

This file is a non-runtime release checkpoint. It intentionally changes no frontend behavior, database object, Edge Function, DNS record, external message, payment, shipment, product, category, media asset or lead.

## Verified catalogue architecture

- Main Category → Audience/Buyer Group → Product Type → Products
- 5 main categories
- 13 audience/buyer groups
- 51 product-type leaves
- 69 published taxonomy nodes
- 86 approved product assignments
- zero unassigned products
- zero empty product-type leaves
- zero invalid assignment targets
- existing product/category URLs preserved
- legacy redirects not applied by the taxonomy database release

## Verified backend contract

- owner Supabase project: `pvzjiozismyxqrzmtfbi`
- repository migration ledger: 24 valid entries, zero invalid states
- public taxonomy RPC: security invoker, 69 nodes, 86 assignments
- automatic buyer RFQ confirmation: disabled
- internal owner/CRM lead notification: active
- release-health Edge Function: JWT-protected and admin-only

## Release completion contract

The exact current `main` commit is complete only when these commit statuses are green on the same SHA:

1. `Irha Quality Gate`
2. `Irha Supabase Database Sync`
3. `Irha Cloudflare Production`

The Cloudflare production proof must verify both Pages and the canonical apex `build.json` against that exact SHA and confirm the `www` canonical redirect.
