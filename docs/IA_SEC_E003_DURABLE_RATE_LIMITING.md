# IA-SEC-E003 — Durable Distributed Rate Limiting

## Scope

This control remediates SEC-M03 for:

- `generate-mockup`
- `site-visitor`
- `live-chat`

It does not change unrelated Edge Functions, product/category data, localization, SEO routing, Storage media, Auth configuration, notification-dispatcher authorization, or later security findings.

## Selected algorithm

The implementation uses atomic dual fixed windows in PostgreSQL:

1. a short burst window;
2. a sustained-use window;
3. an optional duplicate-request window;
4. a policy-wide global safety window;
5. a reversible temporary-block record after repeated or extreme violations.

`public.consume_edge_rate_limit` performs all bucket consumption and the decision inside one database transaction. Bucket rows use `INSERT ... ON CONFLICT DO UPDATE`; callers do not read and then write counters in application code. The RPC returns only:

- `ALLOW`, `THROTTLE`, or `TEMPORARY_BLOCK`;
- bounded retry-after seconds;
- remaining capacity;
- duplicate-suppression status;
- optional block expiry.

The design intentionally avoids a more complex sliding-window or external service because current traffic and Free-plan protection requirements are satisfied by deterministic dual windows and a global guard.

## Identity hierarchy

The shared Edge service derives a HMAC subject in this order:

1. a Supabase user ID only after `auth.getUser` validates a real authenticated access token;
2. a server-signed anonymous rate token bound to the endpoint and client session ID;
3. a conservative first-request bootstrap identity derived from the endpoint and client session ID;
4. endpoint-specific secondary material, such as the existing high-entropy live-chat visitor token;
5. resource and duplicate-request hashes where the action requires them.

All persisted subject, resource, and duplicate keys are keyed HMAC-SHA-256 values with domain separation. Raw IP addresses, authorization headers, session IDs, visitor tokens, chat text, mockup payloads, and secrets are not stored in limiter state or metrics.

## Trusted and rejected request information

### Trusted

- Supabase Auth user identity after server-side validation;
- server-issued and HMAC-signed anonymous rate token;
- validated endpoint-specific client session ID;
- existing live-chat visitor token as secondary, HMAC-only material;
- bounded normalized resource/request content for HMAC fingerprints;
- request origin only for CORS;
- content length only for payload-size rejection.

### Not authoritative identity

The limiter does not use these client-controllable or deployment-chain headers as subject identity:

- `x-forwarded-for`
- `x-real-ip`
- `cf-connecting-ip`
- `true-client-ip`
- `x-client-ip`
- custom user, account, or session headers

A change to any of those headers does not change the derived rate-limit subject.

## Endpoint policies

| Policy | Burst | Sustained | Duplicate | Global ceiling | Block |
|---|---:|---:|---:|---:|---:|
| `generate-mockup.generate` | 6 / 60 s | 24 / 900 s | 2 / 300 s | 120 / 600 s | 600 s |
| `site-visitor.arrive` | 4 / 300 s | 12 / 86,400 s | 1 / 86,400 s | 6,000 / 600 s | 900 s |
| `site-visitor.heartbeat` | 12 / 300 s | 240 / 7,200 s | 1 / 30 s | 15,000 / 600 s | 600 s |
| `site-visitor.chat_open` | 6 / 600 s | 24 / 86,400 s | 1 / 120 s | 3,000 / 600 s | 900 s |
| `live-chat.presence` | 6 / 600 s | 20 / 86,400 s | 1 / 300 s | 3,000 / 600 s | 900 s |
| `live-chat.connect` | 4 / 600 s | 12 / 86,400 s | 2 / 300 s | 1,500 / 600 s | 900 s |
| `live-chat.send` | 8 / 60 s | 60 / 900 s | 1 / 86,400 s | 5,000 / 600 s | 900 s |
| `live-chat.poll` | 40 / 60 s | 450 / 900 s | none | 30,000 / 600 s | 300 s |

Thresholds preserve normal B2B buyer bursts while bounding repeated generation, analytics amplification, chat-session creation, message spam, and polling abuse.

## Failure behavior

### Fail closed

`generate-mockup` and `live-chat` return HTTP 503 without beginning expensive rendering or protected database writes when the durable store is unavailable.

Actual throttling or temporary blocking returns HTTP 429 with a bounded `Retry-After` header and a generic public error. Policy keys and identity hashes are not disclosed.

### Deliberately fail open by dropping analytics

`site-visitor` must never become a page-rendering dependency. If the durable store is unavailable, it returns HTTP 200 with a dropped-event marker and performs no analytics or notification write. Duplicate analytics events are also acknowledged and dropped before database work.

This fallback preserves buyer experience without reverting to isolate memory or amplifying database growth.

## Duplicate suppression and reuse

- Custom Lab hashes the normalized design request before rendering. The browser keeps only the last deterministic result in bounded `sessionStorage`, so an identical legitimate retry can be reused without another Edge invocation.
- `site-visitor` suppresses redundant action/path events.
- `live-chat` uses `clientMessageId` when present, otherwise a normalized action/message/request fingerprint. Duplicate message writes are suppressed before database mutation.

## Escalation

Implemented states are:

- `ALLOW`
- `THROTTLE`
- `TEMPORARY_BLOCK`

Blocks are endpoint-specific, time-bounded, reversible, and keyed by an HMAC subject rather than a raw IP address. Shared networks are therefore not permanently blocked based solely on network address.

A `CHALLENGE` state is not asserted because no verified CAPTCHA/challenge verification service is currently configured for these public workflows. Challenge integration must be a separate authorized change if such infrastructure is introduced.

## Storage, retention, and observability

Private relations:

- `private.edge_rate_limit_policies`
- `private.edge_rate_limit_state`
- `private.edge_rate_limit_metrics_hourly`

Browser roles have no direct table access. The consume and cleanup RPCs are service-role-only, use fixed `search_path`, validate bounded parameters, and contain no dynamic SQL.

Limiter rows carry explicit expiry. The existing weekly `irha-operations-cleanup` cron remains one of eight jobs and also invokes `public.cleanup_edge_rate_limit_state(5000)`. Cleanup uses ordered, `SKIP LOCKED`, bounded batches. Hourly aggregate metrics are retained for 30 days.

Metrics contain only policy, decision, counts, duplicate-suppression totals, maximum retry-after, and timestamps. They do not contain identity hashes, IP addresses, chat messages, mockup payloads, authorization values, or secrets.

## Production verification

After migration synchronization and deployment of only the three changed functions:

1. confirm project identity is `pvzjiozismyxqrzmtfbi`;
2. confirm all private tables have RLS enabled and no browser policies;
3. confirm `anon` and `authenticated` cannot execute the consume or cleanup RPCs;
4. confirm both RPCs have fixed `search_path`;
5. run bounded same-subject parallel calls and verify no over-admission;
6. verify different subjects and policies remain isolated;
7. verify expiry reset, duplicate suppression, temporary-block expiry, and bounded cleanup;
8. verify changed forwarding headers do not change the subject decision;
9. verify rejected mockup calls do not begin PNG work;
10. verify analytics limiter failure drops writes without affecting the page;
11. verify normal live-chat bursts, polling, and duplicate messages;
12. confirm the cron-job count remains exactly eight;
13. remove internal test state;
14. run the full Quality Gate, migration-ledger/type freshness, deployment-manifest parity, secret scan, source-map audit, exact-live proof, and requested production regressions.
