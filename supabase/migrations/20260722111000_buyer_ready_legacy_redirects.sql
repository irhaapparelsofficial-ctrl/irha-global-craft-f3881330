-- Normalize approved legacy catalogue redirects to current buyer-ready product or taxonomy URLs.
-- The migration is idempotent and rejects any remaining approved dead product target.

with valid_paths as (
  select canonical_path as path
  from public.products
  where is_published and publish_state = 'published'
  union
  select '/products/' || full_slug_path
  from public.catalog_taxonomy_nodes
  where publish_state = 'published'
), candidates as (
  select r.id, p.canonical_path
  from public.legacy_route_redirects r
  join public.products p
    on p.slug = regexp_replace(r.to_path, '^.*/', '')
   and p.is_published
   and p.publish_state = 'published'
  where r.approved_at is not null
    and r.to_path like '/products/%'
    and r.to_path not in (select path from valid_paths)
)
update public.legacy_route_redirects r
set to_path = c.canonical_path,
    updated_at = now(),
    reason = trim(both ' |' from coalesce(r.reason, '') || ' | normalized to current canonical product')
from candidates c
where r.id = c.id;

with valid_paths as (
  select canonical_path as path
  from public.products
  where is_published and publish_state = 'published'
  union
  select '/products/' || full_slug_path
  from public.catalog_taxonomy_nodes
  where publish_state = 'published'
), candidates as (
  select r.id, p.canonical_path
  from public.legacy_route_redirects r
  join public.products p
    on p.slug = regexp_replace(r.from_path, '^.*/', '')
   and p.is_published
   and p.publish_state = 'published'
  where r.approved_at is not null
    and r.to_path like '/products/%'
    and r.to_path not in (select path from valid_paths)
)
update public.legacy_route_redirects r
set to_path = c.canonical_path,
    updated_at = now(),
    reason = trim(both ' |' from coalesce(r.reason, '') || ' | normalized from legacy product slug')
from candidates c
where r.id = c.id;

update public.legacy_route_redirects
set to_path = case
      when from_path like '/products/leisure-nightwear/%premium-polo-shirt'
        then '/products/leisure-nightwear/men/shirts-tops/mens-premium-polo-shirt'
      when from_path like '/products/streetwear-activewear/%premium-polo-shirt'
        then '/products/streetwear-activewear/unisex/tops/streetwear-premium-polo-shirt'
      when from_path like '%premium-leather-bag%'
        then '/products/premium-leather-apparel/accessories/bags'
      when from_path like '%athletic-onesie%'
        then '/products/sportswear/fitness-activewear/performance-activewear'
      when from_path like '%performance-gym-hoodie%'
        or from_path like '%zip-up-fleece-jacket%'
        then '/products/sportswear/training/training-wear'
      when from_path like '%streetwear-shorts%'
        then '/products/streetwear-activewear/unisex/bottoms'
      else to_path
    end,
    updated_at = now(),
    reason = trim(both ' |' from coalesce(reason, '') || ' | retired product mapped to current buyer-safe destination')
where approved_at is not null
  and (
    from_path like '/products/leisure-nightwear/%premium-polo-shirt'
    or from_path like '/products/streetwear-activewear/%premium-polo-shirt'
    or from_path like '%premium-leather-bag%'
    or from_path like '%athletic-onesie%'
    or from_path like '%performance-gym-hoodie%'
    or from_path like '%zip-up-fleece-jacket%'
    or from_path like '%streetwear-shorts%'
  );

do $$
declare
  stale_count integer;
begin
  with valid_paths(path) as (
    select canonical_path
    from public.products
    where is_published and publish_state = 'published'
    union
    select '/products/' || full_slug_path
    from public.catalog_taxonomy_nodes
    where publish_state = 'published'
  )
  select count(*)
  into stale_count
  from public.legacy_route_redirects r
  where r.approved_at is not null
    and r.to_path like '/products/%'
    and r.to_path not in (select path from valid_paths);

  if stale_count <> 0 then
    raise exception 'buyer-ready redirect normalization left % stale approved product targets', stale_count;
  end if;
end
$$;

create or replace function public.get_public_legacy_redirects()
returns table(from_path text, to_path text, updated_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with valid_paths(path) as (
    select canonical_path
    from public.products
    where is_published and publish_state = 'published'
    union
    select '/products/' || full_slug_path
    from public.catalog_taxonomy_nodes
    where publish_state = 'published'
    union values
      ('/'::text),
      ('/products'::text),
      ('/catalogue'::text),
      ('/resources'::text),
      ('/inquiry'::text),
      ('/contact'::text),
      ('/privacy-policy'::text),
      ('/terms-of-service'::text)
  )
  select r.from_path, r.to_path, r.updated_at
  from public.legacy_route_redirects r
  where r.approved_at is not null
    and r.from_path like '/%'
    and r.to_path like '/%'
    and r.from_path <> r.to_path
    and (
      r.to_path not like '/products/%'
      or r.to_path in (select path from valid_paths)
    )
  order by r.from_path;
$$;

revoke all on function public.get_public_legacy_redirects() from public;
grant execute on function public.get_public_legacy_redirects() to anon, authenticated, service_role;
