-- Buyer-ready canonical route manifest for the public catalogue.
-- Only approved, published Drive products with a published three-level taxonomy path are exposed.

create or replace function public.get_public_catalog_route_manifest()
returns table(
  product_id uuid,
  reference_code text,
  product_slug text,
  product_name text,
  canonical_path text,
  main_category_slug text,
  main_category_name text,
  audience_slug text,
  audience_name text,
  product_type_slug text,
  product_type_name text,
  seo_title text,
  seo_description text,
  seo_h1 text,
  short_description text,
  product_description text,
  image_url text,
  gallery text[],
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.id as product_id,
    p.reference_code,
    p.slug as product_slug,
    p.name as product_name,
    p.canonical_path,
    root.slug as main_category_slug,
    root.name as main_category_name,
    audience.slug as audience_slug,
    audience.name as audience_name,
    leaf.slug as product_type_slug,
    leaf.name as product_type_name,
    p.seo_title,
    p.seo_description,
    p.seo_h1,
    p.short_description,
    p.description as product_description,
    p.image_url,
    p.gallery,
    greatest(p.updated_at, a.updated_at, leaf.updated_at, audience.updated_at, root.updated_at) as updated_at
  from public.products p
  join public.product_taxonomy_assignments a
    on a.product_id = p.id
   and a.review_state = 'approved'
  join public.catalog_taxonomy_nodes leaf
    on leaf.id = a.taxonomy_node_id
   and leaf.depth = 2
   and leaf.publish_state = 'published'
  join public.catalog_taxonomy_nodes audience
    on audience.id = leaf.parent_id
   and audience.depth = 1
   and audience.publish_state = 'published'
  join public.catalog_taxonomy_nodes root
    on root.id = audience.parent_id
   and root.depth = 0
   and root.publish_state = 'published'
  where p.source_drive_folder_id is not null
    and p.is_published
    and p.publish_state = 'published'
    and nullif(trim(p.image_url), '') is not null
    and nullif(trim(p.canonical_path), '') is not null
    and p.canonical_path = '/products/' || leaf.full_slug_path || '/' || p.slug
  order by p.reference_code, p.slug;
$$;

revoke all on function public.get_public_catalog_route_manifest() from public;
grant execute on function public.get_public_catalog_route_manifest() to anon, authenticated, service_role;
