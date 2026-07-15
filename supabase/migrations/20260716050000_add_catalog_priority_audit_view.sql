-- Live, read-only priority queue for product media and buyer-data remediation.
-- This view does not change public products. It exposes objective issues for admin review.

begin;

create or replace view public.catalog_priority_audit
with (security_invoker = on)
as
with product_audit as (
  select
    p.id as product_id,
    p.name,
    p.slug,
    p.category_id,
    c.name as subcategory_name,
    coalesce(parent.name, c.name) as top_category_name,
    p.is_published,
    p.image_url,
    coalesce(cardinality(p.gallery), 0)::int as gallery_count,
    coalesce((
      select count(distinct gallery_url)
      from unnest(coalesce(p.gallery, '{}'::text[])) as gallery_url
      where gallery_url is not null and btrim(gallery_url) <> ''
    ), 0)::int as distinct_gallery_count,
    (
      select min(least(m.width_px, m.height_px))
      from unnest(coalesce(p.gallery, '{}'::text[])) as gallery_url
      join public.media_assets m on m.public_url = gallery_url
      where m.width_px is not null and m.height_px is not null
    )::int as minimum_short_edge_px,
    (p.name ilike '%Reference Style%') as is_reference_style,
    coalesce(r.status, 'pending') as review_status,
    r.reviewer_notes,
    array_remove(array[
      case when coalesce(cardinality(p.gallery), 0) < 4 then 'gallery_under_4' end,
      case when coalesce((
        select min(least(m.width_px, m.height_px))
        from unnest(coalesce(p.gallery, '{}'::text[])) as gallery_url
        join public.media_assets m on m.public_url = gallery_url
        where m.width_px is not null and m.height_px is not null
      ), 0) < 800 then 'image_resolution_under_800' end,
      case when coalesce((
        select min(least(m.width_px, m.height_px))
        from unnest(coalesce(p.gallery, '{}'::text[])) as gallery_url
        join public.media_assets m on m.public_url = gallery_url
        where m.width_px is not null and m.height_px is not null
      ), 0) between 800 and 1199 then 'image_resolution_under_1200' end,
      case when p.name ilike '%Reference Style%' then 'reference_style_identity_review' end,
      case when coalesce(nullif(btrim(p.material_specifications), ''), null) is null then 'material_specifications' end,
      case when coalesce(nullif(btrim(p.primary_material), ''), null) is null then 'primary_material' end,
      case when coalesce(nullif(btrim(p.fabric_composition), ''), null) is null then 'fabric_composition' end,
      case when coalesce(nullif(btrim(p.moq_display), ''), null) is null then 'moq_display' end,
      case when p.sample_available is null then 'sample_available' end,
      case when coalesce(nullif(btrim(p.sample_timeline), ''), null) is null then 'sample_timeline' end,
      case when coalesce(nullif(btrim(p.production_timeline), ''), null) is null then 'production_timeline' end,
      case when coalesce(nullif(btrim(p.country_of_origin), ''), null) is null then 'country_of_origin' end,
      case when coalesce(cardinality(p.available_sizes), 0) = 0 then 'available_sizes' end,
      case when coalesce(cardinality(p.available_colors), 0) = 0 then 'available_colors' end,
      case when coalesce(nullif(btrim(p.packaging_standard), ''), null) is null then 'packaging_standard' end
    ], null)::text[] as issue_codes
  from public.products p
  join public.categories c on c.id = p.category_id
  left join public.categories parent on parent.id = c.parent_id
  left join public.product_quality_reviews r on r.product_id = p.id
)
select
  product_id,
  name,
  slug,
  category_id,
  subcategory_name,
  top_category_name,
  is_published,
  image_url,
  gallery_count,
  distinct_gallery_count,
  minimum_short_edge_px,
  is_reference_style,
  review_status,
  reviewer_notes,
  issue_codes,
  cardinality(issue_codes)::int as issue_count,
  case
    when gallery_count < 4 then 'P0'
    when is_reference_style or coalesce(minimum_short_edge_px, 0) < 800 then 'P1'
    when coalesce(minimum_short_edge_px, 0) < 1200 then 'P2'
    else 'P3'
  end as priority
from product_audit;

revoke all on table public.catalog_priority_audit from anon;
grant select on table public.catalog_priority_audit to authenticated;
grant select on table public.catalog_priority_audit to service_role;

commit;
