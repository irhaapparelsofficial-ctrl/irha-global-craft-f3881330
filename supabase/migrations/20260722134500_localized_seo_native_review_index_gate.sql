-- Prevent unreviewed localized pages from being publicly indexable.
-- Existing content is preserved for admin review; only indexability/public exposure changes.

UPDATE public.seo_localized_pages
SET
  noindex = true,
  updated_at = now()
WHERE noindex = false
  AND native_review_status NOT IN ('approved', 'not_required');

ALTER TABLE public.seo_localized_pages
  DROP CONSTRAINT IF EXISTS seo_localized_pages_indexability_review_check;

ALTER TABLE public.seo_localized_pages
  ADD CONSTRAINT seo_localized_pages_indexability_review_check
  CHECK (
    noindex = true
    OR native_review_status IN ('approved', 'not_required')
  ) NOT VALID;

ALTER TABLE public.seo_localized_pages
  VALIDATE CONSTRAINT seo_localized_pages_indexability_review_check;

-- Remove both the original combined policy name and the current split read
-- policies so no older permissive policy can survive this gate.
DROP POLICY IF EXISTS "Public reads published localized pages"
  ON public.seo_localized_pages;
DROP POLICY IF EXISTS seo_localized_pages_anon_read
  ON public.seo_localized_pages;
DROP POLICY IF EXISTS seo_localized_pages_authenticated_read
  ON public.seo_localized_pages;

CREATE POLICY seo_localized_pages_anon_read
  ON public.seo_localized_pages
  FOR SELECT
  TO anon
  USING (
    status = 'published'
    AND noindex = false
    AND native_review_status IN ('approved', 'not_required')
  );

CREATE POLICY seo_localized_pages_authenticated_read
  ON public.seo_localized_pages
  FOR SELECT
  TO authenticated
  USING (
    (
      status = 'published'
      AND noindex = false
      AND native_review_status IN ('approved', 'not_required')
    )
    OR (SELECT public.has_role(auth.uid(), 'admin'))
  );

CREATE OR REPLACE FUNCTION public.get_public_sitemap_entries()
RETURNS TABLE(
  path text,
  image_url text,
  lastmod timestamptz,
  entry_kind text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    p.canonical_path AS path,
    p.image_url,
    p.updated_at AS lastmod,
    'product'::text AS entry_kind
  FROM public.products p
  WHERE p.source_drive_folder_id IS NOT NULL
    AND p.is_published
    AND p.publish_state = 'published'
    AND p.canonical_path LIKE '/products/%'
    AND nullif(trim(p.image_url), '') IS NOT NULL

  UNION ALL

  SELECT
    l.path,
    p.image_url,
    l.updated_at AS lastmod,
    'localized_product'::text AS entry_kind
  FROM public.seo_localized_pages l
  JOIN public.products p ON p.canonical_path = l.base_route
  WHERE l.status = 'published'
    AND l.noindex = false
    AND l.native_review_status IN ('approved', 'not_required')
    AND l.path LIKE '/intl/%'
    AND p.source_drive_folder_id IS NOT NULL
    AND p.is_published
    AND p.publish_state = 'published'

  UNION ALL

  SELECT
    '/products/' || n.full_slug_path AS path,
    n.image_url,
    n.updated_at AS lastmod,
    'taxonomy'::text AS entry_kind
  FROM public.catalog_taxonomy_nodes n
  WHERE n.publish_state = 'published'
    AND nullif(trim(n.full_slug_path), '') IS NOT NULL;
$function$;

REVOKE ALL ON FUNCTION public.get_public_sitemap_entries() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_sitemap_entries() TO anon, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.seo_localized_pages
    WHERE noindex = false
      AND native_review_status NOT IN ('approved', 'not_required')
  ) THEN
    RAISE EXCEPTION 'Unreviewed localized pages remain indexable';
  END IF;
END
$$;

COMMENT ON CONSTRAINT seo_localized_pages_indexability_review_check
  ON public.seo_localized_pages
  IS 'Localized pages may be indexable only after approved native review or an explicit not-required decision.';
