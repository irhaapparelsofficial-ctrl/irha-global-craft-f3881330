# Phase 2 / Batch 2.2 — Catalog Control

## Objective

Make real Admin product/category edits affect buyer-facing catalog pages without deleting the larger verified committed catalog or creating a blank-site dependency on the database.

## Release model

- The verified committed catalog remains the failure-safe baseline.
- The public website requests one audited database release snapshot.
- Published database categories/products override matching committed records.
- Newly published database products/categories are added to the public tree.
- Explicitly unpublished database records suppress matching committed records.
- If the database release cannot load, buyer pages continue using the committed catalog.
- Public fields are sanitized again in the frontend; MOQ, timelines, shipping and unsupported certification claims remain blocked.

## Admin control

- Existing Products and Categories panels perform real database CRUD.
- A release-health card shows published counts, missing media/content issues and recent changes.
- Every category/product insert, update and delete is written to an append-only audit table.
- `updated_at` is maintained by database triggers.
- Category foreign keys use `RESTRICT`, preventing accidental cascade deletion of complete product/category trees.

## Backend

- `catalog_change_log`
- `catalog_get_public_release()` — public, published release only
- `catalog_get_admin_health()` — admin only
- catalog audit and updated-at triggers
- explicit function/table privilege hardening

## Acceptance criteria

- Existing public catalog remains visible when the release RPC is unavailable.
- Editing a matching database product changes its public content after cache refresh.
- Unpublishing a matching product removes it from the public catalog.
- Publishing a new database product adds it to the matching subcategory.
- Non-admin users cannot read audit history or call admin-health RPC.
- A category containing products cannot be deleted by cascade.
- Quality Gate and production build pass.
