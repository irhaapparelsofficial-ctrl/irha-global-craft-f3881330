# Phase 3 / Batch 3.2 — Buyer 360

## Delivered frontend

Admin → **Buyer 360** unifies buyer context without copying, deleting or silently merging the original CRM source rows.

Each buyer workspace includes:

- original identity, company, country, product interest, quantity, stage, priority and follow-up;
- direct email, phone, WhatsApp, website and quotation links;
- multiple named buyer contacts with role, email, phone, WhatsApp and LinkedIn;
- private pinned/unpinned notes;
- combined timeline from CRM activities, tasks and notes;
- private buyer file area with category and description;
- five-minute signed file access;
- deterministic duplicate suggestions based on exact email, phone, business domain or normalized company plus country;
- manual **Link as duplicate** / **Not duplicate** review.

Confirming a duplicate only stores a relationship. It never merges fields, moves activity, overwrites a source record or deletes data.

## Backend prepared, not applied

Migration: `20260713050000_buyer_360.sql`

It prepares:

- `crm_contacts`;
- `crm_notes`;
- `crm_files`;
- `crm_record_links`;
- admin-only RLS and actor/update triggers;
- Buyer 360 activity events;
- private `crm-private-files` bucket;
- 25 MB limit and explicit file-type allow-list;
- admin-only storage read/insert/delete policies.

Per owner instruction, no database was queried or changed during this batch. All backend changes remain versioned for the final one-time activation.

## Safety

- Duplicate review requires evidence and owner confirmation.
- Public/free email domains are not treated as company-domain evidence.
- Weak company-only matches across different countries are not suggested.
- Private files never receive a public URL.
- Signed URLs expire after five minutes.
- Unsupported or oversized files are rejected before upload and by storage policy.
- No external communication or commercial action is executed from Buyer 360.

## Phase 3 progress

- **3.1** Sales Pipeline & CRM Tasks — complete
- **3.2** Buyer 360 — this batch
- **3.3** Meetings, samples, quotations and commercial follow-up integration — next
- **3.4** Daily owner dashboard, reports, saved views and team usability — remaining
