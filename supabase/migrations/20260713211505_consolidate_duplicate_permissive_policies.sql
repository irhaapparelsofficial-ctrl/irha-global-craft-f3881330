-- Consolidate duplicate permissive RLS policies without changing effective access.
-- Public content keeps anonymous/authenticated published reads.
-- Authenticated admins keep full draft/read/write access.
-- Service-role transport policies are scoped to the dedicated service_role role.

-- Blog posts
DROP POLICY IF EXISTS blog_posts_admin_all ON public.blog_posts;
DROP POLICY IF EXISTS blog_posts_public_read ON public.blog_posts;
CREATE POLICY blog_posts_anon_read ON public.blog_posts
  FOR SELECT TO anon
  USING (is_published = true);
CREATE POLICY blog_posts_authenticated_read ON public.blog_posts
  FOR SELECT TO authenticated
  USING (is_published = true OR public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY blog_posts_admin_insert ON public.blog_posts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY blog_posts_admin_update ON public.blog_posts
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY blog_posts_admin_delete ON public.blog_posts
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- Categories
DROP POLICY IF EXISTS "Admins can read all categories" ON public.categories;
DROP POLICY IF EXISTS "Admins manage categories" ON public.categories;
DROP POLICY IF EXISTS "Anyone can read published categories" ON public.categories;
CREATE POLICY categories_anon_read ON public.categories
  FOR SELECT TO anon
  USING (is_published = true);
CREATE POLICY categories_authenticated_read ON public.categories
  FOR SELECT TO authenticated
  USING (is_published = true OR public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY categories_admin_insert ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY categories_admin_update ON public.categories
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY categories_admin_delete ON public.categories
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- FAQs
DROP POLICY IF EXISTS faqs_admin_all ON public.faqs;
DROP POLICY IF EXISTS faqs_public_read ON public.faqs;
CREATE POLICY faqs_anon_read ON public.faqs
  FOR SELECT TO anon
  USING (is_published = true);
CREATE POLICY faqs_authenticated_read ON public.faqs
  FOR SELECT TO authenticated
  USING (is_published = true OR public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY faqs_admin_insert ON public.faqs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY faqs_admin_update ON public.faqs
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY faqs_admin_delete ON public.faqs
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- Internal links
DROP POLICY IF EXISTS internal_links_admin_all ON public.internal_links;
DROP POLICY IF EXISTS internal_links_public_read ON public.internal_links;
CREATE POLICY internal_links_anon_read ON public.internal_links
  FOR SELECT TO anon
  USING (is_published = true);
CREATE POLICY internal_links_authenticated_read ON public.internal_links
  FOR SELECT TO authenticated
  USING (is_published = true OR public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY internal_links_admin_insert ON public.internal_links
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY internal_links_admin_update ON public.internal_links
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY internal_links_admin_delete ON public.internal_links
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- Products
DROP POLICY IF EXISTS "Admins can read all products" ON public.products;
DROP POLICY IF EXISTS "Admins manage products" ON public.products;
DROP POLICY IF EXISTS "Anyone can read published products" ON public.products;
CREATE POLICY products_anon_read ON public.products
  FOR SELECT TO anon
  USING (is_published = true);
CREATE POLICY products_authenticated_read ON public.products
  FOR SELECT TO authenticated
  USING (is_published = true OR public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY products_admin_insert ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY products_admin_update ON public.products
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY products_admin_delete ON public.products
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- SEO locales
DROP POLICY IF EXISTS "Admins manage SEO locales" ON public.seo_locales;
DROP POLICY IF EXISTS "Public reads active SEO locales" ON public.seo_locales;
CREATE POLICY seo_locales_anon_read ON public.seo_locales
  FOR SELECT TO anon
  USING (status = 'active'::text);
CREATE POLICY seo_locales_authenticated_read ON public.seo_locales
  FOR SELECT TO authenticated
  USING (status = 'active'::text OR public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY seo_locales_admin_insert ON public.seo_locales
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY seo_locales_admin_update ON public.seo_locales
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY seo_locales_admin_delete ON public.seo_locales
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- Localized SEO pages
DROP POLICY IF EXISTS "Admins manage localized pages" ON public.seo_localized_pages;
DROP POLICY IF EXISTS "Public reads published localized pages" ON public.seo_localized_pages;
CREATE POLICY seo_localized_pages_anon_read ON public.seo_localized_pages
  FOR SELECT TO anon
  USING (status = 'published'::text AND noindex = false);
CREATE POLICY seo_localized_pages_authenticated_read ON public.seo_localized_pages
  FOR SELECT TO authenticated
  USING ((status = 'published'::text AND noindex = false) OR public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY seo_localized_pages_admin_insert ON public.seo_localized_pages
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY seo_localized_pages_admin_update ON public.seo_localized_pages
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY seo_localized_pages_admin_delete ON public.seo_localized_pages
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- SEO page overrides
DROP POLICY IF EXISTS seo_page_overrides_admin_all ON public.seo_page_overrides;
DROP POLICY IF EXISTS seo_page_overrides_public_read ON public.seo_page_overrides;
CREATE POLICY seo_page_overrides_anon_read ON public.seo_page_overrides
  FOR SELECT TO anon
  USING (is_published = true);
CREATE POLICY seo_page_overrides_authenticated_read ON public.seo_page_overrides
  FOR SELECT TO authenticated
  USING (is_published = true OR public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY seo_page_overrides_admin_insert ON public.seo_page_overrides
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY seo_page_overrides_admin_update ON public.seo_page_overrides
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY seo_page_overrides_admin_delete ON public.seo_page_overrides
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- Email transport: scope service policies to the dedicated role.
DROP POLICY IF EXISTS "Service role can insert send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can read send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can update send log" ON public.email_send_log;
CREATE POLICY "Service role can insert send log" ON public.email_send_log
  FOR INSERT TO service_role
  WITH CHECK (true);
CREATE POLICY "Service role can read send log" ON public.email_send_log
  FOR SELECT TO service_role
  USING (true);
CREATE POLICY "Service role can update send log" ON public.email_send_log
  FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);

-- Suppression transport: scope service policies to the dedicated role.
DROP POLICY IF EXISTS "Service role can insert suppressed emails" ON public.suppressed_emails;
DROP POLICY IF EXISTS "Service role can read suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Service role can insert suppressed emails" ON public.suppressed_emails
  FOR INSERT TO service_role
  WITH CHECK (true);
CREATE POLICY "Service role can read suppressed emails" ON public.suppressed_emails
  FOR SELECT TO service_role
  USING (true);

-- The ALL policy already grants admin read/write access; remove duplicate SELECT policy.
DROP POLICY IF EXISTS "Admins read social delivery attempts" ON public.social_delivery_attempts;
