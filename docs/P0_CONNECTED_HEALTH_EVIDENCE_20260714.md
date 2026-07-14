# P0 connected-health evidence — 14 July 2026

Target runtime: owner Supabase project `pvzjiozismyxqrzmtfbi` and isolated Cloudflare Pages preview project `irha-apparels`.

## Cloudflare Pages preview

The least-privilege GitHub token was corrected to use the selected Cloudflare account with `Account → Cloudflare Pages → Edit` and an active TTL.

Verified GitHub Actions evidence:

- Workflow run: `29319117894`, successful re-run of run number 4.
- Quality Gate on the workflow source: successful.
- Cloudflare preflight: token valid, account ID valid and exact Pages project confirmed.
- Deployment target: preview branch `github-preview` only.
- Preview URL: `https://github-preview.irha-apparels.pages.dev`.
- Home and `build.json` checks passed.
- Build identity confirmed the authoritative GitHub repository and owner Supabase project.
- No custom domain, DNS record or Cloudflare production branch was changed.

## SECURITY DEFINER grant hardening

The grant-only SQL documented in `SECURITY_HARDENING_DEFINER_GRANTS_20260714.md` was applied directly to the owner Supabase project. No table row or function body was modified.

Before application:

- 104 public SECURITY DEFINER functions.
- 61 executable by `authenticated`.
- 0 missing a pinned search path.
- Remaining unintended authenticated grants identified on `claim_owner_admin()` and `touch_updated_at()`.

After application:

- 104 public SECURITY DEFINER functions.
- 60 executable by `authenticated`.
- Class B present functions: 22/22 executable by `authenticated` and `service_role`.
- Class C present functions: 9/9 executable only by `service_role`; 0 authenticated grants.
- Class D trigger helpers: 22/22 executable only by `service_role`; 0 authenticated grants.
- 0 SECURITY DEFINER functions missing a pinned search path.
- Signatures absent from this database were skipped by `to_regprocedure()` guards.

Authenticated owner rollback-only verification passed after the grant change:

- `auth.uid()` resolved to the single owner account.
- `has_role(auth.uid(), 'admin')` returned true.
- `cms_get_admin_document('site.home.hero')` succeeded.
- `catalog_get_admin_health()` succeeded.
- `content_get_admin_health()` succeeded.
- The verification transaction was rolled back and wrote no business data.

## Automation result guard follow-up

The later automation-result migration introduced `guard_automation_task_result_state()` as an active `BEFORE INSERT OR UPDATE` trigger on `automation_tasks`. The function was confirmed to be trigger-only, so direct browser RPC execution was removed.

Applied and verified in the owner project:

- `anon` execute: false.
- `authenticated` execute: false.
- `service_role` execute: true.
- Active trigger count: 1.
- A rollback-only test confirmed that `ready_for_review` with an empty result is rejected.
- The same test confirmed that a saved non-empty result is accepted.
- Test residue after rollback: 0 rows.

The internal tables `automation_task_repair_snapshots` and `backend_activation_checkpoints` were classified as privileged maintenance evidence, not admin-browser data. Both now have browser-role table privileges revoked plus explicit deny policies for `anon` and `authenticated`; `service_role` access remains available. The Supabase advisor no longer reports either table as RLS-without-policy, and no anonymous SECURITY DEFINER function warning remains.

The reproducible repository migration is `20260714092600_harden_automation_guard_and_internal_tables.sql`.

## Google Search Console admin backend

`gsc-analytics` version 2 was deployed to the owner Supabase project with JWT verification enabled.

The function now:

- requires a valid user JWT and an actual `admin` row;
- allows only production, local development, Lovable preview and the isolated `irha-apparels.pages.dev` preview origins;
- exposes an authenticated read-only `health` action without returning secrets;
- accepts only approved dimensions and 28/90-day windows;
- returns an explicit HTTP 503 configuration state instead of fake empty analytics when connector credentials are absent;
- performs no writes and makes no indexing guarantee.

## Remaining acceptance boundary

Actual Search Console rows and URL Inspection results must still be visually accepted from an authenticated owner admin session. A deployed function or configured schema is not treated as proof of external Google data until that owner-session request returns evidence.

Supabase Auth leaked-password protection remains a hosted dashboard setting and is not changed by database SQL. It must be enabled separately in Auth password-security settings before that advisor warning can be closed.
