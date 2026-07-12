-- Phase 2 / Batch 2.4: media library and global site settings.
-- Deployment is intentionally deferred to the final one-time database activation.

CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL DEFAULT 'site-media',
  storage_path text NOT NULL UNIQUE,
  public_url text NOT NULL,
  title text,
  alt_text text,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  width integer CHECK (width IS NULL OR width > 0),
  height integer CHECK (height IS NULL OR height > 0),
  tags text[] NOT NULL DEFAULT '{}',
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_assets_bucket_check CHECK (bucket = 'site-media'),
  CONSTRAINT media_assets_public_url_check CHECK (public_url ~ '^https://'),
  CONSTRAINT media_assets_mime_check CHECK (mime_type IN ('image/jpeg','image/png','image/webp','image/avif','application/pdf'))
);

CREATE TABLE IF NOT EXISTS public.media_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('insert','update','delete')),
  before_data jsonb,
  after_data jsonb,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_assets_public_idx
  ON public.media_assets (is_archived, created_at DESC);
CREATE INDEX IF NOT EXISTS media_assets_tags_idx
  ON public.media_assets USING gin (tags);
CREATE INDEX IF NOT EXISTS media_change_log_asset_idx
  ON public.media_change_log (asset_id, created_at DESC);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_change_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='media_assets' AND policyname='media_assets_public_read') THEN
    CREATE POLICY media_assets_public_read ON public.media_assets
      FOR SELECT TO anon, authenticated USING (NOT is_archived);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='media_assets' AND policyname='media_assets_admin_all') THEN
    CREATE POLICY media_assets_admin_all ON public.media_assets
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='media_change_log' AND policyname='media_change_log_admin_read') THEN
    CREATE POLICY media_change_log_admin_read ON public.media_change_log
      FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.media_assets FROM anon;
REVOKE ALL ON TABLE public.media_change_log FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.media_change_log FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.media_assets TO authenticated;
GRANT SELECT ON TABLE public.media_assets TO anon;
GRANT SELECT ON TABLE public.media_change_log TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-media',
  'site-media',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/avif','application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='site_media_public_read') THEN
    CREATE POLICY site_media_public_read ON storage.objects
      FOR SELECT TO anon, authenticated USING (bucket_id = 'site-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='site_media_admin_insert') THEN
    CREATE POLICY site_media_admin_insert ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='site_media_admin_update') THEN
    CREATE POLICY site_media_admin_update ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'))
      WITH CHECK (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='site_media_admin_delete') THEN
    CREATE POLICY site_media_admin_delete ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.media_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.media_record_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.media_change_log (asset_id, action, before_data, after_data, changed_by)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    lower(TG_OP),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_media_assets_touch ON public.media_assets;
CREATE TRIGGER trg_media_assets_touch
BEFORE UPDATE ON public.media_assets
FOR EACH ROW EXECUTE FUNCTION public.media_touch_updated_at();

DROP TRIGGER IF EXISTS trg_media_assets_audit ON public.media_assets;
CREATE TRIGGER trg_media_assets_audit
AFTER INSERT OR UPDATE OR DELETE ON public.media_assets
FOR EACH ROW EXECUTE FUNCTION public.media_record_change();

CREATE OR REPLACE FUNCTION public.media_get_usage(_asset_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text;
  _references jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT public_url INTO _url FROM public.media_assets WHERE id = _asset_id;
  IF _url IS NULL THEN RAISE EXCEPTION 'asset not found'; END IF;

  SELECT COALESCE(jsonb_agg(ref), '[]'::jsonb)
  INTO _references
  FROM (
    SELECT jsonb_build_object('type','product','id',p.id,'label',p.name) AS ref
    FROM public.products p
    WHERE p.image_url = _url OR _url = ANY(COALESCE(p.gallery, '{}'))
    UNION ALL
    SELECT jsonb_build_object('type','category','id',c.id,'label',c.name)
    FROM public.categories c WHERE c.image_url = _url
    UNION ALL
    SELECT jsonb_build_object('type','blog_post','id',b.id,'label',b.title)
    FROM public.blog_posts b WHERE b.cover_image_url = _url OR b.og_image_url = _url
    UNION ALL
    SELECT jsonb_build_object('type','seo_override','id',s.id,'label',s.route)
    FROM public.seo_page_overrides s WHERE s.og_image_url = _url
    UNION ALL
    SELECT jsonb_build_object('type','cms_document','id',d.id,'label',d.title)
    FROM public.cms_documents d
    WHERE d.draft_content::text LIKE '%' || _url || '%'
       OR COALESCE(d.published_content::text, '') LIKE '%' || _url || '%'
  ) refs;

  RETURN jsonb_build_object(
    'assetId', _asset_id,
    'publicUrl', _url,
    'usageCount', jsonb_array_length(_references),
    'references', _references
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.media_get_admin_health()
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
    'assetCount', (SELECT count(*) FROM public.media_assets),
    'activeAssetCount', (SELECT count(*) FROM public.media_assets WHERE NOT is_archived),
    'archivedAssetCount', (SELECT count(*) FROM public.media_assets WHERE is_archived),
    'missingAltCount', (SELECT count(*) FROM public.media_assets WHERE NOT is_archived AND mime_type LIKE 'image/%' AND COALESCE(alt_text,'') = ''),
    'totalBytes', (SELECT COALESCE(sum(size_bytes),0) FROM public.media_assets),
    'lastChangeAt', (SELECT max(created_at) FROM public.media_change_log)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.media_touch_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.media_record_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.media_get_usage(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.media_get_admin_health() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.media_touch_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.media_record_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.media_get_usage(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.media_get_admin_health() FROM anon;
GRANT EXECUTE ON FUNCTION public.media_get_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.media_get_admin_health() TO authenticated;

-- Seed current global settings without changing existing buyer-facing content.
INSERT INTO public.cms_documents (
  document_key, document_type, title, draft_content, published_content,
  status, version, published_version, created_at, updated_at, published_at
)
VALUES (
  'site.global.settings',
  'site_settings',
  'Global Site Settings',
  jsonb_build_object(
    'company', jsonb_build_object(
      'name','Irha Apparels',
      'tagline','B2B Custom Apparel Manufacturer',
      'address','Sialkot, Punjab, Pakistan',
      'locationLabel','Sialkot, Pakistan'
    ),
    'contact', jsonb_build_object(
      'email','irhaapparelsofficial@gmail.com',
      'phoneDisplay','+92 320 411 0066',
      'whatsappNumber','923204110066',
      'whatsappMessage','Hello Irha Apparels, I''d like to discuss a custom B2B apparel requirement.'
    ),
    'social', jsonb_build_object(
      'instagram','https://www.instagram.com/irhaapparels',
      'facebook','https://web.facebook.com/profile.php?id=61590950402472',
      'tiktok','https://www.tiktok.com/@irhaapparels',
      'linkedin',''
    ),
    'announcement', jsonb_build_object(
      'enabled',false,
      'id','site-announcement',
      'label','Buyer Update',
      'message','',
      'ctaText','',
      'ctaHref','/inquiry',
      'theme','gold',
      'dismissible',true
    ),
    'footer', jsonb_build_object(
      'companyBlurb','Custom B2B apparel programs reviewed against buyer specifications before commercial commitments.',
      'showBlogLink',true,
      'buyerReadiness',jsonb_build_array(
        jsonb_build_object('label','Requirement-led review','note','Scope confirmed before commitment'),
        jsonb_build_object('label','Private-label options','note','Labels, tags and packaging by program'),
        jsonb_build_object('label','Order documentation','note','Requirements confirmed before dispatch'),
        jsonb_build_object('label','Live factory view','note','Available by scheduled video call')
      ),
      'legalLinks',jsonb_build_array(
        jsonb_build_object('label','Privacy Policy','href','/privacy-policy'),
        jsonb_build_object('label','Terms of Service','href','/terms-of-service')
      )
    )
  ),
  jsonb_build_object(
    'company', jsonb_build_object(
      'name','Irha Apparels','tagline','B2B Custom Apparel Manufacturer','address','Sialkot, Punjab, Pakistan','locationLabel','Sialkot, Pakistan'
    ),
    'contact', jsonb_build_object(
      'email','irhaapparelsofficial@gmail.com','phoneDisplay','+92 320 411 0066','whatsappNumber','923204110066','whatsappMessage','Hello Irha Apparels, I''d like to discuss a custom B2B apparel requirement.'
    ),
    'social', jsonb_build_object(
      'instagram','https://www.instagram.com/irhaapparels','facebook','https://web.facebook.com/profile.php?id=61590950402472','tiktok','https://www.tiktok.com/@irhaapparels','linkedin',''
    ),
    'announcement', jsonb_build_object(
      'enabled',false,'id','site-announcement','label','Buyer Update','message','','ctaText','','ctaHref','/inquiry','theme','gold','dismissible',true
    ),
    'footer', jsonb_build_object(
      'companyBlurb','Custom B2B apparel programs reviewed against buyer specifications before commercial commitments.',
      'showBlogLink',true,
      'buyerReadiness',jsonb_build_array(
        jsonb_build_object('label','Requirement-led review','note','Scope confirmed before commitment'),
        jsonb_build_object('label','Private-label options','note','Labels, tags and packaging by program'),
        jsonb_build_object('label','Order documentation','note','Requirements confirmed before dispatch'),
        jsonb_build_object('label','Live factory view','note','Available by scheduled video call')
      ),
      'legalLinks',jsonb_build_array(
        jsonb_build_object('label','Privacy Policy','href','/privacy-policy'),
        jsonb_build_object('label','Terms of Service','href','/terms-of-service')
      )
    )
  ),
  'published',1,1,now(),now(),now()
)
ON CONFLICT (document_key) DO NOTHING;

INSERT INTO public.cms_documents (
  document_key, document_type, title, draft_content, published_content,
  status, version, published_version, created_at, updated_at, published_at
)
VALUES (
  'site.home.sections',
  'page',
  'Homepage Section Layout',
  jsonb_build_object('sections',jsonb_build_array(
    jsonb_build_object('key','hero','label','Hero','visible',true,'order',0,'locked',true),
    jsonb_build_object('key','capabilities','label','Capability Strip','visible',true,'order',10),
    jsonb_build_object('key','production_hubs','label','Production Hubs','visible',true,'order',20),
    jsonb_build_object('key','categories','label','Five Categories','visible',true,'order',30),
    jsonb_build_object('key','why_b2b','label','Why B2B','visible',true,'order',40),
    jsonb_build_object('key','buyer_trust','label','Buyer Trust','visible',true,'order',50),
    jsonb_build_object('key','process','label','Process Timeline','visible',true,'order',60),
    jsonb_build_object('key','start_program','label','Start Program CTA','visible',true,'order',70)
  )),
  jsonb_build_object('sections',jsonb_build_array(
    jsonb_build_object('key','hero','label','Hero','visible',true,'order',0,'locked',true),
    jsonb_build_object('key','capabilities','label','Capability Strip','visible',true,'order',10),
    jsonb_build_object('key','production_hubs','label','Production Hubs','visible',true,'order',20),
    jsonb_build_object('key','categories','label','Five Categories','visible',true,'order',30),
    jsonb_build_object('key','why_b2b','label','Why B2B','visible',true,'order',40),
    jsonb_build_object('key','buyer_trust','label','Buyer Trust','visible',true,'order',50),
    jsonb_build_object('key','process','label','Process Timeline','visible',true,'order',60),
    jsonb_build_object('key','start_program','label','Start Program CTA','visible',true,'order',70)
  )),
  'published',1,1,now(),now(),now()
)
ON CONFLICT (document_key) DO NOTHING;

INSERT INTO public.cms_document_revisions (document_id, version, content, action)
SELECT d.id, 1, d.published_content, 'published'
FROM public.cms_documents d
WHERE d.document_key IN ('site.global.settings','site.home.sections')
  AND NOT EXISTS (SELECT 1 FROM public.cms_document_revisions r WHERE r.document_id=d.id);
