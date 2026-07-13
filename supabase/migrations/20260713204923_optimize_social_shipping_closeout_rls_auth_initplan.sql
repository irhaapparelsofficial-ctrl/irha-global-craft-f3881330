-- Optimize Social, Shipping and Closeout RLS policies so auth.uid() is initialized once per query.
-- Existing roles, commands and authorization semantics are preserved.

DROP POLICY IF EXISTS production_closeout_event_admin_read ON public.production_closeout_events;
CREATE POLICY production_closeout_event_admin_read ON public.production_closeout_events
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS production_closeout_issue_admin_all ON public.production_closeout_issues;
CREATE POLICY production_closeout_issue_admin_all ON public.production_closeout_issues
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS production_cost_admin_all ON public.production_cost_entries;
CREATE POLICY production_cost_admin_all ON public.production_cost_entries
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS production_delivery_evidence_admin_all ON public.production_delivery_evidence;
CREATE POLICY production_delivery_evidence_admin_all ON public.production_delivery_evidence
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS production_closeout_admin_all ON public.production_order_closeouts;
CREATE POLICY production_closeout_admin_all ON public.production_order_closeouts
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS production_packages_admin_all ON public.production_packages;
CREATE POLICY production_packages_admin_all ON public.production_packages
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS production_repeat_admin_all ON public.production_repeat_order_opportunities;
CREATE POLICY production_repeat_admin_all ON public.production_repeat_order_opportunities
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS production_shipments_admin_all ON public.production_shipments;
CREATE POLICY production_shipments_admin_all ON public.production_shipments
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS production_shipping_documents_admin_all ON public.production_shipping_documents;
CREATE POLICY production_shipping_documents_admin_all ON public.production_shipping_documents
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS production_tracking_events_admin_all ON public.production_tracking_events;
CREATE POLICY production_tracking_events_admin_all ON public.production_tracking_events
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS social_attribution_admin_read ON public.social_attribution_events;
CREATE POLICY social_attribution_admin_read ON public.social_attribution_events
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage social calendar" ON public.social_calendar_items;
CREATE POLICY "Admins manage social calendar" ON public.social_calendar_items
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read social delivery attempts" ON public.social_delivery_attempts;
CREATE POLICY "Admins read social delivery attempts" ON public.social_delivery_attempts
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins write social delivery attempts" ON public.social_delivery_attempts;
CREATE POLICY "Admins write social delivery attempts" ON public.social_delivery_attempts
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS social_growth_admin_all ON public.social_growth_recommendations;
CREATE POLICY social_growth_admin_all ON public.social_growth_recommendations
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS social_metric_admin_read ON public.social_metric_snapshots;
CREATE POLICY social_metric_admin_read ON public.social_metric_snapshots
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS social_platform_accounts_admin_all ON public.social_platform_accounts;
CREATE POLICY social_platform_accounts_admin_all ON public.social_platform_accounts
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS social_publish_events_admin_select ON public.social_publish_events;
CREATE POLICY social_publish_events_admin_select ON public.social_publish_events
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS social_publish_runs_admin_select ON public.social_publish_runs;
CREATE POLICY social_publish_runs_admin_select ON public.social_publish_runs
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS social_render_events_admin_select ON public.social_render_events;
CREATE POLICY social_render_events_admin_select ON public.social_render_events
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS social_render_job_items_admin_all ON public.social_render_job_items;
CREATE POLICY social_render_job_items_admin_all ON public.social_render_job_items
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS social_render_jobs_admin_all ON public.social_render_jobs;
CREATE POLICY social_render_jobs_admin_all ON public.social_render_jobs
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
