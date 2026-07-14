# Irha Apparels — Production Operating Method Lock

_Status: mandatory for website, admin, Supabase, GitHub, Cloudflare, automation and data work._

## 1. Source of truth

- Application source: `irhaapparelsofficial-ctrl/irha-global-craft-f3881330` on `main`.
- Production backend: Supabase project `pvzjiozismyxqrzmtfbi`.
- Production frontend: Cloudflare Pages serving `irhaapparels.com`; `www` must permanently redirect to the same apex path/query.
- A release is complete only when production `build.json` and deployment evidence match the approved GitHub SHA and fingerprint.

## 2. Mandatory workflow

1. Read current production evidence and run preflight checks.
2. Use one focused branch and small reversible commits.
3. Sync the latest `main` before final validation.
4. Require the full Quality Gate: source lock, secret scan, migration order, TypeScript, tests, production build, release identity and legacy-claim guard.
5. Apply only additive/idempotent database migrations and deploy Edge Functions after the source gate is green.
6. Deploy the exact approved merge commit to Cloudflare.
7. Verify apex, `www`, Pages, critical routes, runtime headers and exact SHA/fingerprint.
8. Run controlled positive and failure-path production smoke tests.
9. Remove every synthetic QA record and record remaining blockers honestly.

## 3. Safety rules

- Never perform a large one-shot migration when atomic batches are possible.
- Never delete or replace production data without a verified checkpoint and rollback path.
- Never invent product specifications, pricing, MOQ, lead time, certification, buyer contact or provider status.
- Never expose service-role credentials, unrestricted admin RPCs or anonymous direct-table writes.
- External email, WhatsApp, social publishing, quotations, prices and commercial commitments require owner approval and provider receipts.
- Retries must be bounded and idempotent; failures must not create duplicate sends or data loss.
- Introduce new buyer features independently where possible so existing journeys remain available.

## 4. Release acceptance criteria

A task is complete only when all applicable checks pass:

- Code is merged to current `main`.
- Quality Gate is green on the final combined source.
- Database/function source and production state match.
- Cloudflare serves the approved SHA/fingerprint.
- Apex works and `www` redirects canonically.
- Buyer-critical routes return successful responses.
- Auth/RLS positive and negative paths are verified.
- End-to-end buyer journeys are verified.
- Synthetic data is removed.
- External/provider blockers are explicitly listed.
- A documented rollback route exists.

## 5. Locked operational posture

- Public website: real B2B inquiry, catalogue, AI Guide and human-chat journeys; no fixed commercial promises.
- Admin: authenticated owner/admin controls with human live-chat replies and internal notifications.
- Outreach/social: prepare and review safely; never claim send/publish without verified provider results.
- Email queue: disabled until a verified sending provider and owner approval are present.
- Monitoring may recover stale internal work but must never autonomously make commercial commitments.

Any exception must be documented in the related pull request with its reason, risk, owner approval, validation and rollback plan.
