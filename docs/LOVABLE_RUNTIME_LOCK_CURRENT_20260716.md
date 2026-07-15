# Lovable runtime default-deny lock — current main — 2026-07-16

- Existing Edge Function provider fallbacks remain intact.
- `LOVABLE_API_KEY` resolves only when `IRHA_ENABLE_LOVABLE_RUNTIME=true` is explicitly added.
- The new opt-in flag is absent from normal production configuration.
- Sitemap Vault token, queue and finalizer architecture is preserved.
- All scheduler SECURITY DEFINER RPCs become service-role-only.

Patched function sources: 14
