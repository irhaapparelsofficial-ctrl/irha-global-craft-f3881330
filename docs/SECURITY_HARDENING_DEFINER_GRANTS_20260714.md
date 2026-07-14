# Security hardening — SECURITY DEFINER RPC grants (2026-07-14)

Status: **Repo-only. Not applied.** Prepared for owner action against the owner
Supabase project `pvzjiozismyxqrzmtfbi`. The Lovable-managed backend
(`mlefxgyaqoisvdmoiapq`) is archive/rollback and must not be the target.

## Why

The Supabase security advisor flags every `public` SECURITY DEFINER function
that is executable by the `authenticated` role. Several of those grants are
intentional — the function itself enforces
`public.has_role(auth.uid(), 'admin')` or an exact owner-email check, which
is the documented Lovable pattern for admin-only mutations invoked from the
authenticated browser session (CMS write, social-render admin actions,
production write/approve/release/close, automation planning cycle,
media-asset verification, admin health helpers).

Others do not need to be reachable from any signed-in browser session
(self-elevation, worker/callback RPCs, email plumbing, trigger-only helpers)
and should be locked to `service_role` only. In particular
`claim_owner_admin` remains SECURITY DEFINER with an owner-email + "no other
admin" guard, but no authenticated caller has a legitimate reason to invoke
it now that the single admin role is initialized — so it is locked to
`service_role`.

## Classification

**A. Public / anon read helpers — unchanged**
`cms_get_published_document`, `catalog_get_public_release`,
`content_get_public_blog_post`, `content_get_public_blog_posts`,
`content_get_public_faqs`, `content_get_public_page_tools`, `has_role`
(already self-scoped, see `SECURITY_HARDENING_ROLE_SCOPE_20260713.md`),
`owner_auth_readiness`.

**B. Admin RPCs with in-function admin guard — keep `authenticated`**
Explicit re-grant so end state is deterministic:
`cms_get_admin_document`, `cms_save_draft`, `cms_publish_document`,
`cms_restore_revision`, `create_automation_planning_cycle`,
`admin_submit_social_render_job`, `admin_approve_social_render_job`,
`admin_retry_social_render_job`, `admin_cancel_social_render_job`,
`production_approve_dispatch`, `production_record_dispatch`,
`production_confirm_delivery`, `production_ensure_closeout`,
`production_update_closeout_commercial`,
`production_record_delivery_acceptance`,
`production_add_closeout_cost`, `production_verify_closeout_cost`,
`production_add_closeout_issue`, `production_resolve_closeout_issue`,
`production_owner_review_closeout`, `production_close_order`,
`production_prepare_repeat_order`, `production_set_repeat_order_status`,
`production_shipping_readiness`, `production_closeout_readiness`,
`complete_media_asset_verification`, `catalog_get_admin_health`,
`content_get_admin_health`.

**C. Service-role only — revoke authenticated**
`claim_owner_admin`, `claim_admin`, `owner_bootstrap_open`,
`claim_next_social_render_job`, `complete_social_render_job`,
`fail_social_render_job`, `consume_public_submission_limit`,
`enqueue_email`, `delete_email`, `move_to_dlq`, `read_email_batch`,
`email_queue_dispatch`, `email_queue_wake`,
`catalog_record_change`, `content_record_change`.

**D. Trigger-only helpers — revoke all execute**
Triggers run with the table owner's privileges regardless of grants:
`touch_updated_at`, `catalog_touch_updated_at`,
`content_touch_updated_at`, `production_shipping_touch_updated_at`,
`validate_public_inquiry_insert`, `enforce_irha_owner_auth_email`,
`crm_recalculate_quotation`, `crm_quotation_discount_guard`,
`crm_quotation_item_after_write`, `crm_task_before_write`,
`crm_task_activity_audit`, `crm_buyer360_before_write`,
`crm_buyer360_activity_audit`, `crm_commercial_before_write`,
`crm_commercial_activity_audit`, `crm_owner_workspace_before_write`,
`crm_saved_view_default_guard`, `media_assets_before_write`,
`media_assets_audit`, `social_render_jobs_before_write`,
`social_render_items_before_write`, `social_render_job_audit`.

