# Irha Apparels — Phase 2 Admin CMS

## Goal

Move buyer-facing website content into an owner-controlled admin workflow without weakening public-site reliability or exposing private drafts.

## Batch 2.1 — Website CMS foundation

Delivered in this batch:

- Admin navigation entry: **Content & SEO → Website Editor**.
- Real PostgreSQL tables for CMS documents and immutable revision history.
- Admin-only draft, publish and restore RPCs.
- Public RPC that returns published JSON only.
- Homepage hero text and CTA editing.
- Private draft save, explicit publish, preview and revision rollback.
- Existing source content remains the frontend fallback if the CMS is unavailable.
- Current production hero content is seeded unchanged, so activation causes no unreviewed buyer-facing copy change.

## Security model

- Direct anonymous table access is revoked.
- Authenticated non-admin users cannot read drafts or revisions.
- CMS mutations check the live `user_roles` admin role inside SECURITY DEFINER functions.
- Public visitors receive `published_content` only.
- Draft saves never change the public website.
- Every save, publish and restore creates a revision record.

## Remaining Phase 2 batches

### Batch 2.2 — Catalog control

- Finish Products CRUD against the database.
- Finish Categories CRUD and hierarchy control.
- Publish/unpublish, ordering, SEO fields and safe image selection.
- Make public catalog routes read the database as the authoritative source with a controlled fallback/cutover.

### Batch 2.3 — Content and SEO CMS

- Blog CRUD.
- FAQ CRUD.
- SEO override editor.
- Internal-link editor.
- Country/landing-page content controls.

### Batch 2.4 — Media, global settings and release control

- Media library and image metadata.
- Header, footer, contact, social and legal settings.
- Page-section visibility and ordering.
- Full preview, publish queue, audit log and rollback QA.

## Operational rule

The admin must never report a website change as live until the publish RPC succeeds and the public published-content endpoint returns the new version.
