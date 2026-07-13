-- Repair anonymous SEO reads after role-helper hardening.
-- Public policies do not need to call has_role because authenticated admins
-- already receive full SELECT access through the existing admin ALL policies.

DROP POLICY IF EXISTS "Public reads active SEO locales" ON public.seo_locales;
CREATE POLICY "Public reads active SEO locales" ON public.seo_locales
  FOR SELECT TO anon, authenticated
  USING (status = 'active'::text);

DROP POLICY IF EXISTS "Public reads published localized pages" ON public.seo_localized_pages;
CREATE POLICY "Public reads published localized pages" ON public.seo_localized_pages
  FOR SELECT TO anon, authenticated
  USING (status = 'published'::text AND noindex = false);
