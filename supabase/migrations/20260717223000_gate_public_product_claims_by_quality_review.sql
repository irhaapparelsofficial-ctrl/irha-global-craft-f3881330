-- Public catalogue truth gate.
-- Exact product specifications remain editable in Admin, but buyer-facing output
-- exposes them only after the product quality workflow reaches verified status.

begin;

create or replace function public.catalog_get_public_release()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
with category_rows as (
  select
    c.*,
    parent.slug as parent_slug,
    coalesce(parent.is_published, true) as parent_is_published
  from public.categories c
  left join public.categories parent on parent.id = c.parent_id
),
published_categories as (
  select coalesce(jsonb_agg(
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
    ) order by coalesce(c.parent_id, c.id), c.sort_order, c.name
  ), '[]'::jsonb) as value
  from category_rows c
  where c.is_published and c.parent_is_published
),
published_products as (
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'category_id', p.category_id,
      'category_slug', c.slug,
      'parent_slug', c.parent_slug,
      'slug', p.slug,
      'name', p.name,
      'description', case
        when q.status = 'verified' then p.description
        else concat(
          p.name,
          ' is available for wholesale, OEM, ODM and private-label development. ',
          'Materials, construction, branding, packaging, sampling, quantity and production timing are confirmed after buyer and factory review.'
        )
      end,
      'image_url', p.image_url,
      'gallery', to_jsonb(p.gallery),
      'specs', to_jsonb(case
        when q.status = 'verified' then p.specs
        else array[
          'Wholesale, OEM, ODM and private-label development',
          'Material, construction and decoration confirmed against the approved buyer specification',
          'Sizing, labels, packaging, quantity and timing confirmed before quotation or production commitment'
        ]::text[]
      end),
      'details', case when q.status = 'verified' then p.details else '[]'::jsonb end,
      'material_specifications', case when q.status = 'verified' then p.material_specifications else null end,
      'seo_title', p.seo_title,
      'seo_description', case
        when q.status = 'verified' then p.seo_description
        else concat(
          p.name,
          ' manufacturer for wholesale, OEM, ODM and private-label buyer programs. ',
          'Specifications are confirmed after requirement review.'
        )
      end,
      'sort_order', p.sort_order,
      'is_published', true,
      'sku', p.sku,
      'is_featured', p.is_featured,
      'short_description', case
        when q.status = 'verified' then p.short_description
        else 'Custom B2B manufacturing program developed against the buyer-approved specification.'
      end,
      'sample_available', case when q.status = 'verified' then p.sample_available else null end,
      'country_of_origin', case when q.status = 'verified' then p.country_of_origin else null end,
      'primary_material', case when q.status = 'verified' then p.primary_material else null end,
      'fabric_composition', case when q.status = 'verified' then p.fabric_composition else null end,
      'gsm', case when q.status = 'verified' then p.gsm else null end,
      'available_sizes', to_jsonb(case when q.status = 'verified' then p.available_sizes else '{}'::text[] end),
      'size_notes', case when q.status = 'verified' then p.size_notes else null end,
      'available_colors', to_jsonb(case when q.status = 'verified' then p.available_colors else '{}'::text[] end),
      'custom_colors', case when q.status = 'verified' then p.custom_colors else null end,
      'customization', case when q.status = 'verified' then p.customization else '{}'::jsonb end,
      'packaging_standard', case when q.status = 'verified' then p.packaging_standard else null end,
      'packaging_custom', case when q.status = 'verified' then p.packaging_custom else null end,
      'related_product_ids', to_jsonb(p.related_product_ids),
      'claim_verification_status', coalesce(q.status, 'pending'),
      'claims_verified_at', case when q.status = 'verified' then q.verified_at else null end,
      'updated_at', greatest(p.updated_at, coalesce(q.updated_at, p.updated_at))
    ) order by c.slug, p.sort_order, p.name
  ), '[]'::jsonb) as value
  from public.products p
  join category_rows c on c.id = p.category_id
  left join public.product_quality_reviews q on q.product_id = p.id
  where p.is_published and c.is_published and c.parent_is_published
),
hidden_categories as (
  select coalesce(jsonb_agg(c.slug order by c.slug), '[]'::jsonb) as value
  from category_rows c
  where not c.is_published or not c.parent_is_published
),
hidden_products as (
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'category_slug', c.slug,
      'parent_slug', c.parent_slug,
      'product_slug', p.slug
    ) order by c.slug, p.slug
  ), '[]'::jsonb) as value
  from public.products p
  join category_rows c on c.id = p.category_id
  where not p.is_published or not c.is_published or not c.parent_is_published
),
release_clock as (
  select greatest(
    coalesce((select max(updated_at) from public.categories), 'epoch'::timestamptz),
    coalesce((select max(updated_at) from public.products), 'epoch'::timestamptz),
    coalesce((select max(updated_at) from public.product_quality_reviews), 'epoch'::timestamptz)
  ) as value
)
select jsonb_build_object(
  'categories', published_categories.value,
  'products', published_products.value,
  'hiddenCategorySlugs', hidden_categories.value,
  'hiddenProducts', hidden_products.value,
  'releasedAt', release_clock.value
)
from published_categories, published_products, hidden_categories, hidden_products, release_clock;
$$;

revoke all on function public.catalog_get_public_release() from public;
grant execute on function public.catalog_get_public_release() to anon, authenticated;

comment on function public.catalog_get_public_release() is
  'Buyer-facing catalogue projection. Exact product claims are exposed only after product_quality_reviews.status is verified.';

commit;
