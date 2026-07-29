# IA-CONTENT-E001 — Rollback readiness

Rollback boundary is limited to the focused content-and-branding PR.

If a rendering or navigation regression is detected:

1. Revert the merge commit for the focused PR.
2. Preserve unrelated main-branch commits and Supabase state.
3. Re-run Quality Gate and the existing immutable Cloudflare production workflow.
4. Verify the restored exact SHA on pages.dev, apex and www canonical redirect.

No database migration, Supabase billing change, Cloudflare billing change, taxonomy remap or source product-media mutation is part of this execution.
