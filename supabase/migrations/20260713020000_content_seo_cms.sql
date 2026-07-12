-- Phase 2 / Batch 2.3: Blog, FAQ, SEO overrides and internal links CMS.
-- This file is intentionally deployment-ready but can be applied later as part
-- of the single final database activation requested by the owner.

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  title text NOT NULL,
  excerpt text,
  cover_image_url text,
  body_md text,
  tags text[] NOT NULL DEFAULT '{}',
  author text,
  seo_title text,
  seo_description text,
  canonical_url text,
  og_image_url text,
  published_at timestamptz,
  is_published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blog_posts_slug_locale_key UNIQUE (slug, locale),
  CONSTRAINT blog_posts_slug_check CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,159}$'),
  CONSTRAINT blog_posts_locale_check CHECK (locale ~ '^[a-z]{2}(?:-[A-Z]{2})?$'),
  CONSTRAINT blog_posts_title_check CHECK (char_length(btrim(title)) BETWEEN 2 AND 180)
);

CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale text NOT NULL DEFAULT 'en',
  category text,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT faqs_locale_check CHECK (locale ~ '^[a-z]{2}(?:-[A-Z]{2})?$'),
  CONSTRAINT faqs_question_check CHECK (char_length(btrim(question)) BETWEEN 5 AND 300),
  CONSTRAINT faqs_answer_check CHECK (char_length(btrim(answer)) BETWEEN 10 AND 4000)
);

CREATE TABLE IF NOT EXISTS public.seo_page_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  seo_title text,
  seo_description text,
  og_image_url text,
  canonical_url text,
  json_ld jsonb,
  noindex boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seo_page_overrides_route_locale_key UNIQUE (route, locale),
  CONSTRAINT seo_page_overrides_route_check CHECK (route ~ '^/[^?#]*$'),
  CONSTRAINT seo_page_overrides_locale_check CHECK (locale ~ '^[a-z]{2}(?:-[A-Z]{2})?$')
);

CREATE TABLE IF NOT EXISTS public.internal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_route text NOT NULL,
  to_route text NOT NULL,
  anchor_text text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  priority integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT internal_links_unique_link UNIQUE (from_route, to_route, anchor_text, locale),
  CONSTRAINT internal_links_from_route_check CHECK (from_route ~ '^/[^?#]*$'),
  CONSTRAINT internal_links_to_route_check CHECK (to_route ~ '^/[^?#]*$'),
  CONSTRAINT internal_links_anchor_check CHECK (char_length(btrim(anchor_text)) BETWEEN 2 AND 120),
  CONSTRAINT internal_links_locale_check CHECK (locale ~ '^[a-z]{2}(?:-[A-Z]{2})?$')
);

CREATE TABLE IF NOT EXISTS public.content_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('blog_post', 'faq', 'seo_override', 'internal_link')),
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  before_data jsonb,
  after_data jsonb,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_posts_public_idx
  ON public.blog_posts (locale, is_published, sort_order, published_at DESC);
CREATE INDEX IF NOT EXISTS faqs_public_idx
  ON public.faqs (locale, is_published, category, sort_order);
CREATE INDEX IF NOT EXISTS seo_page_overrides_public_idx
  ON public.seo_page_overrides (route, locale, is_published);
CREATE INDEX IF NOT EXISTS internal_links_public_idx
  ON public.internal_links (from_route, locale, is_published, priority DESC);
CREATE INDEX IF NOT EXISTS content_change_log_entity_idx
  ON public.content_change_log (entity_type, entity_id, created_at DESC);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_page_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_change_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='blog_posts' AND policyname='blog_posts_public_read') THEN
    CREATE POLICY blog_posts_public_read ON public.blog_posts FOR SELECT TO anon, authenticated USING (is_published);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='blog_posts' AND policyname='blog_posts_admin_all') THEN
    CREATE POLICY blog_posts_admin_all ON public.blog_posts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='faqs' AND policyname='faqs_public_read') THEN
    CREATE POLICY faqs_public_read ON public.faqs FOR SELECT TO anon, authenticated USING (is_published);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='faqs' AND policyname='faqs_admin_all') THEN
    CREATE POLICY faqs_admin_all ON public.faqs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='seo_page_overrides' AND policyname='seo_page_overrides_public_read') THEN
    CREATE POLICY seo_page_overrides_public_read ON public.seo_page_overrides FOR SELECT TO anon, authenticated USING (is_published);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='seo_page_overrides' AND policyname='seo_page_overrides_admin_all') THEN
    CREATE POLICY seo_page_overrides_admin_all ON public.seo_page_overrides FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='internal_links' AND policyname='internal_links_public_read') THEN
    CREATE POLICY internal_links_public_read ON public.internal_links FOR SELECT TO anon, authenticated USING (is_published);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='internal_links' AND policyname='internal_links_admin_all') THEN
    CREATE POLICY internal_links_admin_all ON public.internal_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='content_change_log' AND policyname='content_change_log_admin_read') THEN
    CREATE POLICY content_change_log_admin_read ON public.content_change_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.blog_posts FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.faqs FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.seo_page_overrides FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.internal_links FROM anon;
