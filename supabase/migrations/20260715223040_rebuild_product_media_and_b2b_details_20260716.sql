-- Failure-resistant product media and B2B copy rebuild.
-- Source of truth: exact product ownership, primary and position tags in media_assets.

CREATE TABLE IF NOT EXISTS private.catalog_product_backup_20260716 AS
SELECT now() AS backed_up_at, p.*
FROM public.products p
WITH NO DATA;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM private.catalog_product_backup_20260716) THEN
    INSERT INTO private.catalog_product_backup_20260716
    SELECT now(), p.* FROM public.products p;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS catalog_product_backup_20260716_product_id_idx
  ON private.catalog_product_backup_20260716 (id);

DO $$
DECLARE
  published_count integer;
  missing_primary integer;
  duplicate_checksum_count integer;
BEGIN
  SELECT count(*) INTO published_count FROM public.products WHERE is_published;
  IF published_count <> 64 THEN
    RAISE EXCEPTION 'Expected 64 published products before guarded rebuild, found %', published_count;
  END IF;

  WITH tagged AS (
    SELECT
      (SELECT replace(t, 'product:', '') FROM unnest(ma.tags) t WHERE t LIKE 'product:%' LIMIT 1) AS product_id,
      (SELECT replace(t, 'kind:', '') FROM unnest(ma.tags) t WHERE t LIKE 'kind:%' LIMIT 1) AS kind,
      COALESCE((SELECT replace(t, 'position:', '')::int FROM unnest(ma.tags) t WHERE t LIKE 'position:%' LIMIT 1), 999) AS position
    FROM public.media_assets ma
    WHERE ma.status = 'active' AND ma.verification_status = 'verified'
  )
  SELECT count(*) INTO missing_primary
  FROM public.products p
  WHERE p.is_published
    AND NOT EXISTS (
      SELECT 1 FROM tagged t
      WHERE t.product_id = p.id::text AND t.kind = 'primary' AND t.position = 1
    );
  IF missing_primary <> 0 THEN
    RAISE EXCEPTION 'Guarded rebuild blocked: % products are missing one primary asset', missing_primary;
  END IF;

  WITH tagged AS (
    SELECT
      ma.checksum_sha256,
      (SELECT replace(t, 'product:', '') FROM unnest(ma.tags) t WHERE t LIKE 'product:%' LIMIT 1) AS product_id
    FROM public.media_assets ma
    WHERE ma.status = 'active'
      AND ma.verification_status = 'verified'
      AND ma.checksum_sha256 IS NOT NULL
  )
  SELECT count(*) INTO duplicate_checksum_count
  FROM (
    SELECT checksum_sha256
    FROM tagged
    WHERE product_id IS NOT NULL
    GROUP BY checksum_sha256
    HAVING count(DISTINCT product_id) > 1
  ) duplicate_checksums;
  IF duplicate_checksum_count <> 0 THEN
    RAISE EXCEPTION 'Guarded rebuild blocked: % checksums are assigned to multiple products', duplicate_checksum_count;
  END IF;
END $$;

WITH tagged AS (
  SELECT
    ma.id,
    ma.public_url,
    ma.checksum_sha256,
    (SELECT replace(t, 'product:', '')::uuid FROM unnest(ma.tags) t WHERE t LIKE 'product:%' LIMIT 1) AS product_id,
    (SELECT replace(t, 'kind:', '') FROM unnest(ma.tags) t WHERE t LIKE 'kind:%' LIMIT 1) AS kind,
    COALESCE((SELECT replace(t, 'position:', '')::int FROM unnest(ma.tags) t WHERE t LIKE 'position:%' LIMIT 1), 999) AS position
  FROM public.media_assets ma
  WHERE ma.status = 'active'
    AND ma.verification_status = 'verified'
    AND ma.public_url IS NOT NULL
), checksum_dedup AS (
  SELECT *,
    row_number() OVER (
      PARTITION BY product_id, checksum_sha256
      ORDER BY CASE WHEN kind = 'primary' THEN 0 ELSE 1 END, position, id
    ) AS checksum_rank
  FROM tagged
  WHERE product_id IS NOT NULL AND checksum_sha256 IS NOT NULL
), ordered AS (
  SELECT *,
    row_number() OVER (
      PARTITION BY product_id
      ORDER BY CASE WHEN kind = 'primary' AND position = 1 THEN 0 ELSE 1 END, position, id
    ) AS gallery_slot
  FROM checksum_dedup
  WHERE checksum_rank = 1
), media_rollup AS (
  SELECT
    product_id,
    max(public_url) FILTER (WHERE kind = 'primary' AND position = 1) AS hero_url,
    array_agg(public_url ORDER BY gallery_slot) FILTER (WHERE gallery_slot <= 6) AS gallery_urls
  FROM ordered
  GROUP BY product_id
), product_context AS (
  SELECT
    p.id,
    p.name,
    c.slug AS category_slug,
    COALESCE(parent.slug, c.slug) AS top_slug
  FROM public.products p
  JOIN public.categories c ON c.id = p.category_id
  LEFT JOIN public.categories parent ON parent.id = c.parent_id
)
UPDATE public.products p
SET
  image_url = media.hero_url,
  gallery = media.gallery_urls,
  short_description = CASE context.top_slug
    WHEN 'bavarian-trachten-wear' THEN p.name || ' for wholesale, Oktoberfest, OEM and private-label Trachten programs.'
    WHEN 'premium-leather-apparel' THEN p.name || ' for wholesale, OEM and private-label leather apparel programs.'
    WHEN 'sportswear' THEN p.name || ' for clubs, teams, distributors and private-label performance programs.'
    WHEN 'streetwear-activewear' THEN p.name || ' for wholesale, brand and private-label streetwear programs.'
    WHEN 'leisure-nightwear' THEN p.name || ' for wholesale, hospitality, retail and private-label lounge or sleepwear programs.'
    ELSE p.name || ' for wholesale, OEM and private-label buyer programs.'
  END,
  description = CASE context.top_slug
    WHEN 'bavarian-trachten-wear' THEN p.name || ' presented for B2B Trachten and Oktoberfest sourcing programs. Material, colour, embroidery, trims, sizing, branding and packaging are developed against the buyer brief and confirmed through the approved sample.'
    WHEN 'premium-leather-apparel' THEN p.name || ' presented for B2B leather apparel sourcing programs. Leather or alternative material, finish, lining, hardware, construction, sizing, branding and packaging are confirmed against the buyer brief and approved sample.'
    WHEN 'sportswear' THEN p.name || ' presented for B2B teamwear and performance apparel programs. Fabric, panel construction, colourway, logos, player details, sizing, labels and packing are developed against the buyer brief and approved sample.'
    WHEN 'streetwear-activewear' THEN p.name || ' presented for B2B streetwear and private-label collections. Fabric, fit, wash or finish, artwork placement, trims, labels, size grading and packaging are confirmed against the buyer brief and approved sample.'
    WHEN 'leisure-nightwear' THEN p.name || ' presented for B2B leisurewear and nightwear collections. Fabric, hand feel, fit, colour, trims, labels, size grading and retail or bulk packaging are confirmed against the buyer brief and approved sample.'
    ELSE p.name || ' presented for wholesale, OEM, ODM and private-label buyer programs. Final specifications are confirmed against the buyer brief and approved sample.'
  END,
  specs = CASE context.top_slug
    WHEN 'bavarian-trachten-wear' THEN ARRAY[
      'Wholesale, OEM, ODM and private-label Trachten programs',
      'Buyer-specified material, colour, embroidery and trim development',
      'Custom woven labels, care labels, hangtags and packaging by approved brief',
      'Sizing and grading confirmed against the buyer size chart'
    ]::text[]
    WHEN 'premium-leather-apparel' THEN ARRAY[
      'Wholesale, OEM, ODM and private-label leather programs',
      'Buyer-specified material, finish, lining, hardware and construction',
      'Custom embroidery, patches, labels, hangtags and packaging by approved brief',
      'Sizing and grading confirmed against the buyer size chart'
    ]::text[]
    WHEN 'sportswear' THEN ARRAY[
      'Club, team, distributor and private-label programs',
      'Buyer-specified performance fabric, panels and colourways',
      'Sublimation, embroidery, print, names and numbers by approved artwork',
      'Sizing, labels and packing confirmed against the buyer brief'
    ]::text[]
    WHEN 'streetwear-activewear' THEN ARRAY[
      'Wholesale, OEM, ODM and private-label collections',
      'Buyer-specified fabric, fit, wash, finish and colour development',
      'Embroidery, print, patches, woven labels and hangtags by approved artwork',
      'Sizing and packaging confirmed against the buyer brief'
    ]::text[]
    WHEN 'leisure-nightwear' THEN ARRAY[
      'Wholesale, retail, hospitality and private-label programs',
      'Buyer-specified fabric, hand feel, fit, colour and trim development',
      'Custom labels, embroidery or print and packaging by approved brief',
      'Sizing and grading confirmed against the buyer size chart'
    ]::text[]
    ELSE ARRAY[
      'Wholesale, OEM, ODM and private-label programs',
      'Materials and construction confirmed against the approved sample',
      'Custom branding, labels, hangtags and packaging by buyer specification',
      'Sizing and grading confirmed against the buyer size chart'
    ]::text[]
  END,
  details = jsonb_build_array(
    jsonb_build_object('label', 'Buyer program', 'value', 'Wholesale / OEM / ODM / private label'),
    jsonb_build_object('label', 'Materials', 'value', 'Confirmed against the buyer specification and approved sample'),
    jsonb_build_object('label', 'Customization', 'value', CASE context.top_slug
      WHEN 'sportswear' THEN 'Colourways, panels, logos, names and numbers by approved artwork'
      WHEN 'premium-leather-apparel' THEN 'Material, finish, hardware, lining, patches and branding by approved brief'
      WHEN 'bavarian-trachten-wear' THEN 'Colour, embroidery, trims, hardware and private-label branding by approved brief'
      ELSE 'Colour, construction, artwork, trims and private-label branding by approved brief'
    END),
    jsonb_build_object('label', 'Sizing', 'value', 'Buyer size chart and grading confirmed before production'),
    jsonb_build_object('label', 'Branding', 'value', 'Embroidery, print, woven labels, care labels and hangtags available by brief'),
    jsonb_build_object('label', 'Packaging', 'value', 'Retail or bulk packing developed to buyer requirement')
  ),
  customization = jsonb_build_object(
    'private_label', true,
    'buyer_colours', true,
    'artwork_review_required', true,
    'labels_and_hangtags', true,
    'custom_packaging', true
  ),
  custom_colors = true,
  seo_title = p.name || ' Manufacturer | Irha Apparels',
  seo_description = p.name || ' for wholesale, OEM, ODM and private-label buyer programs from Irha Apparels, an experienced B2B apparel manufacturer in Sialkot, Pakistan.',
  updated_at = now()