Also enforces `SET search_path = pg_catalog, public` on any remaining
SECURITY DEFINER function in `public` that does not already pin one, to
close the mutable-search-path warning class without rewriting function
bodies.

## Owner action — exact steps

1. **Snapshot** the owner Supabase project `pvzjiozismyxqrzmtfbi` (Database
   → Backups → Create manual backup) so this change is reversible.
2. Open Database → SQL editor on that same project (do NOT run this against
   `mlefxgyaqoisvdmoiapq`).
3. Paste the SQL in the section below **verbatim** and run it. The script
   is idempotent and uses `to_regprocedure()` guards, so functions that
   don't exist on the target simply emit a NOTICE.
4. Run the **verification query** at the bottom before and after; save the
   two outputs alongside this doc as evidence.
5. Do not merge any code changes as part of this action — grants only.

## Migration SQL (paste into the owner Supabase SQL editor)

```sql
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp._irha_lock_fn(_signature text)
RETURNS void LANGUAGE plpgsql AS $fn$
BEGIN
  IF to_regprocedure(_signature) IS NULL THEN
    RAISE NOTICE 'skip: % not present', _signature; RETURN;
  END IF;
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', _signature);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', _signature);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', _signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', _signature);
END; $fn$;

CREATE OR REPLACE FUNCTION pg_temp._irha_admin_fn(_signature text)
RETURNS void LANGUAGE plpgsql AS $fn$
BEGIN
  IF to_regprocedure(_signature) IS NULL THEN
    RAISE NOTICE 'skip: % not present', _signature; RETURN;
  END IF;
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', _signature);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', _signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', _signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', _signature);
END; $fn$;

-- C) service-role only
SELECT pg_temp._irha_lock_fn(sig) FROM (VALUES
  ('public.claim_owner_admin()'),
  ('public.claim_admin()'),
  ('public.owner_bootstrap_open()'),
  ('public.claim_next_social_render_job(text)'),
  ('public.complete_social_render_job(uuid,jsonb,jsonb)'),
  ('public.fail_social_render_job(uuid,text)'),
  ('public.consume_public_submission_limit(text,text,integer,integer)'),
  ('public.enqueue_email(text,jsonb)'),
  ('public.delete_email(text,bigint)'),
  ('public.move_to_dlq(text,text,bigint,jsonb)'),
  ('public.read_email_batch(text,integer,integer)'),
  ('public.email_queue_dispatch()'),
  ('public.email_queue_wake()'),
  ('public.catalog_record_change(text,text,jsonb)'),
  ('public.content_record_change(text,text,jsonb)')
) AS t(sig);

-- D) trigger-only helpers
SELECT pg_temp._irha_lock_fn(sig) FROM (VALUES
  ('public.touch_updated_at()'),
  ('public.catalog_touch_updated_at()'),
  ('public.content_touch_updated_at()'),
  ('public.production_shipping_touch_updated_at()'),
  ('public.validate_public_inquiry_insert()'),
  ('public.enforce_irha_owner_auth_email()'),
  ('public.crm_recalculate_quotation(uuid)'),
  ('public.crm_quotation_discount_guard()'),
  ('public.crm_quotation_item_after_write()'),
  ('public.crm_task_before_write()'),
  ('public.crm_task_activity_audit()'),
  ('public.crm_buyer360_before_write()'),
  ('public.crm_buyer360_activity_audit()'),
  ('public.crm_commercial_before_write()'),
  ('public.crm_commercial_activity_audit()'),
  ('public.crm_owner_workspace_before_write()'),
  ('public.crm_saved_view_default_guard()'),
  ('public.media_assets_before_write()'),
  ('public.media_assets_audit()'),
  ('public.social_render_jobs_before_write()'),
  ('public.social_render_items_before_write()'),
  ('public.social_render_job_audit()')
) AS t(sig);

-- B) admin RPCs with in-function admin guard — keep authenticated
SELECT pg_temp._irha_admin_fn(sig) FROM (VALUES
  ('public.cms_get_admin_document(text)'),
  ('public.cms_save_draft(text,text,text,jsonb)'),
  ('public.cms_publish_document(text)'),
  ('public.cms_restore_revision(text,uuid)'),
  ('public.create_automation_planning_cycle(text)'),
  ('public.admin_submit_social_render_job(uuid)'),
  ('public.admin_approve_social_render_job(uuid)'),
  ('public.admin_retry_social_render_job(uuid)'),
  ('public.admin_cancel_social_render_job(uuid)'),
  ('public.production_approve_dispatch(uuid)'),
  ('public.production_record_dispatch(uuid,text,text,text)'),
  ('public.production_confirm_delivery(uuid,uuid)'),
  ('public.production_ensure_closeout(uuid)'),
  ('public.production_record_delivery_acceptance(uuid,text,text,timestamptz)'),
  ('public.production_add_closeout_cost(uuid,text,numeric,text,text)'),
  ('public.production_verify_closeout_cost(uuid,text,text)'),
  ('public.production_add_closeout_issue(uuid,text,text,text)'),
  ('public.production_resolve_closeout_issue(uuid,text,text)'),
  ('public.production_owner_review_closeout(uuid,boolean,text)'),
  ('public.production_close_order(uuid,text)'),
  ('public.production_prepare_repeat_order(uuid,uuid,text)'),
  ('public.production_set_repeat_order_status(uuid,text,text)'),
  ('public.production_shipping_readiness(uuid)'),
  ('public.production_closeout_readiness(uuid)'),
  ('public.production_update_closeout_commercial(uuid,jsonb)'),
  ('public.complete_media_asset_verification(uuid,jsonb)'),
  ('public.catalog_get_admin_health()'),
  ('public.content_get_admin_health()')
) AS t(sig);

-- Pin search_path on any remaining SECURITY DEFINER function without one.
DO $$
DECLARE r record; has_sp boolean;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args, p.proconfig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    has_sp := r.proconfig IS NOT NULL AND EXISTS (
      SELECT 1 FROM unnest(r.proconfig) AS cfg WHERE cfg ILIKE 'search_path=%'
    );
    IF NOT has_sp THEN
      EXECUTE format(
        'ALTER FUNCTION public.%I(%s) SET search_path = pg_catalog, public',
        r.proname, r.args);
    END IF;
  END LOOP;
END $$;

COMMIT;
```

