-- Lovable security scan hardening.
-- Idempotent production migration: preserves public catalogue/CMS behavior while
-- removing anonymous SECURITY DEFINER execution and direct table-write bypasses.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. Keep the public catalogue RPC as SECURITY INVOKER without losing the
-- hidden-item release metadata used by the frontend. A private cache is rebuilt
-- after every catalogue mutation by a non-callable trigger helper.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS private.catalog_public_release_cache (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION private.build_catalog_public_release()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
WITH category_rows AS (
  SELECT
    c.*,
    parent.slug AS parent_slug,
    COALESCE(parent.is_published, true) AS parent_is_published
  FROM public.categories c
  LEFT JOIN public.categories parent ON parent.id = c.parent_id
),
published_categories AS (
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'parent_id', c.parent_id,
      'parent_slug', c.parent_slug,
      'slug', c.slug,
      'name', c.name,
      'short', c.short,
      'description', c.description,
      'image_url', c.image_url,
      'catalog_url', c.catalog_url,
      'details', to_jsonb(c.details),
      'seo_title', c.seo_title,
      'seo_description', c.seo_description,
      'sort_order', c.sort_order,
      'is_published', true,
      'updated_at', c.updated_at
    ) ORDER BY COALESCE(c.parent_id, c.id), c.sort_order, c.name
  ), '[]'::jsonb) AS value
  FROM category_rows c
  WHERE c.is_published AND c.parent_is_published
),
published_products AS (
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'category_id', p.category_id,
      'category_slug', c.slug,
      'parent_slug', c.parent_slug,
      'slug', p.slug,
      'name', p.name,
      'description', p.description,
      'image_url', p.image_url,
      'gallery', to_jsonb(p.gallery),
      'specs', to_jsonb(p.specs),
      'details', p.details,
      'material_specifications', p.material_specifications,
      'seo_title', p.seo_title,
      'seo_description', p.seo_description,
      'sort_order', p.sort_order,
      'is_published', true,
      'sku', p.sku,
      'is_featured', p.is_featured,
      'short_description', p.short_description,
      'sample_available', p.sample_available,
      'country_of_origin', p.country_of_origin,
      'primary_material', p.primary_material,
      'fabric_composition', p.fabric_composition,
      'gsm', p.gsm,
      'available_sizes', to_jsonb(p.available_sizes),
      'size_notes', p.size_notes,
      'available_colors', to_jsonb(p.available_colors),
      'custom_colors', p.custom_colors,
      'customization', p.customization,
      'packaging_standard', p.packaging_standard,
      'packaging_custom', p.packaging_custom,
      'related_product_ids', to_jsonb(p.related_product_ids),
      'updated_at', p.updated_at
    ) ORDER BY c.slug, p.sort_order, p.name
  ), '[]'::jsonb) AS value
  FROM public.products p
  JOIN category_rows c ON c.id = p.category_id
  WHERE p.is_published AND c.is_published AND c.parent_is_published
),
hidden_categories AS (
  SELECT COALESCE(jsonb_agg(c.slug ORDER BY c.slug), '[]'::jsonb) AS value
  FROM category_rows c
  WHERE NOT c.is_published OR NOT c.parent_is_published
),
hidden_products AS (
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'category_slug', c.slug,
      'parent_slug', c.parent_slug,
      'product_slug', p.slug
    ) ORDER BY c.slug, p.slug
  ), '[]'::jsonb) AS value
  FROM public.products p
  JOIN category_rows c ON c.id = p.category_id
  WHERE NOT p.is_published OR NOT c.is_published OR NOT c.parent_is_published
),
release_clock AS (
  SELECT GREATEST(
    COALESCE((SELECT max(updated_at) FROM public.categories), 'epoch'::timestamptz),
    COALESCE((SELECT max(updated_at) FROM public.products), 'epoch'::timestamptz)
  ) AS value
)
SELECT jsonb_build_object(
  'categories', published_categories.value,
  'products', published_products.value,
  'hiddenCategorySlugs', hidden_categories.value,
  'hiddenProducts', hidden_products.value,
  'releasedAt', release_clock.value
)
FROM published_categories, published_products, hidden_categories, hidden_products, release_clock;
$function$;

REVOKE ALL ON FUNCTION private.build_catalog_public_release() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.refresh_catalog_public_release_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
BEGIN
  INSERT INTO private.catalog_public_release_cache (singleton, payload, updated_at)
  VALUES (true, private.build_catalog_public_release(), now())
  ON CONFLICT (singleton) DO UPDATE
    SET payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION private.refresh_catalog_public_release_cache() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS refresh_catalog_public_release_categories ON public.categories;
CREATE TRIGGER refresh_catalog_public_release_categories
AFTER INSERT OR UPDATE OR DELETE ON public.categories
FOR EACH STATEMENT EXECUTE FUNCTION private.refresh_catalog_public_release_cache();

DROP TRIGGER IF EXISTS refresh_catalog_public_release_products ON public.products;
CREATE TRIGGER refresh_catalog_public_release_products
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH STATEMENT EXECUTE FUNCTION private.refresh_catalog_public_release_cache();

INSERT INTO private.catalog_public_release_cache (singleton, payload, updated_at)
VALUES (true, private.build_catalog_public_release(), now())
ON CONFLICT (singleton) DO UPDATE
  SET payload = EXCLUDED.payload,
      updated_at = EXCLUDED.updated_at;

