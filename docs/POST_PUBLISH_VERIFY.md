# Post-Publish Verification

- Release to verify after the next explicit owner publish: `frontend-live-2026-07-13-r11`
- Plain-text marker: `IRHA_FRONTEND_LIVE_2026_07_13_R11`
- Published source expected: latest merged `main`
- Primary production URL: https://www.irhaapparels.com
- Alias: https://irhaapparels.com
- Target Supabase project: `pvzjiozismyxqrzmtfbi`
- Checks: release/Lovable-project/repository/Supabase identity, bounded propagation, apex/www consistency, crawler controls, critical pages, catalogue reads, authentication page and public lead gateway.

The **Production Smoke** workflow is intentionally manual and strict. Normal pull requests and code commits do not call the unpublished live domain. After the owner confirms Lovable Update/Publish, dispatch the workflow with the R11 release markers and review its evidence.
