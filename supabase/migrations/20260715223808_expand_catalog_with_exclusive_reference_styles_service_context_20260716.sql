-- Expand the catalog using previously unused, product-owned verified media.
-- Security triggers remain enabled; the media update uses a transaction-local
-- service JWT claim, which is the authorization path expected by the trigger.

CREATE TABLE IF NOT EXISTS private.catalog_expansion_product_backup_20260716 AS
SELECT now() AS backed_up_at, p.*
FROM public.products p
WITH NO DATA;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM private.catalog_expansion_product_backup_20260716) THEN
    INSERT INTO private.catalog_expansion_product_backup_20260716
    SELECT now(), p.* FROM public.products p;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS catalog_expansion_product_backup_20260716_id_idx
  ON private.catalog_expansion_product_backup_20260716 (id);

CREATE TABLE IF NOT EXISTS private.catalog_expansion_media_backup_20260716 AS
SELECT now() AS backed_up_at, ma.*
FROM public.media_assets ma
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS catalog_expansion_media_backup_20260716_id_idx
  ON private.catalog_expansion_media_backup_20260716 (id);

CREATE TABLE IF NOT EXISTS private.catalog_reference_style_audit_20260716 (
  source_product_id uuid NOT NULL,
  new_product_id uuid PRIMARY KEY,
  category_id uuid NOT NULL,
  style_number integer NOT NULL,
  source_slug text NOT NULL,
  new_slug text NOT NULL,
  new_name text NOT NULL,
  asset_count integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, new_slug)
);

CREATE TEMP TABLE catalog_expansion_plan ON COMMIT DROP AS
WITH tagged AS (
  SELECT
    ma.id AS media_id,
    ma.public_url,
    ma.checksum_sha256,
    (SELECT replace(t, 'product:', '')::uuid FROM unnest(ma.tags) t WHERE t LIKE 'product:%' LIMIT 1) AS source_product_id,
    COALESCE((SELECT replace(t, 'position:', '')::int FROM unnest(ma.tags) t WHERE t LIKE 'position:%' LIMIT 1), 999) AS source_position
  FROM public.media_assets ma
  WHERE ma.status = 'active'
    AND ma.verification_status = 'verified'
    AND ma.public_url IS NOT NULL
    AND ma.checksum_sha256 IS NOT NULL
), counts AS (
  SELECT source_product_id, count(*) AS asset_count
  FROM tagged
  WHERE source_product_id IS NOT NULL
  GROUP BY source_product_id
), candidates AS (
  SELECT
    p.id AS source_product_id,
    p.category_id,
    p.slug AS source_slug,
    p.name AS source_name,
    p.sort_order AS source_sort_order,
    counts.asset_count,
    generated.style_number
  FROM counts
  JOIN public.products p ON p.id = counts.source_product_id
  CROSS JOIN LATERAL generate_series(2, 1 + floor((counts.asset_count - 6) / 6.0)::int) AS generated(style_number)
  WHERE p.is_published
    AND counts.asset_count >= 12
), planned AS (
  SELECT
    gen_random_uuid() AS new_product_id,
    candidate.*,
    candidate.source_slug || '-reference-style-' || lpad(candidate.style_number::text, 2, '0') AS new_slug,
    candidate.source_name || ' — Reference Style ' || lpad(candidate.style_number::text, 2, '0') AS new_name,
    6 * (candidate.style_number - 1) + 1 AS asset_start_position,
    6 * candidate.style_number AS asset_end_position,
    row_number() OVER (PARTITION BY candidate.category_id ORDER BY candidate.source_name, candidate.style_number) AS category_sequence,
    max(candidate.source_sort_order) OVER (PARTITION BY candidate.category_id) AS source_category_max_sort
  FROM candidates candidate
)
SELECT planned.*
FROM planned
WHERE NOT EXISTS (
  SELECT 1 FROM public.products existing
  WHERE existing.category_id = planned.category_id
    AND existing.slug = planned.new_slug
);