GRANT SELECT ON private.catalog_public_release_cache TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.catalog_get_public_release()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'private'
AS $function$
  SELECT payload
  FROM private.catalog_public_release_cache
  WHERE singleton = true;
$function$;

REVOKE ALL ON FUNCTION public.catalog_get_public_release() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.catalog_get_public_release() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Published CMS content is copied to a private read-only projection. This
-- prevents anonymous callers from needing a SECURITY DEFINER function and keeps
-- draft content inaccessible through the REST API.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS private.cms_public_documents (
  document_key text PRIMARY KEY,
  published_content jsonb NOT NULL,
  published_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO private.cms_public_documents (document_key, published_content, published_at, updated_at)
SELECT document_key, published_content, published_at, now()
FROM public.cms_documents
WHERE status = 'published' AND published_content IS NOT NULL
ON CONFLICT (document_key) DO UPDATE
  SET published_content = EXCLUDED.published_content,
      published_at = EXCLUDED.published_at,
      updated_at = EXCLUDED.updated_at;

CREATE OR REPLACE FUNCTION private.sync_cms_public_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM private.cms_public_documents WHERE document_key = OLD.document_key;
    RETURN OLD;
  END IF;

  IF NEW.status = 'published' AND NEW.published_content IS NOT NULL THEN
    INSERT INTO private.cms_public_documents (document_key, published_content, published_at, updated_at)
    VALUES (NEW.document_key, NEW.published_content, NEW.published_at, now())
    ON CONFLICT (document_key) DO UPDATE
      SET published_content = EXCLUDED.published_content,
          published_at = EXCLUDED.published_at,
          updated_at = EXCLUDED.updated_at;
  ELSE
    DELETE FROM private.cms_public_documents WHERE document_key = NEW.document_key;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.sync_cms_public_document() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_cms_public_document ON public.cms_documents;
CREATE TRIGGER sync_cms_public_document
AFTER INSERT OR UPDATE OR DELETE ON public.cms_documents
FOR EACH ROW EXECUTE FUNCTION private.sync_cms_public_document();

GRANT SELECT ON private.cms_public_documents TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cms_get_published_document(_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'private'
AS $function$
  SELECT published_content
  FROM private.cms_public_documents
  WHERE document_key = _key
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.cms_get_published_document(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cms_get_published_document(text) TO anon, authenticated, service_role;

-- Existing public content RPCs already filter published rows and their tables
-- have matching public-read RLS policies, so SECURITY INVOKER is sufficient.
GRANT SELECT ON public.blog_posts, public.faqs, public.seo_page_overrides, public.internal_links TO anon, authenticated;
ALTER FUNCTION public.content_get_public_blog_post(text, text) SECURITY INVOKER;
ALTER FUNCTION public.content_get_public_blog_posts(text) SECURITY INVOKER;
ALTER FUNCTION public.content_get_public_faqs(text) SECURITY INVOKER;
ALTER FUNCTION public.content_get_public_page_tools(text, text) SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.content_get_public_blog_post(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.content_get_public_blog_posts(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.content_get_public_faqs(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.content_get_public_page_tools(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.content_get_public_blog_post(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.content_get_public_blog_posts(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.content_get_public_faqs(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.content_get_public_page_tools(text, text) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Public submissions must pass through the validated/rate-limited gateway.
-- Remove the old direct anonymous table-write fallback.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Validated public inquiry insert" ON public.inquiries;
REVOKE INSERT, UPDATE, DELETE ON public.inquiries FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.catalogue_leads FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Storage buckets: enforce server-side size/MIME limits and add explicit
-- admin access policies to legacy private buckets that previously had none.
-- ---------------------------------------------------------------------------
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/png','image/webp']
WHERE id = 'inquiry-uploads';

UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/png','image/webp']
WHERE id = 'mockup-uploads';

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
WHERE id = 'mockup-cache';

DROP POLICY IF EXISTS "inquiry_uploads_admin_insert" ON storage.objects;
CREATE POLICY "inquiry_uploads_admin_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'inquiry-uploads' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "mockup_uploads_admin_select" ON storage.objects;
CREATE POLICY "mockup_uploads_admin_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'mockup-uploads' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "mockup_uploads_admin_insert" ON storage.objects;
CREATE POLICY "mockup_uploads_admin_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'mockup-uploads' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "mockup_uploads_admin_update" ON storage.objects;
CREATE POLICY "mockup_uploads_admin_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'mockup-uploads' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'mockup-uploads' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "mockup_uploads_admin_delete" ON storage.objects;
CREATE POLICY "mockup_uploads_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'mockup-uploads' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "mockup_cache_admin_select" ON storage.objects;
CREATE POLICY "mockup_cache_admin_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'mockup-cache' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "mockup_cache_admin_update" ON storage.objects;
CREATE POLICY "mockup_cache_admin_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'mockup-cache' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'mockup-cache' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "mockup_cache_admin_delete" ON storage.objects;
CREATE POLICY "mockup_cache_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'mockup-cache' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "database_export_admin_select" ON storage.objects;
CREATE POLICY "database_export_admin_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'database_export_12_07_26' AND public.has_role(auth.uid(), 'admin'::public.app_role));

COMMIT;
