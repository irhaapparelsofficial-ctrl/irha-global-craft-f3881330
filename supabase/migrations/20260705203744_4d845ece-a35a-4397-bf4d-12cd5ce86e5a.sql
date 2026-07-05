
-- Phase 5: Product Operating System — schema expansion + truth sanitization
-- All new columns are nullable/safe; existing rows preserved.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS moq_display text,
  ADD COLUMN IF NOT EXISTS moq_min integer,
  ADD COLUMN IF NOT EXISTS sample_available boolean,
  ADD COLUMN IF NOT EXISTS sample_timeline text,
  ADD COLUMN IF NOT EXISTS production_timeline text,
  ADD COLUMN IF NOT EXISTS country_of_origin text,
  ADD COLUMN IF NOT EXISTS primary_material text,
  ADD COLUMN IF NOT EXISTS fabric_composition text,
  ADD COLUMN IF NOT EXISTS gsm text,
  ADD COLUMN IF NOT EXISTS available_sizes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS size_notes text,
  ADD COLUMN IF NOT EXISTS available_colors text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_colors boolean,
  ADD COLUMN IF NOT EXISTS customization jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS packaging_standard text,
  ADD COLUMN IF NOT EXISTS packaging_custom boolean,
  ADD COLUMN IF NOT EXISTS related_product_ids uuid[] NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON public.products (lower(sku)) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS products_is_featured_idx ON public.products (is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS products_category_pub_idx ON public.products (category_id, is_published);

-- Backfill: derive moq_display / production_timeline / primary_material where reliably present in details
UPDATE public.products p
SET moq_display = COALESCE(p.moq_display, sub.moq_value)
FROM (
  SELECT id, (d->>'value')::text AS moq_value
  FROM public.products, LATERAL jsonb_array_elements(details) AS d
  WHERE d->>'label' ILIKE 'moq'
) sub
WHERE sub.id = p.id AND p.moq_display IS NULL;

UPDATE public.products p
SET production_timeline = COALESCE(p.production_timeline, sub.lt_value)
FROM (
  SELECT id, (d->>'value')::text AS lt_value
  FROM public.products, LATERAL jsonb_array_elements(details) AS d
  WHERE d->>'label' ILIKE 'lead time'
) sub
WHERE sub.id = p.id AND p.production_timeline IS NULL;

UPDATE public.products p
SET primary_material = COALESCE(p.primary_material, sub.mat_value)
FROM (
  SELECT id, (d->>'value')::text AS mat_value
  FROM public.products, LATERAL jsonb_array_elements(details) AS d
  WHERE d->>'label' ILIKE 'fabric' OR d->>'label' ILIKE 'material'
) sub
WHERE sub.id = p.id AND p.primary_material IS NULL;

-- Truth sanitization: strip certification-only remnants from specs & details.
-- Certification claims live on the Compliance page; product specs must be factual.
UPDATE public.products
SET specs = ARRAY(
  SELECT s FROM unnest(specs) AS s
  WHERE s !~* '(oeko[- ]?tex|bsci|sedex|gots|reach)'
);

UPDATE public.products
SET details = (
  SELECT COALESCE(jsonb_agg(d), '[]'::jsonb)
  FROM jsonb_array_elements(details) AS d
  WHERE lower(d->>'label') <> 'certifications'
    AND (d->>'value') !~* '(oeko[- ]?tex|bsci|sedex|gots|reach compliant)'
);