DO $$
DECLARE
  plan_count integer;
BEGIN
  SELECT count(*) INTO plan_count FROM catalog_expansion_plan;
  IF plan_count <> 22 THEN
    RAISE EXCEPTION 'Guarded expansion expected 22 new reference styles, planned %', plan_count;
  END IF;
END $$;

CREATE TEMP TABLE catalog_expansion_assets ON COMMIT DROP AS
WITH tagged AS (
  SELECT
    ma.id AS media_id,
    ma.public_url,
    ma.checksum_sha256,
    (SELECT replace(t, 'product:', '')::uuid FROM unnest(ma.tags) t WHERE t LIKE 'product:%' LIMIT 1) AS source_product_id,
    COALESCE((SELECT replace(t, 'position:', '')::int FROM unnest(ma.tags) t WHERE t LIKE 'position:%' LIMIT 1), 999) AS source_position
  FROM public.media_assets ma
  WHERE ma.status = 'active'
    AND ma.verification_status = 'verified'
    AND ma.public_url IS NOT NULL
    AND ma.checksum_sha256 IS NOT NULL
), selected AS (
  SELECT
    plan.*,
    tagged.media_id,
    tagged.public_url,
    tagged.checksum_sha256,
    tagged.source_position,
    row_number() OVER (
      PARTITION BY plan.new_product_id
      ORDER BY tagged.source_position, tagged.media_id
    ) AS new_position
  FROM catalog_expansion_plan plan
  JOIN tagged
    ON tagged.source_product_id = plan.source_product_id
   AND tagged.source_position BETWEEN plan.asset_start_position AND plan.asset_end_position
)
SELECT * FROM selected;

DO $$
DECLARE
  invalid_style_count integer;
  duplicate_checksum_count integer;
BEGIN
  SELECT count(*) INTO invalid_style_count
  FROM (
    SELECT new_product_id, count(*) AS asset_count
    FROM catalog_expansion_assets
    GROUP BY new_product_id
    HAVING count(*) <> 6
  ) invalid_styles;
  IF invalid_style_count <> 0 THEN
    RAISE EXCEPTION 'Guarded expansion blocked: % planned styles do not have exactly six assets', invalid_style_count;
  END IF;

  SELECT count(*) INTO duplicate_checksum_count
  FROM (
    SELECT checksum_sha256
    FROM catalog_expansion_assets
    GROUP BY checksum_sha256
    HAVING count(*) > 1
  ) duplicate_checksums;
  IF duplicate_checksum_count <> 0 THEN
    RAISE EXCEPTION 'Guarded expansion blocked: % checksums would be reused', duplicate_checksum_count;
  END IF;
END $$;

INSERT INTO private.catalog_expansion_media_backup_20260716
SELECT now(), ma.*
FROM public.media_assets ma
JOIN catalog_expansion_assets selected ON selected.media_id = ma.id
ON CONFLICT (id) DO NOTHING;

