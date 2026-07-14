# Lead and Outreach Safety Guards — 2026-07-14

- Buyer CRM activation is capped at 25 candidates per owner-confirmed checkpoint.
- Candidate activation uses short-lived atomic claims with stale-lock recovery.
- Same-campaign staging keeps fingerprint and contact-route duplicate checks active.
- External dispatch requires server-side owner confirmation and an optimistic state claim.
- WhatsApp primary-send attempts are never automatically retried; partial or uncertain delivery becomes manual-required.
- No migrations were applied, no candidates were activated, and no external message was sent by this commit.
