# Runtime application-error recovery — 2026-07-16

## Incident

The mobile browser displayed a recoverable application-error page with incident reference `IRHA-MRMM60AY-ZQYHX6`. The old boundary created that reference only inside the browser and wrote details to the local console, so the owner/admin could not retrieve it later.

## Live backend recovery

The owner Supabase project now contains a private `app_runtime_incidents` table and a tightly scoped public RPC named `record_public_app_incident`.

The RPC:

- validates the `IRHA-...` incident reference and public route;
- sanitizes error text, component stack, user agent and source SHA;
- rate-limits public reports through the existing submission limiter;
- stores incident rows behind RLS with no direct anonymous table access;
- creates an unread `Website application error` notification using the existing `system` notification contract.

The screenshot incident was registered manually because the old frontend did not report it automatically. QA incidents and notifications were removed after verification.

## Frontend recovery

The application error boundary now:

- reports the incident through a direct REST RPC call using only the owner Supabase publishable `apikey` header;
- never sends the publishable key in an `Authorization: Bearer` header;
- redacts long token-like values before reporting;
- performs one automatic reload for recognized stale/dynamic asset failures;
- prevents reload loops with a five-minute session guard;
- lets the user copy the incident reference.

## Validation

- isolated strict TypeScript compilation: passed;
- recovery, sanitization and RPC transport contract: passed;
- public `anon` role RPC execution: passed;
- linked unread owner notification: passed;
- QA cleanup: passed.

The Cloudflare production frontend still requires an exact-main deployment before these browser-side changes become live.
