-- Optimize AI, automation, SEO and media RLS policies.
-- Existing public-read and admin authorization semantics remain unchanged.

DROP POLICY IF EXISTS "Admins manage AI actions" ON public.ai_actions;
CREATE POLICY "Admins manage AI actions" ON public.ai_actions
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage AI business rules" ON public.ai_business_rules;
CREATE POLICY "Admins manage AI business rules" ON public.ai_business_rules
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage AI runs" ON public.ai_runs;
CREATE POLICY "Admins manage AI runs" ON public.ai_runs
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage automation runs" ON public.automation_runs;
CREATE POLICY "Admins manage automation runs" ON public.automation_runs
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage automation settings" ON public.automation_settings;
CREATE POLICY "Admins manage automation settings" ON public.automation_settings
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage automation tasks" ON public.automation_tasks;
CREATE POLICY "Admins manage automation tasks" ON public.automation_tasks
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS media_asset_events_admin_select ON public.media_asset_events;
CREATE POLICY media_asset_events_admin_select ON public.media_asset_events
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS media_assets_admin_all ON public.media_assets;
CREATE POLICY media_assets_admin_all ON public.media_assets
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage keyword clusters" ON public.seo_keyword_clusters;
CREATE POLICY "Admins manage keyword clusters" ON public.seo_keyword_clusters
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage SEO locales" ON public.seo_locales;
CREATE POLICY "Admins manage SEO locales" ON public.seo_locales
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Public reads active SEO locales" ON public.seo_locales;
CREATE POLICY "Public reads active SEO locales" ON public.seo_locales
  FOR SELECT TO anon, authenticated
  USING (
    status = 'active'::text
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins manage localized pages" ON public.seo_localized_pages;
CREATE POLICY "Admins manage localized pages" ON public.seo_localized_pages
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Public reads published localized pages" ON public.seo_localized_pages;
CREATE POLICY "Public reads published localized pages" ON public.seo_localized_pages
  FOR SELECT TO anon, authenticated
  USING (
    (status = 'published'::text AND noindex = false)
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );
