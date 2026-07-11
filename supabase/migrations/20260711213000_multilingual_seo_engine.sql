-- Irha Multilingual SEO Engine v1
-- Global locale registry, internal keyword atlas and approval-gated localized pages.

CREATE TABLE IF NOT EXISTS public.seo_locales (
  locale TEXT PRIMARY KEY,
  language_name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'ltr' CHECK (direction IN ('ltr','rtl')),
  target_markets TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','paused','retired')),
  priority INTEGER NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  requires_native_review BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seo_keyword_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale TEXT NOT NULL REFERENCES public.seo_locales(locale) ON DELETE CASCADE,
  cluster_name TEXT NOT NULL,
  search_intent TEXT NOT NULL CHECK (search_intent IN ('commercial','transactional','informational','navigational')),
  market TEXT,
  product_focus TEXT[] NOT NULL DEFAULT '{}',
  seed_keywords TEXT[] NOT NULL DEFAULT '{}',
  primary_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  supporting_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  negative_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','approved','rejected','archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seo_localized_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale TEXT NOT NULL REFERENCES public.seo_locales(locale) ON DELETE RESTRICT,
  base_route TEXT NOT NULL,
  slug TEXT NOT NULL,
  path TEXT NOT NULL,
  page_type TEXT NOT NULL DEFAULT 'commercial_landing' CHECK (page_type IN ('commercial_landing','capability','category','buyer_guide','country_landing')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ai_reviewed','approved','published','rejected','archived')),
  source_title TEXT,
  source_summary TEXT,
  seo_title TEXT NOT NULL,
  seo_description TEXT NOT NULL,
  h1 TEXT NOT NULL,
  eyebrow TEXT,
  intro TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  cta JSONB NOT NULL DEFAULT '{}'::jsonb,
  keyword_cluster_ids UUID[] NOT NULL DEFAULT '{}',
  internal_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  json_ld JSONB NOT NULL DEFAULT '{}'::jsonb,
  quality_score INTEGER NOT NULL DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 100),
  quality_report JSONB NOT NULL DEFAULT '{}'::jsonb,
  native_review_status TEXT NOT NULL DEFAULT 'required' CHECK (native_review_status IN ('required','pending','approved','rejected','not_required')),
  noindex BOOLEAN NOT NULL DEFAULT true,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (locale, slug),
  UNIQUE (path)
);

CREATE INDEX IF NOT EXISTS seo_locales_status_priority_idx ON public.seo_locales (status, priority DESC);
CREATE INDEX IF NOT EXISTS seo_keyword_clusters_locale_status_idx ON public.seo_keyword_clusters (locale, status, created_at DESC);
CREATE INDEX IF NOT EXISTS seo_localized_pages_locale_status_idx ON public.seo_localized_pages (locale, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS seo_localized_pages_base_route_idx ON public.seo_localized_pages (base_route, status);
CREATE INDEX IF NOT EXISTS seo_localized_pages_published_idx ON public.seo_localized_pages (published_at DESC) WHERE status = 'published' AND noindex = false;

ALTER TABLE public.seo_locales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_keyword_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_localized_pages ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.seo_locales TO anon, authenticated;
GRANT SELECT ON public.seo_localized_pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seo_locales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_keyword_clusters TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seo_localized_pages TO authenticated;
GRANT ALL ON public.seo_locales, public.seo_keyword_clusters, public.seo_localized_pages TO service_role;

DO $$ BEGIN
  CREATE POLICY "Public reads active SEO locales" ON public.seo_locales
    FOR SELECT TO anon, authenticated
    USING (status = 'active' OR public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage SEO locales" ON public.seo_locales
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage keyword clusters" ON public.seo_keyword_clusters
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public reads published localized pages" ON public.seo_localized_pages
    FOR SELECT TO anon, authenticated
    USING ((status = 'published' AND noindex = false) OR public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage localized pages" ON public.seo_localized_pages
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_seo_locales_updated ON public.seo_locales;
CREATE TRIGGER trg_seo_locales_updated
  BEFORE UPDATE ON public.seo_locales
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_seo_keyword_clusters_updated ON public.seo_keyword_clusters;
CREATE TRIGGER trg_seo_keyword_clusters_updated
  BEFORE UPDATE ON public.seo_keyword_clusters
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_seo_localized_pages_updated ON public.seo_localized_pages;
CREATE TRIGGER trg_seo_localized_pages_updated
  BEFORE UPDATE ON public.seo_localized_pages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.seo_locales (locale, language_name, native_name, direction, target_markets, status, priority, requires_native_review)
VALUES
  ('de-DE','German','Deutsch','ltr',ARRAY['Germany'],'active',100,true),
  ('de-AT','German (Austria)','Deutsch (Österreich)','ltr',ARRAY['Austria'],'active',100,true),
  ('de-CH','German (Switzerland)','Deutsch (Schweiz)','ltr',ARRAY['Switzerland'],'active',95,true),
  ('fr-FR','French','Français','ltr',ARRAY['France'],'active',85,true),
  ('fr-CA','French (Canada)','Français (Canada)','ltr',ARRAY['Canada'],'planned',65,true),
  ('es-ES','Spanish','Español','ltr',ARRAY['Spain'],'active',80,true),
  ('es-MX','Spanish (Mexico)','Español (México)','ltr',ARRAY['Mexico','Latin America'],'planned',55,true),
  ('it-IT','Italian','Italiano','ltr',ARRAY['Italy'],'active',75,true),
  ('nl-NL','Dutch','Nederlands','ltr',ARRAY['Netherlands'],'active',75,true),
  ('nl-BE','Dutch (Belgium)','Nederlands (België)','ltr',ARRAY['Belgium'],'planned',55,true),
  ('pt-PT','Portuguese','Português','ltr',ARRAY['Portugal'],'planned',55,true),
  ('pt-BR','Portuguese (Brazil)','Português (Brasil)','ltr',ARRAY['Brazil'],'planned',55,true),
  ('pl-PL','Polish','Polski','ltr',ARRAY['Poland'],'planned',60,true),
  ('cs-CZ','Czech','Čeština','ltr',ARRAY['Czech Republic'],'planned',50,true),
  ('sk-SK','Slovak','Slovenčina','ltr',ARRAY['Slovakia'],'planned',45,true),
  ('hu-HU','Hungarian','Magyar','ltr',ARRAY['Hungary'],'planned',50,true),
  ('ro-RO','Romanian','Română','ltr',ARRAY['Romania'],'planned',50,true),
  ('bg-BG','Bulgarian','Български','ltr',ARRAY['Bulgaria'],'planned',45,true),
  ('hr-HR','Croatian','Hrvatski','ltr',ARRAY['Croatia'],'planned',45,true),
  ('sl-SI','Slovenian','Slovenščina','ltr',ARRAY['Slovenia'],'planned',45,true),
  ('sr-RS','Serbian','Српски','ltr',ARRAY['Serbia'],'planned',40,true),
  ('bs-BA','Bosnian','Bosanski','ltr',ARRAY['Bosnia and Herzegovina'],'planned',40,true),
  ('tr-TR','Turkish','Türkçe','ltr',ARRAY['Türkiye'],'planned',60,true),
  ('sv-SE','Swedish','Svenska','ltr',ARRAY['Sweden'],'planned',55,true),
  ('no-NO','Norwegian','Norsk','ltr',ARRAY['Norway'],'planned',55,true),
  ('da-DK','Danish','Dansk','ltr',ARRAY['Denmark'],'planned',55,true),
  ('fi-FI','Finnish','Suomi','ltr',ARRAY['Finland'],'planned',50,true),
  ('is-IS','Icelandic','Íslenska','ltr',ARRAY['Iceland'],'planned',30,true),
  ('et-EE','Estonian','Eesti','ltr',ARRAY['Estonia'],'planned',35,true),
  ('lv-LV','Latvian','Latviešu','ltr',ARRAY['Latvia'],'planned',35,true),
  ('lt-LT','Lithuanian','Lietuvių','ltr',ARRAY['Lithuania'],'planned',35,true),
  ('el-GR','Greek','Ελληνικά','ltr',ARRAY['Greece'],'planned',45,true),
  ('uk-UA','Ukrainian','Українська','ltr',ARRAY['Ukraine'],'planned',40,true),
  ('ru-RU','Russian','Русский','ltr',ARRAY['Eastern Europe','Central Asia'],'planned',40,true),
  ('ar-AE','Arabic (UAE)','العربية','rtl',ARRAY['United Arab Emirates'],'active',75,true),
  ('ar-SA','Arabic (Saudi Arabia)','العربية','rtl',ARRAY['Saudi Arabia'],'planned',65,true),
  ('he-IL','Hebrew','עברית','rtl',ARRAY['Israel'],'planned',35,true),
  ('fa-IR','Persian','فارسی','rtl',ARRAY['Iran'],'planned',30,true),
  ('ur-PK','Urdu','اردو','rtl',ARRAY['Pakistan'],'planned',45,true),
  ('hi-IN','Hindi','हिन्दी','ltr',ARRAY['India'],'planned',55,true),
  ('bn-BD','Bengali','বাংলা','ltr',ARRAY['Bangladesh'],'planned',40,true),
  ('pa-PK','Punjabi','پنجابی','rtl',ARRAY['Pakistan'],'planned',30,true),
  ('zh-CN','Chinese (Simplified)','简体中文','ltr',ARRAY['China'],'planned',60,true),
  ('zh-TW','Chinese (Traditional)','繁體中文','ltr',ARRAY['Taiwan','Hong Kong'],'planned',45,true),
  ('ja-JP','Japanese','日本語','ltr',ARRAY['Japan'],'planned',55,true),
  ('ko-KR','Korean','한국어','ltr',ARRAY['South Korea'],'planned',50,true),
  ('id-ID','Indonesian','Bahasa Indonesia','ltr',ARRAY['Indonesia'],'planned',45,true),
  ('ms-MY','Malay','Bahasa Melayu','ltr',ARRAY['Malaysia'],'planned',40,true),
  ('th-TH','Thai','ไทย','ltr',ARRAY['Thailand'],'planned',40,true),
  ('vi-VN','Vietnamese','Tiếng Việt','ltr',ARRAY['Vietnam'],'planned',45,true),
  ('fil-PH','Filipino','Filipino','ltr',ARRAY['Philippines'],'planned',40,true),
  ('sw-KE','Swahili','Kiswahili','ltr',ARRAY['Kenya','East Africa'],'planned',30,true),
  ('af-ZA','Afrikaans','Afrikaans','ltr',ARRAY['South Africa'],'planned',35,true)
ON CONFLICT (locale) DO UPDATE SET
  language_name = EXCLUDED.language_name,
  native_name = EXCLUDED.native_name,
  direction = EXCLUDED.direction,
  target_markets = EXCLUDED.target_markets,
  priority = EXCLUDED.priority,
  requires_native_review = EXCLUDED.requires_native_review;