FROM media_rollup media
JOIN product_context context ON context.id = media.product_id
WHERE p.id = media.product_id
  AND p.is_published;

DO $$
DECLARE
  rebuilt_count integer;
  oversized_count integer;
  hero_mismatch_count integer;
  cross_product_url_duplicates integer;
BEGIN
  SELECT count(*) INTO rebuilt_count
  FROM public.products
  WHERE is_published
    AND image_url IS NOT NULL
    AND cardinality(gallery) BETWEEN 3 AND 6;
  IF rebuilt_count <> 64 THEN
    RAISE EXCEPTION 'Post-validation failed: expected 64 rebuilt products, found %', rebuilt_count;
  END IF;

  SELECT count(*) INTO oversized_count
  FROM public.products
  WHERE is_published AND cardinality(gallery) > 6;
  IF oversized_count <> 0 THEN
    RAISE EXCEPTION 'Post-validation failed: % galleries still exceed six images', oversized_count;
  END IF;

  SELECT count(*) INTO hero_mismatch_count
  FROM public.products
  WHERE is_published AND gallery[1] IS DISTINCT FROM image_url;
  IF hero_mismatch_count <> 0 THEN
    RAISE EXCEPTION 'Post-validation failed: % heroes do not match gallery position one', hero_mismatch_count;
  END IF;

  WITH refs AS (
    SELECT p.id, media_url.url
    FROM public.products p
    CROSS JOIN LATERAL unnest(p.gallery) media_url(url)
    WHERE p.is_published
  )
  SELECT count(*) INTO cross_product_url_duplicates
  FROM (
    SELECT url FROM refs GROUP BY url HAVING count(DISTINCT id) > 1
  ) duplicate_urls;
  IF cross_product_url_duplicates <> 0 THEN
    RAISE EXCEPTION 'Post-validation failed: % media URLs are reused across products', cross_product_url_duplicates;
  END IF;

  INSERT INTO private.catalog_public_release_cache (singleton, payload, updated_at)
  VALUES (true, private.build_catalog_public_release(), now())
  ON CONFLICT (singleton) DO UPDATE
    SET payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at;
END $$;
