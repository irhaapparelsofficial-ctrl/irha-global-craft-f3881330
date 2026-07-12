# Post-Publish Verification

- Triggered at: 2026-07-12T18:06:00Z
- Owner publish confirmation: received
- Published source expected: latest synced `main`
- Primary production URL: https://www.irhaapparels.com
- Alias: https://irhaapparels.com
- Checks: release/project/repository identity, propagation, apex/www consistency, crawler controls, lead gateway, critical production pages.

This marker-only change triggers Production Smoke through a dedicated pull request. Normal code pull requests do not run the live-production gate.
