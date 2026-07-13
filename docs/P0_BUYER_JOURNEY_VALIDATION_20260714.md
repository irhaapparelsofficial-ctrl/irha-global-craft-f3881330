# P0 Buyer Journey Validation — 14 July 2026

## Scope

This checkpoint starts the P0 release-integrity phase from the latest source that includes the consolidated release, completed Bavarian product ranges and the mobile Bavarian hero readability repair.

The goal is to prove buyer-critical backend journeys using controlled requests, remove test data after verification, and add automated contracts that prevent silent regression.

## Baseline

- Owner Supabase project: `pvzjiozismyxqrzmtfbi`.
- Public gateway: `public-lead-gateway`.
- Public chat function: `chat` version `2` after this checkpoint.
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

### 4. Website chat response and persistence

The public chat Edge Function was upgraded before testing. It remains backward compatible with the currently published frontend, while the next frontend release will send the real browser session ID explicitly.

A controlled chat request was then sent using the approved production origin.

- HTTP request ID: `30`.
- HTTP status: `200`.
- Timed out: `false`.
- Response content type: `text/event-stream`.
- Provider header: `X-Irha-AI-Provider: deterministic-backup`.
- Response gave the expected safe sampling guidance without requiring a paid AI service.
- CORS response allowed only `https://irhaapparels.com` for this request.
- One user message and one assistant message were verified in `public.chat_messages` under session `p0-chat-audit-20260714`.

## Cleanup

The controlled production records were deleted after verification:

- Inquiry rows removed: `1`.
- Catalogue lead rows removed: `1`.
- Chat message rows removed: `2`.
- Storage test objects created: `0`.

No genuine buyer, lead, catalogue, chat, product, media or production record was changed.

## Failure-path defects found and repaired

### Public inquiry and catalogue fallback

The frontend previously attempted direct anonymous inserts into `inquiries` and `catalogue_leads` if the Edge Function was missing. Production RLS intentionally has no public INSERT policies for these tables, so the fallback could not work. It also created design drift away from server validation and rate limiting.

Repair:

- Removed anonymous direct-insert fallbacks.
- All public submissions remain behind `public-lead-gateway`.
- Missing-gateway failures now produce honest, buyer-readable retry/WhatsApp guidance.
- Secure file uploads retain the submit-without-file fallback message.

### Website chat persistence and runtime identity

The public chat frontend previously attempted anonymous inserts into `chat_messages`, but production RLS intentionally has no public INSERT policy. These writes failed silently, which is why the admin chat table remained empty. The frontend also constructed the chat URL from Lovable-managed `VITE_SUPABASE_*` values instead of the immutable owner runtime.

Repair:

- Chat messages are now inserted by the `chat` Edge Function with the server role after validation.
- The function stores the latest user message and the exact assistant response as one exchange.
- The function uses Gemini free tier only when configured and automatically returns a deterministic safe response otherwise.
- Personal email, phone and URL patterns are redacted before any text is sent to the external AI provider.
- Origin checks, request-size limits, message limits and per-instance rate limits remain active.
- Legacy published clients without a session ID receive a stable hashed legacy session, preventing a breaking production deployment.
- The new frontend uses `supabaseRuntimeUrl` and `supabasePublishableKey` from the immutable owner client.
- The new frontend no longer writes directly to `chat_messages`.
- The chat UI now discloses that messages may be stored for service follow-up.

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
- Public chat stays on the owner Supabase runtime.
- Public chat has no anonymous direct-table write.
- Chat server persistence, allowed-origin enforcement and deterministic fallback remain present.
- Custom Lab remains independent of the Lovable paid AI gateway.
- Frontend remains pinned to the owner-controlled Supabase project.

## Not yet claimed as passed

The following require further P0 work and are not falsely certified by this checkpoint:

- Actual browser submission from the live Lovable production build.
- Uploading real file bytes through the browser-signed upload URL.
- Visual/mobile layout on current production across iPhone and desktop.
- Visual confirmation of the persisted chat exchange in the authenticated admin interface.
- Every product, category, comparison, shortlist and download interaction.
- Authenticated admin create/edit/delete/export journeys.
- Exact live source parity before the final one-time Lovable update.

## Rollback

- Revert the focused pull request to restore the previous frontend helper, chat client and tests.
- The previous `chat` Edge Function source is available in main commit `db9363b0ed7d9a61079e12cf3b9ea73af9968859` and can be redeployed if required.
- No database migration is part of this checkpoint.
- No production data restoration is required because controlled test records were removed.
