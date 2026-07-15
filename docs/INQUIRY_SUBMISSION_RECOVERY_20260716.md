# Inquiry submission recovery — 2026-07-16

## Root cause

The production inquiry wizard submitted directly to `public.inquiries` through PostgREST. Production RLS intentionally had no anonymous insert policy because public submissions are meant to pass through the deployed `public-lead-gateway`. The direct browser insert was therefore rejected and the buyer saw `Submission failed`.

## Immediate production recovery

Applied owner-Supabase migration `restore_safe_public_inquiry_compatibility_20260716` on project `pvzjiozismyxqrzmtfbi`:

- anonymous role has `INSERT` only on `public.inquiries`;
- no anonymous select, update, delete, truncate, references or trigger privilege;
- the compatibility policy accepts only `source = 'inquiry-wizard'` with valid buyer/contact fields, allowed intent, valid inquiry reference and untouched CRM/admin defaults;
- existing `validate_public_inquiry_insert()` still normalizes input and performs server-side rate limiting;
- existing `crm_new_inquiry_notification_trigger` creates an unread Owner CRM notification after a successful insert.

## Runtime verification

A controlled anonymous-role submission was accepted with status `new`, and an unread `New buyer inquiry` CRM notification was created for the same source ID. The QA inquiry and notification were deleted after verification. Two older labelled orphan QA notifications were also removed; no buyer/customer record was changed.

## Permanent transport

`createIrhaFetch()` now reroutes only PostgREST inquiry inserts whose source is `inquiry-wizard` to the deployed `public-lead-gateway`. All other Supabase traffic passes through unchanged. This lets the current page implementation use the secure service after the next frontend release while preserving the live compatibility policy as a rollback path.

## Buyer and owner receipt

A successful buyer submission changes the page to `Inquiry received` and shows an `IRQ-...` reference number. The same record appears for authenticated admins in Buyer Inbox, and the Owner CRM receives an unread `New buyer inquiry` notification. Uploaded inquiry files remain private and are opened through short-lived signed URLs.

## Validation

- Isolated strict TypeScript check: passed.
- Inquiry transport Vitest: 3/3 passed.
- Live anonymous-role insert: passed.
- Inquiry row / notification linkage: passed.
- QA cleanup: passed.

GitHub-hosted full CI remains externally blocked by the account Actions-minute quota; no false green claim is made.
