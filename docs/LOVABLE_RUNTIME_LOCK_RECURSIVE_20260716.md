# Recursive Lovable runtime default-deny lock — 2026-07-16

- Every TypeScript/JavaScript file under `supabase/functions` is scanned recursively.
- `LOVABLE_API_KEY` is unavailable unless `IRHA_ENABLE_LOVABLE_RUNTIME=true` is explicitly configured.
- The normal production configuration does not include that opt-in.
- Modular chat provider files are covered.
- Existing non-Lovable fallback paths remain unchanged.
- Sitemap implementation RPCs become service-role-only.

Patched source files: 14
