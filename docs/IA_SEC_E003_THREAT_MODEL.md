# IA-SEC-E003 Endpoint Threat Model

## `generate-mockup`

| Dimension | Decision |
|---|---|
| Protected resource | Edge invocation time, deterministic PNG rendering, response egress, buyer-facing Custom Lab availability |
| Abuse actors | Anonymous automation, parallel clients, session rotation, repeated identical designs, oversized requests |
| Identity dimensions | Validated user ID; signed anonymous session; bootstrap session using the same subject bucket; normalized design/resource hash; global policy bucket |
| Burst allowance | 6 requests per 60 seconds |
| Sustained allowance | 24 requests per 15 minutes |
| Duplicate allowance | 2 identical normalized designs per 5 minutes |
| Temporary block | 10 minutes after repeated or extreme violations |
| Retention | Expiry-aware bucket rows plus weekly bounded cleanup; 30-day hourly summaries |
| Failure behavior | Fail closed before PNG rendering with HTTP 503 when the durable store is unavailable |
| Legitimate workflow | A buyer can try several products, colors, placements, and presets in a normal design session; one cached deterministic result is reused for an identical retry |

The renderer has no external AI/provider dependency and currently writes no Storage object, but unbounded calls still consume Edge execution and response egress. Payload size remains capped before limiter work.

## `site-visitor`

| Dimension | Decision |
|---|---|
| Protected resource | `site_visitors` growth, CRM notification writes, notification-dispatcher calls, analytics usefulness |
| Abuse actors | Bots, duplicate browser lifecycle events, rapid page transitions, session rotation, scripted arrival/chat-open spam |
| Identity dimensions | Signed/bootstrapped visitor session; action and normalized path hash; action-specific global bucket |
| Burst allowance | Action-specific: arrival 4/5 minutes, heartbeat 12/5 minutes, chat-open 6/10 minutes |
| Sustained allowance | Arrival 12/day, heartbeat 240/2 hours, chat-open 24/day |
| Duplicate allowance | Arrival 1/day, heartbeat 1/30 seconds, chat-open 1/2 minutes |
| Temporary block | 10–15 minutes, action-specific |
| Retention | Expiry-aware bucket rows plus weekly bounded cleanup; 30-day hourly summaries |
| Failure behavior | Analytics is non-critical: return success, drop the event, and perform no database/notification write if the durable store is unavailable |
| Legitimate workflow | A normal buyer may browse many pages; heartbeats remain available while redundant lifecycle events are suppressed |

Individual raw events are retained only by the existing business analytics tables. The limiter itself stores no raw visitor identity or IP address. Dropping duplicates and unavailable-store events prevents analytics from becoming a page-rendering dependency or database amplifier.

## `live-chat`

| Dimension | Decision |
|---|---|
| Protected resource | Chat session/message tables, owner notifications, polling invocations, administrative workload, buyer support availability |
| Abuse actors | Message spam, session creation spam, duplicate submissions, oversized messages, rapid polling, automated profile/connect requests |
| Identity dimensions | Signed/bootstrapped chat session; existing high-entropy visitor token as secondary HMAC material; action/resource hash; client message ID or normalized request hash; global action bucket |
| Burst allowance | Presence 6/10 minutes, connect 4/10 minutes, send 8/minute, poll 40/minute |
| Sustained allowance | Presence 20/day, connect 12/day, send 60/15 minutes, poll 450/15 minutes |
| Duplicate allowance | Presence 1/5 minutes, connect 2/5 minutes, send 1/day per duplicate fingerprint, no duplicate bucket for polling |
| Temporary block | 5–15 minutes, action-specific |
| Retention | Expiry-aware bucket rows plus weekly bounded cleanup; 30-day hourly summaries |
| Failure behavior | Fail closed before session/message/notification access with HTTP 503 when the durable store is unavailable |
| Legitimate workflow | Genuine buyers retain normal conversational bursts and polling cadence; duplicate submissions return the existing conversation without another write |

Messages remain capped at 2,000 characters and request bodies at 16,000 bytes. Temporary blocks are scoped to an HMAC subject and endpoint action, not a raw IP address, reducing shared-network false positives.

## Escalation and challenge boundary

The current evidence supports `ALLOW`, `THROTTLE`, and reversible `TEMPORARY_BLOCK`. No verified CAPTCHA or server-side challenge verifier is configured for these endpoints, so this execution does not claim or fabricate a `CHALLENGE` implementation. A challenge can be introduced later only through a separately authorized security change with verified server-side validation.
