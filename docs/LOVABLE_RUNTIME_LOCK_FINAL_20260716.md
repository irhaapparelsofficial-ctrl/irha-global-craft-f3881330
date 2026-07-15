# Lovable runtime default-deny lock — 2026-07-16

- All Edge Function reads of `LOVABLE_API_KEY` require the new explicit opt-in `IRHA_ENABLE_LOVABLE_RUNTIME=true`.
- The opt-in flag is absent from normal production configuration, so stored legacy keys cannot be used.
- Existing non-Lovable fallbacks remain intact.
- The current Vault-authorized `sitemap-ping` queue/finalizer design remains unchanged.
- Sitemap SECURITY DEFINER implementation RPCs become service-role-only.

Patched function sources: 14