## Verification query (run before and after; diff the two outputs)

```sql
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef AS security_definer,
       (SELECT array_agg(pr.rolname ORDER BY pr.rolname)
          FROM aclexplode(p.proacl) a
          JOIN pg_roles pr ON pr.oid = a.grantee) AS grantees,
       coalesce(p.proconfig, '{}') AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef
ORDER BY p.proname;
```

Expected end state
- Class **C** rows: `grantees = {service_role}` only.
- Class **D** rows: `grantees = {service_role}` only (triggers still fire on
  the owning role).
- Class **B** rows: `grantees = {authenticated, service_role}` with the
  in-function `has_role(auth.uid(),'admin')` guard authoritative.
- Class **A** rows: unchanged.
- Every SECURITY DEFINER row shows `search_path=pg_catalog, public` (or an
  existing pinned value) in `config`.

## Rollback

If any admin-facing action regresses, run in the same SQL editor:

```sql
GRANT EXECUTE ON FUNCTION public.<name>(<args>) TO authenticated;
```

for the affected signature. All changes here are grant/revoke only, no
function bodies, tables, policies, or triggers are altered.

## Not in this change

- No changes to `has_role` (already hardened in
  `SECURITY_HARDENING_ROLE_SCOPE_20260713.md`).
- No policy changes, no table changes.
- Leaked-password protection remains a hosted Supabase Auth setting.
- No app or code changes were required (`useAuth.ts` handles the
  `claim_owner_admin` "not authorized" case gracefully — the owner already
  has the admin role, so the branch is dead in production).

## Repo evidence

- Files changed: `docs/SECURITY_HARDENING_DEFINER_GRANTS_20260714.md` (this
  file). No source or migration file changed. No deploy triggered.
- Typecheck/build/tests: not applicable — docs-only change. The runtime
  bundle is byte-identical to current `main`.
- Remaining blocker: owner-side application of the SQL above against
  project `pvzjiozismyxqrzmtfbi`.
