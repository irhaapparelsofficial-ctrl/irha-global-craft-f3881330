# Final Repair Certification — 2026-07-13

This checkpoint was created from current `main` at commit `fbbc9f7ef50bcdb87054ba662c18cf881d3686b0` after the coordinated Gmail/GitHub failure review.

## Repairs present in the certified source

- Canonical sitemap verification accepts the apex homepage with or without a trailing slash and continues to reject `www` sitemap URLs.
- The existing Quality Gate remains the single build gate; overlapping diagnostic workflows were closed without merging.
- Bavarian Drive media import and release evidence are merged.
- The Drive importer remains manual-only and retries batches that still contain download failures.
- Permanent Bavarian importer safety assertions are included in the Quality Gate.
- CRM meeting outcomes, quotation handoff and exact-duplicate buyer safety are merged.
- Stale execution-status and temporary build-marker pull requests were closed instead of polluting production history.

## Certification rule

This file is not evidence by itself. The pull request containing it must pass the complete Quality Gate: clean install, deployment-source lock, Bavarian importer safety, typecheck, tests, production build, built release identity/canonical verification and legacy-claim guards. Merge is permitted only after every required step succeeds.

Live deployment and DNS parity remain a separate production smoke check and are not claimed by this repository-only certification.
