# Lead Outreach V3 Clean Rebuild — 2026-07-14

This replacement was rebuilt from latest `main` instead of merging the conflicted 47-commit PR #288.

Safety contracts:
- Maximum 25 candidate activations and 25 draft generations per owner checkpoint.
- One global running activation batch; stale batches close after 15 minutes.
- Candidate claims are atomic and are released in `finally`.
- Unexpected activation failures persist a failed/partial checkpoint.
- One authoritative `approve_and_send` action requires explicit owner confirmation.
- Email uses deterministic Gmail Message-ID recovery.
- WhatsApp records a primary attempt before sending and blocks automatic duplicate retries.
- No candidate activation, external email, WhatsApp message, or production deployment is performed by this commit.

Connector verification:
- The feature was rebuilt from the then-current `main` head rather than merging the conflicted historical branch.
- One-time build and diagnostic workflows self-deleted after use.
- Unrelated `package-lock.json` drift was removed before final CI.
- Only the reviewed lead intake, candidate activation, private attachment, owner-approved outreach, tests, documentation, Edge Functions and ordered migrations remain in the PR.