REVOKE ALL ON TABLE public.content_change_log FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.content_change_log FROM authenticated;
GRANT SELECT ON TABLE public.content_change_log TO authenticated;

CREATE OR REPLACE FUNCTION public.content_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  IF TG_TABLE_NAME = 'blog_posts' AND NEW.is_published AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.content_record_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _entity_type text;
BEGIN
  _entity_type := CASE TG_TABLE_NAME
    WHEN 'blog_posts' THEN 'blog_post'
    WHEN 'faqs' THEN 'faq'
    WHEN 'seo_page_overrides' THEN 'seo_override'
    ELSE 'internal_link'
  END;

  INSERT INTO public.content_change_log (
    entity_type,
    entity_id,
    action,
    before_data,
    after_data,
    changed_by
  ) VALUES (
    _entity_type,
    COALESCE(NEW.id, OLD.id),
    lower(TG_OP),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  _table text;
BEGIN
  FOREACH _table IN ARRAY ARRAY['blog_posts','faqs','seo_page_overrides','internal_links'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_touch_updated_at ON public.%I', _table, _table);
    EXECUTE format('CREATE TRIGGER trg_%I_touch_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.content_touch_updated_at()', _table, _table);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_content_change ON public.%I', _table, _table);
    EXECUTE format('CREATE TRIGGER trg_%I_content_change AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.content_record_change()', _table, _table);
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION public.content_get_public_blog_posts(_locale text DEFAULT 'en')
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'slug', slug,
    'locale', locale,
    'title', title,
    'excerpt', excerpt,
    'cover_image_url', cover_image_url,
    'tags', to_jsonb(tags),
    'author', author,
    'seo_title', seo_title,
    'seo_description', seo_description,
    'canonical_url', canonical_url,
    'og_image_url', og_image_url,
    'published_at', published_at,
    'sort_order', sort_order
  ) ORDER BY sort_order, published_at DESC NULLS LAST, created_at DESC), '[]'::jsonb)
  FROM public.blog_posts
  WHERE is_published AND locale = _locale;
$$;

CREATE OR REPLACE FUNCTION public.content_get_public_blog_post(_slug text, _locale text DEFAULT 'en')
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', id,
    'slug', slug,
    'locale', locale,
    'title', title,
    'excerpt', excerpt,
    'cover_image_url', cover_image_url,
    'body_md', body_md,
    'tags', to_jsonb(tags),
    'author', author,
    'seo_title', seo_title,
    'seo_description', seo_description,
    'canonical_url', canonical_url,
    'og_image_url', og_image_url,
    'published_at', published_at
  )
  FROM public.blog_posts
  WHERE is_published AND slug = _slug AND locale = _locale
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.content_get_public_faqs(_locale text DEFAULT 'en')
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'locale', locale,
    'category', category,
    'question', question,
    'answer', answer,
    'sort_order', sort_order
  ) ORDER BY category NULLS LAST, sort_order, created_at), '[]'::jsonb)
  FROM public.faqs
  WHERE is_published AND locale = _locale;
$$;

CREATE OR REPLACE FUNCTION public.content_get_public_page_tools(_route text, _locale text DEFAULT 'en')
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'seo', (
      SELECT jsonb_build_object(
        'route', route,
        'locale', locale,
        'seo_title', seo_title,
        'seo_description', seo_description,
        'og_image_url', og_image_url,
        'canonical_url', canonical_url,
        'json_ld', json_ld,
        'noindex', noindex
      )
      FROM public.seo_page_overrides
      WHERE is_published AND route = _route AND locale = _locale
      LIMIT 1
    ),
    'links', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'to_route', to_route,
        'anchor_text', anchor_text,
        'priority', priority
      ) ORDER BY priority DESC, created_at)
      FROM public.internal_links
      WHERE is_published AND from_route = _route AND locale = _locale
    ), '[]'::jsonb)
  );
$$;

CREATE OR REPLACE FUNCTION public.content_get_admin_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'blogCount', (SELECT count(*) FROM public.blog_posts),
    'publishedBlogCount', (SELECT count(*) FROM public.blog_posts WHERE is_published),
    'faqCount', (SELECT count(*) FROM public.faqs),
    'publishedFaqCount', (SELECT count(*) FROM public.faqs WHERE is_published),
    'seoOverrideCount', (SELECT count(*) FROM public.seo_page_overrides),
    'publishedSeoOverrideCount', (SELECT count(*) FROM public.seo_page_overrides WHERE is_published),
    'internalLinkCount', (SELECT count(*) FROM public.internal_links),
    'publishedInternalLinkCount', (SELECT count(*) FROM public.internal_links WHERE is_published),
    'lastChangeAt', (SELECT max(created_at) FROM public.content_change_log)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.content_touch_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.content_record_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.content_get_public_blog_posts(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.content_get_public_blog_post(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.content_get_public_faqs(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.content_get_public_page_tools(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.content_get_admin_health() FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.content_touch_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.content_record_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.content_get_admin_health() FROM anon;

GRANT EXECUTE ON FUNCTION public.content_get_public_blog_posts(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.content_get_public_blog_post(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.content_get_public_faqs(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.content_get_public_page_tools(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.content_get_admin_health() TO authenticated;