WITH product_media AS (
  SELECT
    new_product_id,
    max(public_url) FILTER (WHERE new_position = 1) AS hero_url,
    array_agg(public_url ORDER BY new_position) AS gallery_urls
  FROM catalog_expansion_assets
  GROUP BY new_product_id
), source_context AS (
  SELECT
    plan.*,
    source.specs AS source_specs,
    source.details AS source_details,
    source.customization AS source_customization,
    source.custom_colors AS source_custom_colors,
    source.available_sizes AS source_available_sizes,
    source.available_colors AS source_available_colors,
    source.size_notes AS source_size_notes,
    source.packaging_standard AS source_packaging_standard,
    source.packaging_custom AS source_packaging_custom
  FROM catalog_expansion_plan plan
  JOIN public.products source ON source.id = plan.source_product_id
)
INSERT INTO public.products (
  id, category_id, slug, name, description, image_url, gallery, specs, details,
  material_specifications, seo_title, seo_description, sort_order, is_published,
  sku, is_featured, short_description, moq_display, moq_min, sample_available,
  sample_timeline, production_timeline, country_of_origin, primary_material,
  fabric_composition, gsm, available_sizes, size_notes, available_colors,
  custom_colors, customization, packaging_standard, packaging_custom,
  related_product_ids
)
SELECT
  context.new_product_id,
  context.category_id,
  context.new_slug,
  context.new_name,
  context.new_name || ' is an image-backed reference style for wholesale, OEM, ODM and private-label buyer programs. The six-image gallery is exclusive to this style. Final material, colour, construction, sizing, branding and packaging are confirmed against the buyer brief and approved sample.',
  media.hero_url,
  media.gallery_urls,
  context.source_specs,
  context.source_details,
  NULL,
  context.new_name || ' Manufacturer | Irha Apparels',
  context.new_name || ' for wholesale, OEM, ODM and private-label buyer programs from Irha Apparels, an experienced B2B apparel manufacturer in Sialkot, Pakistan.',
  context.source_category_max_sort + context.category_sequence,
  true,
  NULL,
  false,
  context.new_name || ' for wholesale, OEM, ODM and private-label buyer programs.',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  context.source_available_sizes,
  context.source_size_notes,
  context.source_available_colors,
  COALESCE(context.source_custom_colors, true),
  COALESCE(context.source_customization, '{}'::jsonb) || jsonb_build_object(
    'reference_style', lpad(context.style_number::text, 2, '0'),
    'exclusive_gallery', true,
    'buyer_specification_required', true
  ),
  context.source_packaging_standard,
  context.source_packaging_custom,
  ARRAY[context.source_product_id]::uuid[]
FROM source_context context
JOIN product_media media ON media.new_product_id = context.new_product_id;

SELECT set_config('request.jwt.claim.role', 'service_role', true);

UPDATE public.media_assets ma
SET
  file_name = selected.new_slug || CASE WHEN selected.new_position = 1 THEN '-primary-1' ELSE '-gallery-' || selected.new_position::text END,
  title = selected.new_name || CASE WHEN selected.new_position = 1 THEN ' — primary image 1' ELSE ' — gallery image ' || selected.new_position::text END,
  alt_text = selected.new_name || ' product image',
  tags = ARRAY(
    SELECT tag
    FROM unnest(ma.tags) tag
    WHERE tag NOT LIKE 'product:%'
      AND tag NOT LIKE 'kind:%'
      AND tag NOT LIKE 'position:%'
      AND tag <> 'catalog:exclusive-reference-style'
  ) || ARRAY[
    'product:' || selected.new_product_id::text,
    CASE WHEN selected.new_position = 1 THEN 'kind:primary' ELSE 'kind:gallery' END,
    'position:' || selected.new_position::text,
    'catalog:exclusive-reference-style'
  ],
  usage_notes = concat_ws(E'\n', NULLIF(ma.usage_notes, ''), 'Assigned exclusively to ' || selected.new_name || ' during the guarded catalog expansion. This public URL is not reused by another product gallery.'),
  updated_at = now()
FROM catalog_expansion_assets selected
WHERE ma.id = selected.media_id;

SELECT set_config('request.jwt.claim.role', '', true);

INSERT INTO private.catalog_reference_style_audit_20260716 (
  source_product_id, new_product_id, category_id, style_number, source_slug,
  new_slug, new_name, asset_count
)
SELECT
  plan.source_product_id,
  plan.new_product_id,
  plan.category_id,
  plan.style_number,
  plan.source_slug,
  plan.new_slug,
  plan.new_name,
  count(assets.media_id)
FROM catalog_expansion_plan plan
JOIN catalog_expansion_assets assets ON assets.new_product_id = plan.new_product_id
GROUP BY plan.source_product_id, plan.new_product_id, plan.category_id,
  plan.style_number, plan.source_slug, plan.new_slug, plan.new_name
