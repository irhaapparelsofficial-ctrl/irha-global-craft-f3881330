# Irha Apparels — Production Operating Method Lock

_Status: mandatory for website, admin, Supabase, GitHub, Cloudflare, automation and data work._

## 1. Source of truth

- Application source of truth: `irhaapparelsofficial-ctrl/irha-global-craft-f3881330` on `main`.
- Production database and Edge Functions: Supabase project `pvzjiozismyxqrzmtfbi`.
- Public deployment target: Cloudflare Pages project serving `irhaapparels.com`, `www.irhaapparels.com` and `irha-apparels.pages.dev`.
- A release is not called complete until the served `build.json` SHA and fingerprint match the approved GitHub commit.

## 2. Change workflow

1. Run preflight checks and read current production evidence.
2. Work on one focused branch with small, reversible commits.
3. Sync the latest `main` before final validation.
4. Require the full Quality Gate: source lock, secret scan, migration order, TypeScript, tests, production build, release identity and claims guard.
5. Apply additive/idempotent Supabase migrations and deploy functions only after the source gate is green.
6. Deploy the exact approved merge commit to Cloudflare.
7. Verify apex, `www`, Pages, critical routes, runtime headers and exact build SHA/fingerprint.
8. Run controlled end-to-end production smoke tests and remove all synthetic data.
9. Record blockers honestly; never mark drafts, queues or configured code as externally delivered work.

## 3. Safety rules

- Never perform a large one-shot migration when an atomic batch is possible.
- Never delete or replace production data without a verified backup/checkpoint and rollback route.
- Never invent product specifications, pricing, MOQ, lead time, certifications, contacts or provider status.
- Never expose service-role credentials, unrestricted admin RPCs or direct anonymous table writes.
- External email, WhatsApp, social publishing, quotations, pricing and commercial commitments require owner approval and verified provider evidence.
- Automatic retries must be bounded and idempotent. Failed work must remain recoverable without duplicate sends or data loss.
- Existing buyer journeys must remain available while new functionality is introduced independently whenever possible.

## 4. Release acceptance criteria

A task is complete only when all applicable items are true:

- Code is merged to current `main`.
- Quality Gate is green on the final combined source.
- Database/function source and production state match.
- Cloudflare serves the exact approved SHA and fingerprint on apex, `www` and Pages.
- Buyer-critical routes return successful responses.
- Authentication and RLS negative tests deny unauthorized access.
- End-to-end positive and failure paths are verified.
- Synthetic QA records are removed.
- Remaining external/provider blockers are listed explicitly.
- A rollback path exists and does not depend on undocumented manual steps.

## 5. Locked operational posture

- Public website: real B2B inquiry/catalogue/chat journeys; no fixed commercial promises.
- Admin: owner-controlled business operations with authenticated role checks.
- Outreach/social: prepare and review safely; do not claim send/publish without provider receipts.
- Email queue: stays disabled until a verified sending provider and owner approval are present.
- Monitoring: health checks may detect and recover stale internal work, but must not autonomously make commercial commitments.

Any future exception to this method must be documented in the related pull request with the reason, risk, owner approval, validation and rollback plan.
