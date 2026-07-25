## Phase 4B-2 — Read-Only Integration Diagnosis (report only)

This plan is a report. No code, database, secret, connector, deployment, sitemap, or indexing changes are proposed. Awaiting owner direction before any Phase 4B-2 remediation is scoped.

### Evidence table

| # | Check | Result |
|---|---|---|
| 1 | `google_search_console` connector attached to this project | Yes — OAuth2, gateway-backed, linked to project |
| 2 | Authorized Google account with Search Console access | Yes — connection present, has_access: yes |
| 3 | Search Console connection reference available to project | Yes — linked and gateway-routable |
| 4 | Lovable connector runtime enabled for project functions | No — `IRHA_ENABLE_LOVABLE_RUNTIME` absent from Supabase Edge Function environment. `irhaLovableRuntimeKey()` therefore returns undefined and the GSC edge paths short-circuit with `gsc_connection_not_configured` (503) |
| 5 | Secret-name presence (values not read) | `IRHA_ENABLE_LOVABLE_RUNTIME`: absent · `LOVABLE_API_KEY`: present (managed) · `GOOGLE_SEARCH_CONSOLE_API_KEY`: present (connector-managed) · `GSC_SITE_URL`: absent |
| 6 | Effective `GSC_SITE_URL` | Not set; functions fall back to source-default `https://irhaapparels.com/` (matches canonical apex property and `sc-domain:irhaapparels.com`) |
| 7 | Existing secure admin session usable for `gsc-analytics`/`gsc-inspect` | Unknown from read-only tooling — requires a live authenticated owner request (Bearer JWT + `user_roles.role='admin'`) that cannot be observed from configuration inspection |

### Classification

**`LOVABLE_RUNTIME_DISABLED`** — sole deterministic blocker.

All connector, OAuth, gateway, and companion secrets are in place, and the effective site URL matches the canonical apex property. The GSC edge functions gate `LOVABLE_API_KEY` behind an explicit `IRHA_ENABLE_LOVABLE_RUNTIME=true` opt-in that is currently absent, so gateway calls cannot execute regardless of caller identity.

Item 7 (admin session) remains unverifiable in a read-only pass. If a subsequent owner-initiated authenticated call to `gsc-analytics` also fails after the runtime flag is enabled, reclassification to `MULTIPLE_CONFIGURATION_DEFECTS` (adding `ADMIN_SESSION_UNAVAILABLE`) would apply.

### Constraints honored
- No file edits, no migrations, no deploys, no sitemap submission, no indexing requests.
- No secret values, tokens, JWTs, or account email addresses read or surfaced.
- No remediation code proposed; awaiting explicit owner instruction to open a scoped change.
