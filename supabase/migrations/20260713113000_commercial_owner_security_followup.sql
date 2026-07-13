-- Phase 3 commercial/owner-command-center production hardening.
-- Keeps the repository migration history aligned with the verified owner Supabase project.

-- Browser-authenticated admins need sequence usage for human-readable references.
REVOKE ALL ON SEQUENCE public.crm_meeting_reference_seq FROM anon;
REVOKE ALL ON SEQUENCE public.crm_sample_reference_seq FROM anon;
REVOKE ALL ON SEQUENCE public.crm_quotation_reference_seq FROM anon;
GRANT USAGE, SELECT ON SEQUENCE public.crm_meeting_reference_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.crm_sample_reference_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.crm_quotation_reference_seq TO authenticated;

-- Recalculation is trigger/internal only. Preserve the admin check even if a future
-- migration accidentally grants direct RPC access again.
CREATE OR REPLACE FUNCTION public.crm_recalculate_quotation(_quotation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_subtotal numeric(14,2);
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(sum(line_total), 0)
  INTO item_subtotal
  FROM public.crm_quotation_items
  WHERE quotation_id = _quotation_id;

  UPDATE public.crm_quotations
  SET subtotal = item_subtotal,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = _quotation_id;
END;
$$;

-- Trigger-only SECURITY DEFINER functions must never be exposed as REST RPCs.
REVOKE EXECUTE ON FUNCTION public.crm_commercial_before_write() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_commercial_activity_audit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_quotation_discount_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_quotation_item_after_write() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_recalculate_quotation(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_owner_workspace_before_write() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_saved_view_default_guard() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.crm_commercial_before_write() TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_commercial_activity_audit() TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_quotation_discount_guard() TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_quotation_item_after_write() TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_recalculate_quotation(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_owner_workspace_before_write() TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_saved_view_default_guard() TO service_role;

-- Evaluate auth context once per statement rather than once per row.
DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'crm_meetings',
    'crm_samples',
    'crm_quotations',
    'crm_quotation_items',
    'crm_saved_views',
    'crm_team_members',
    'crm_daily_reports',
    'crm_workspace_preferences'
  ]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      target_table || '_admin_all',
      target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ((select public.has_role((select auth.uid()), ''admin''))) WITH CHECK ((select public.has_role((select auth.uid()), ''admin'')))',
      target_table || '_admin_all',
      target_table
    );
  END LOOP;
END $$;

-- Cover the new foreign keys reported by the Supabase performance advisor.
CREATE INDEX IF NOT EXISTS crm_meetings_created_by_idx
  ON public.crm_meetings (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_meetings_updated_by_idx
  ON public.crm_meetings (updated_by) WHERE updated_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_samples_created_by_idx
  ON public.crm_samples (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_samples_updated_by_idx
  ON public.crm_samples (updated_by) WHERE updated_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_quotations_created_by_idx
  ON public.crm_quotations (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_quotations_updated_by_idx
  ON public.crm_quotations (updated_by) WHERE updated_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_saved_views_created_by_idx
  ON public.crm_saved_views (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_saved_views_updated_by_idx
  ON public.crm_saved_views (updated_by) WHERE updated_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_team_members_created_by_idx
  ON public.crm_team_members (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_team_members_updated_by_idx
  ON public.crm_team_members (updated_by) WHERE updated_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_daily_reports_generated_by_user_idx
  ON public.crm_daily_reports (generated_by_user_id)
  WHERE generated_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_workspace_preferences_default_view_idx
  ON public.crm_workspace_preferences (default_saved_view_id)
  WHERE default_saved_view_id IS NOT NULL;