ON CONFLICT (new_product_id) DO NOTHING;

DO $$
DECLARE
  new_count integer;
  published_count integer;
  invalid_gallery_count integer;
  duplicate_url_count integer;
  ownership_error_count integer;
  guard_trigger_enabled boolean;
BEGIN
  SELECT count(*) INTO new_count FROM private.catalog_reference_style_audit_20260716;
  IF new_count <> 22 THEN
    RAISE EXCEPTION 'Post-validation failed: expected 22 audited reference styles, found %', new_count;
  END IF;

  SELECT count(*) INTO published_count FROM public.products WHERE is_published;
  IF published_count <> 86 THEN
    RAISE EXCEPTION 'Post-validation failed: expected 86 published products, found %', published_count;
  END IF;

  SELECT count(*) INTO invalid_gallery_count
  FROM public.products p
  JOIN private.catalog_reference_style_audit_20260716 audit ON audit.new_product_id = p.id
  WHERE cardinality(p.gallery) <> 6 OR p.gallery[1] IS DISTINCT FROM p.image_url;
  IF invalid_gallery_count <> 0 THEN
    RAISE EXCEPTION 'Post-validation failed: % reference styles have invalid galleries', invalid_gallery_count;
  END IF;

  WITH refs AS (
    SELECT p.id, media_url.url
    FROM public.products p
    CROSS JOIN LATERAL unnest(p.gallery) media_url(url)
    WHERE p.is_published
  )
  SELECT count(*) INTO duplicate_url_count
  FROM (
    SELECT url FROM refs GROUP BY url HAVING count(DISTINCT id) > 1
  ) duplicate_urls;
  IF duplicate_url_count <> 0 THEN
    RAISE EXCEPTION 'Post-validation failed: % media URLs are reused across products', duplicate_url_count;
  END IF;

  WITH tagged AS (
    SELECT
      (SELECT replace(t, 'product:', '')::uuid FROM unnest(ma.tags) t WHERE t LIKE 'product:%' LIMIT 1) AS product_id,
      (SELECT replace(t, 'kind:', '') FROM unnest(ma.tags) t WHERE t LIKE 'kind:%' LIMIT 1) AS kind,
      COALESCE((SELECT replace(t, 'position:', '')::int FROM unnest(ma.tags) t WHERE t LIKE 'position:%' LIMIT 1), 999) AS position
    FROM public.media_assets ma
    WHERE ma.status = 'active' AND ma.verification_status = 'verified'
  ), ownership AS (
    SELECT audit.new_product_id,
           count(tagged.product_id) AS asset_count,
           count(*) FILTER (WHERE tagged.kind = 'primary' AND tagged.position = 1) AS primary_count
    FROM private.catalog_reference_style_audit_20260716 audit
    LEFT JOIN tagged ON tagged.product_id = audit.new_product_id
    GROUP BY audit.new_product_id
  )
  SELECT count(*) INTO ownership_error_count
  FROM ownership
  WHERE asset_count <> 6 OR primary_count <> 1;
  IF ownership_error_count <> 0 THEN
    RAISE EXCEPTION 'Post-validation failed: % reference styles have invalid media ownership', ownership_error_count;
  END IF;

  SELECT tgenabled = 'O' INTO guard_trigger_enabled
  FROM pg_trigger
  WHERE tgrelid = 'public.media_assets'::regclass
    AND tgname = 'media_assets_before_write_trigger';
  IF NOT COALESCE(guard_trigger_enabled, false) THEN
    RAISE EXCEPTION 'Post-validation failed: media before-write security trigger is not enabled';
  END IF;

  INSERT INTO private.catalog_public_release_cache (singleton, payload, updated_at)
  VALUES (true, private.build_catalog_public_release(), now())
  ON CONFLICT (singleton) DO UPDATE
    SET payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at;
END $$;
