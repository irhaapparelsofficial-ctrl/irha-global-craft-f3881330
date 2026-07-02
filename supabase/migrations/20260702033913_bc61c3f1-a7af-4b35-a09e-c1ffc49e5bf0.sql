-- ============ blog_posts ============
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  title TEXT NOT NULL,
  excerpt TEXT,
  cover_image_url TEXT,
  body_md TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  author TEXT,
  seo_title TEXT,
  seo_description TEXT,
  canonical_url TEXT,
  og_image_url TEXT,
  published_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slug, locale)
);
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_posts public read published" ON public.blog_posts
  FOR SELECT USING (is_published = true);
CREATE POLICY "blog_posts admin read all" ON public.blog_posts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "blog_posts admin write" ON public.blog_posts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_blog_posts_updated BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_blog_posts_published ON public.blog_posts (is_published, published_at DESC);
CREATE INDEX idx_blog_posts_locale ON public.blog_posts (locale);

-- ============ faqs ============
CREATE TABLE public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale TEXT NOT NULL DEFAULT 'en',
  category TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.faqs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faqs TO authenticated;
GRANT ALL ON public.faqs TO service_role;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faqs public read published" ON public.faqs
  FOR SELECT USING (is_published = true);
CREATE POLICY "faqs admin write" ON public.faqs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_faqs_updated BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_faqs_locale_order ON public.faqs (locale, sort_order);

-- ============ seo_page_overrides ============
CREATE TABLE public.seo_page_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  seo_title TEXT,
  seo_description TEXT,
  og_image_url TEXT,
  canonical_url TEXT,
  json_ld JSONB,
  noindex BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (route, locale)
);
GRANT SELECT ON public.seo_page_overrides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seo_page_overrides TO authenticated;
GRANT ALL ON public.seo_page_overrides TO service_role;
ALTER TABLE public.seo_page_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_overrides public read published" ON public.seo_page_overrides
  FOR SELECT USING (is_published = true);
CREATE POLICY "seo_overrides admin write" ON public.seo_page_overrides
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_seo_overrides_updated BEFORE UPDATE ON public.seo_page_overrides
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_seo_overrides_route ON public.seo_page_overrides (route, locale);

-- ============ internal_links ============
CREATE TABLE public.internal_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_route TEXT NOT NULL,
  to_route TEXT NOT NULL,
  anchor_text TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  priority INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.internal_links TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.internal_links TO authenticated;
GRANT ALL ON public.internal_links TO service_role;
ALTER TABLE public.internal_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "internal_links public read published" ON public.internal_links
  FOR SELECT USING (is_published = true);
CREATE POLICY "internal_links admin write" ON public.internal_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_internal_links_updated BEFORE UPDATE ON public.internal_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_internal_links_from ON public.internal_links (from_route, locale, priority DESC);