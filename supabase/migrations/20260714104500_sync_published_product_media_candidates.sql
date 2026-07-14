-- Seed the Media Library from real, already-published product media.
-- These rows are review candidates only: they remain pending and are never
-- automatically social-approved or represented as AI-generated assets.

WITH product_media AS (
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.image_url AS public_url,
    'primary'::text AS media_kind,
    1::integer AS media_position
  FROM public.products p
  WHERE p.is_published = true
    AND NULLIF(btrim(p.image_url), '') IS NOT NULL

  UNION ALL

  SELECT
    p.id AS product_id,
    p.name AS product_name,
    gallery_item.public_url,
    'gallery'::text AS media_kind,
    gallery_item.position::integer AS media_position
  FROM public.products p
  CROSS JOIN LATERAL unnest(p.gallery) WITH ORDINALITY AS gallery_item(public_url, position)
  WHERE p.is_published = true
    AND NULLIF(btrim(gallery_item.public_url), '') IS NOT NULL
),
deduplicated AS (
  SELECT DISTINCT ON (public_url)
    product_id,
    product_name,
    btrim(public_url) AS public_url,
    media_kind,
    media_position
  FROM product_media
  ORDER BY public_url, CASE WHEN media_kind = 'primary' THEN 0 ELSE 1 END, media_position
)
INSERT INTO public.media_assets (
  bucket,
  object_path,
  public_url,
  file_name,
  mime_type,
  size_bytes,
  title,
  alt_text,
  tags,
  usage_notes,
  status,
  verification_status,
  social_approved
)
SELECT
  'site-media',
  format('external-products/%s/%s', product_id, md5(public_url)),
  public_url,
  format('%s-%s-%s',
    regexp_replace(lower(product_name), '[^a-z0-9]+', '-', 'g'),
    media_kind,
    media_position
  ),
  CASE
    WHEN lower(public_url) ~ '\.png([?#].*)?$' THEN 'image/png'
    WHEN lower(public_url) ~ '\.webp([?#].*)?$' THEN 'image/webp'
    WHEN lower(public_url) ~ '\.gif([?#].*)?$' THEN 'image/gif'
    ELSE 'image/jpeg'
  END,
  0,
  format('%s — %s image %s', product_name, media_kind, media_position),
  format('%s product image', product_name),
  ARRAY[
    'product-source',
    'product:' || product_id::text,
    'kind:' || media_kind,
    'position:' || media_position::text,
    'import:published-catalog'
  ],
  'Imported from the published product catalogue. Verify product fidelity, dimensions and brand suitability before social approval.',
  'active',
  'pending',
  false
FROM deduplicated
ON CONFLICT (object_path) DO UPDATE SET
  public_url = EXCLUDED.public_url,
  title = EXCLUDED.title,
  alt_text = EXCLUDED.alt_text,
  tags = EXCLUDED.tags,
  usage_notes = EXCLUDED.usage_notes,
  updated_at = now();

COMMENT ON TABLE public.media_assets IS
  'Owner-reviewed media library. Published-product imports remain pending until manually verified and social-approved.';
