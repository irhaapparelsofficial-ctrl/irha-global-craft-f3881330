# Post-Publish Verification

- Triggered at: 2026-07-12T18:41:00Z
- Published source expected: latest synced `main`
- Published application commit: `8f1853a1bb6041a7d4e6d2edf2cd836ad9167f03`
- Smoke logic commit: `db8e301a3e5db29ece4b501699b2f48f80614614`
- Primary production URL: https://www.irhaapparels.com
- Alias: https://irhaapparels.com
- Checks: authoritative build identity, homepage shell, apex/www deployment consistency, crawler controls, lead gateway, critical production pages.

This marker runs the corrected Production Smoke. Normal PRs and code commits do not trigger the live verification workflow.
