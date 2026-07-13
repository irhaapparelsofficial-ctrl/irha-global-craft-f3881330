-- Optimize high-traffic RLS policies so auth.uid() is evaluated once per query.
-- Policy names, roles, commands and authorization semantics remain unchanged.

DROP POLICY IF EXISTS "Users see own roles" ON public.user_roles;
CREATE POLICY "Users see own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can read all products" ON public.products;
CREATE POLICY "Admins can read all products" ON public.products
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage products" ON public.products;
CREATE POLICY "Admins manage products" ON public.products
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can read all categories" ON public.categories;
CREATE POLICY "Admins can read all categories" ON public.categories
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage categories" ON public.categories;
CREATE POLICY "Admins manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read inquiries" ON public.inquiries;
CREATE POLICY "Admins read inquiries" ON public.inquiries
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins update inquiries" ON public.inquiries;
CREATE POLICY "Admins update inquiries" ON public.inquiries
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins delete inquiries" ON public.inquiries;
CREATE POLICY "Admins delete inquiries" ON public.inquiries
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read catalogue leads" ON public.catalogue_leads;
CREATE POLICY "Admins read catalogue leads" ON public.catalogue_leads
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins update catalogue leads" ON public.catalogue_leads;
CREATE POLICY "Admins update catalogue leads" ON public.catalogue_leads
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins delete catalogue leads" ON public.catalogue_leads;
CREATE POLICY "Admins delete catalogue leads" ON public.catalogue_leads
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS blog_posts_admin_all ON public.blog_posts;
CREATE POLICY blog_posts_admin_all ON public.blog_posts
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS faqs_admin_all ON public.faqs;
CREATE POLICY faqs_admin_all ON public.faqs
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS internal_links_admin_all ON public.internal_links;
CREATE POLICY internal_links_admin_all ON public.internal_links
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS seo_page_overrides_admin_all ON public.seo_page_overrides;
CREATE POLICY seo_page_overrides_admin_all ON public.seo_page_overrides
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS cms_documents_admin_select ON public.cms_documents;
CREATE POLICY cms_documents_admin_select ON public.cms_documents
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS cms_document_revisions_admin_select ON public.cms_document_revisions;
CREATE POLICY cms_document_revisions_admin_select ON public.cms_document_revisions
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS content_change_log_admin_read ON public.content_change_log;
CREATE POLICY content_change_log_admin_read ON public.content_change_log
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));
