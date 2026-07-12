-- Phase 2 / Batch 2.2: audited catalog release control.
-- Existing admin CRUD remains the write surface; this migration adds durable audit,
-- safe relational deletion rules and one public release RPC used by the website.

CREATE TABLE IF NOT EXISTS public.catalog_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('category', 'product')),
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  before_data jsonb,
  after_data jsonb,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS catalog_change_log_entity_idx
  ON public.catalog_change_log (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS catalog_change_log_created_idx
  ON public.catalog_change_log (created_at DESC);

ALTER TABLE public.catalog_change_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'catalog_change_log'
      AND policyname = 'catalog_change_log_admin_select'
  ) THEN
    CREATE POLICY catalog_change_log_admin_select
      ON public.catalog_change_log
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

REVOKE ALL ON TABLE public.catalog_change_log FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.catalog_change_log FROM authenticated;
GRANT SELECT ON TABLE public.catalog_change_log TO authenticated;

-- Prevent a category delete from silently cascading through subcategories/products.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_id_fkey;
ALTER TABLE public.products
  ADD CONSTRAINT products_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;

ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_parent_id_fkey;
ALTER TABLE public.categories
  ADD CONSTRAINT categories_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.catalog_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_categories_touch_updated_at ON public.categories;
CREATE TRIGGER trg_categories_touch_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.catalog_touch_updated_at();

DROP TRIGGER IF EXISTS trg_products_touch_updated_at ON public.products;
CREATE TRIGGER trg_products_touch_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.catalog_touch_updated_at();

CREATE OR REPLACE FUNCTION public.catalog_record_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _entity_type text;
  _entity_id uuid;
  _action text;
BEGIN
  _entity_type := CASE TG_TABLE_NAME WHEN 'categories' THEN 'category' ELSE 'product' END;
  _entity_id := COALESCE(NEW.id, OLD.id);
  _action := lower(TG_OP);

  INSERT INTO public.catalog_change_log (
    entity_type,
    entity_id,
    action,
    before_data,
    after_data,
    changed_by
  ) VALUES (
    _entity_type,
    _entity_id,
    _action,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_categories_catalog_change ON public.categories;
CREATE TRIGGER trg_categories_catalog_change
AFTER INSERT OR UPDATE OR DELETE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.catalog_record_change();

DROP TRIGGER IF EXISTS trg_products_catalog_change ON public.products;
CREATE TRIGGER trg_products_catalog_change
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.catalog_record_change();

CREATE OR REPLACE FUNCTION public.catalog_get_public_release()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.catalog_get_admin_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'categoryCount', (SELECT count(*) FROM public.categories),
    'publishedCategoryCount', (SELECT count(*) FROM public.categories WHERE is_published),
    'productCount', (SELECT count(*) FROM public.products),
    'publishedProductCount', (SELECT count(*) FROM public.products WHERE is_published),
    'productsMissingImage', (SELECT count(*) FROM public.products WHERE is_published AND COALESCE(image_url, '') = '' AND cardinality(gallery) = 0),
    'productsMissingDescription', (SELECT count(*) FROM public.products WHERE is_published AND COALESCE(description, '') = ''),
    'productsUnderHiddenCategory', (
      SELECT count(*)
      FROM public.products p
      JOIN public.categories c ON c.id = p.category_id
      LEFT JOIN public.categories parent ON parent.id = c.parent_id
      WHERE p.is_published AND (NOT c.is_published OR NOT COALESCE(parent.is_published, true))
    ),
    'categoriesWithoutParent', (
      SELECT count(*)
      FROM public.categories c
      WHERE c.parent_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.categories parent WHERE parent.id = c.parent_id)
    ),
    'lastCatalogChangeAt', (SELECT max(created_at) FROM public.catalog_change_log)
  ) INTO _result;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.catalog_get_public_release() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catalog_get_admin_health() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catalog_get_admin_health() FROM anon;
GRANT EXECUTE ON FUNCTION public.catalog_get_public_release() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.catalog_get_admin_health() TO authenticated;
