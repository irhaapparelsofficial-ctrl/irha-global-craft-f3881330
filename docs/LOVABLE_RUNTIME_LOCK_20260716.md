# Lovable runtime default-deny lock — 2026-07-16

- Every Edge Function source that reads `LOVABLE_API_KEY` now uses `irhaLovableRuntimeKey()`.
- The helper returns no key unless `IRHA_ENABLE_LOVABLE_RUNTIME=true` is explicitly configured.
- That new enable flag is not part of the normal production configuration.
- Missing alternative provider credentials continue to use existing safe fallback/error paths.
- Sitemap scheduler RPCs are moved to service-role-only access.

Patched source files: 14
