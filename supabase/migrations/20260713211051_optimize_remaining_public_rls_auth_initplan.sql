-- Optimize the remaining active public-schema admin RLS policies.
-- Existing authorization semantics remain unchanged.

DROP POLICY IF EXISTS "Admins manage leads" ON public.b2b_leads;
CREATE POLICY "Admins manage leads" ON public.b2b_leads
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage business listings" ON public.business_listings;
CREATE POLICY "Admins manage business listings" ON public.business_listings
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage business_suits" ON public.business_suits;
CREATE POLICY "Admins manage business_suits" ON public.business_suits
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS catalog_change_log_admin_select ON public.catalog_change_log;
CREATE POLICY catalog_change_log_admin_select ON public.catalog_change_log
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins delete chat messages" ON public.chat_messages;
CREATE POLICY "Admins delete chat messages" ON public.chat_messages
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read chat messages" ON public.chat_messages;
CREATE POLICY "Admins read chat messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage master_cartons" ON public.master_cartons;
CREATE POLICY "Admins manage master_cartons" ON public.master_cartons
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins delete page views" ON public.page_views;
CREATE POLICY "Admins delete page views" ON public.page_views
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read page views" ON public.page_views;
CREATE POLICY "Admins read page views" ON public.page_views
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read public submission events" ON public.public_submission_events;
CREATE POLICY "Admins read public submission events" ON public.public_submission_events
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage social campaigns" ON public.social_campaigns;
CREATE POLICY "Admins manage social campaigns" ON public.social_campaigns
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins delete social posts" ON public.social_posts;
CREATE POLICY "Admins delete social posts" ON public.social_posts
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins insert social posts" ON public.social_posts;
CREATE POLICY "Admins insert social posts" ON public.social_posts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read social posts" ON public.social_posts;
CREATE POLICY "Admins read social posts" ON public.social_posts
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins update social posts" ON public.social_posts;
CREATE POLICY "Admins update social posts" ON public.social_posts
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));
