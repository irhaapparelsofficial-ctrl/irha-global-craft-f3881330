# P0 Buyer Journey Validation — 14 July 2026

## Scope

This checkpoint starts the P0 release-integrity phase from the latest source that includes the consolidated release, completed Bavarian product ranges and the mobile Bavarian hero readability repair.

The goal is to prove buyer-critical backend journeys using controlled requests, remove test data after verification, and add automated contracts that prevent silent regression.

## Baseline

- Owner Supabase project: `pvzjiozismyxqrzmtfbi`.
- Public gateway: `public-lead-gateway`.
- Public upload bucket: private `inquiry-uploads`.
- No paid integration was enabled or purchased.
- The focused pull request is responsible for certifying the latest combined source because the latest direct main commit did not have its own workflow run at branch creation time.

## Controlled production-backend tests

### 1. Inquiry submission

A controlled request was sent to the production `public-lead-gateway` using the public application key and approved production origin.

- HTTP request ID: `27`.
- HTTP status: `200`.
- Timed out: `false`.
- Response reference: `IRQ-P0-AUDIT-20260714`.
- Database record verified in `public.inquiries`.
- Verified server metadata: `server_validated: true`.
- Verified company, country, email, source and inquiry reference mapping.

### 2. Catalogue request

A controlled catalogue request was sent through the same gateway.

- HTTP request ID: `28`.
- HTTP status: `200`.
- Timed out: `false`.
- Returned lead ID: `a49a3de9-ed6a-4231-bb85-d44d8e4d8632`.
- Database record verified in `public.catalogue_leads`.
- Verified company, country, category interest, catalogue URL, source and language mapping.

### 3. Private upload ticket

A controlled signed-upload request was sent for a 1 KB PDF specification file.

- HTTP request ID: `29`.
- HTTP status: `200`.
- Timed out: `false`.
- Bucket returned: `inquiry-uploads`.
- Generated path was restricted to `requests/inquiry/2026-07/...pdf`.
- A signed upload token was returned.
- No test file bytes were uploaded, so no test storage object was created.

## Cleanup

The controlled production records were deleted after verification:

- Inquiry rows removed: `1`.
- Catalogue lead rows removed: `1`.
- Storage test objects created: `0`.

No genuine buyer, lead, catalogue, product, media or production record was changed.

## Failure-path defect found and repaired

The frontend previously attempted direct anonymous inserts into `inquiries` and `catalogue_leads` if the Edge Function was missing. Production RLS intentionally has no public INSERT policies for these tables, so the fallback could not work. It also created design drift away from server validation and rate limiting.

Repair:

- Removed anonymous direct-insert fallbacks.
- All public submissions remain behind `public-lead-gateway`.
- Missing-gateway failures now produce honest, buyer-readable retry/WhatsApp guidance.
- Secure file uploads retain the submit-without-file fallback message.

## Automated contracts added

### Gateway unit coverage

- Inquiry action and generated reference.
- Catalogue action.
- Missing-function failure behaviour.
- Confirmation that no direct table insert is attempted.
- Signed private upload ticket and safe returned metadata.

### Platform source contracts

- Primary buyer routes remain mounted.
- Privacy, terms and catalogue compatibility routes remain present.
- Public functions remain deliberately unauthenticated only where required.
- Admin and email-processing functions remain JWT-protected.
- Public form server validation, rate limiting and private uploads remain present.
- Custom Lab remains independent of the Lovable paid AI gateway.
- Frontend remains pinned to the owner-controlled Supabase project.

## Not yet claimed as passed

The following require further P0 work and are not falsely certified by this checkpoint:

- Actual browser submission from the live Lovable production build.
- Uploading real file bytes through the browser-signed upload URL.
- Visual/mobile layout on current production across iPhone and desktop.
- Chat message persistence and admin display.
- Every product, category, comparison, shortlist and download interaction.
- Authenticated admin create/edit/delete/export journeys.
- Exact live source parity before the final one-time Lovable update.

## Rollback

- Revert the focused pull request to restore the previous frontend helper and remove the tests.
- No database migration is part of this checkpoint.
- No production data restoration is required because controlled test records were removed.
