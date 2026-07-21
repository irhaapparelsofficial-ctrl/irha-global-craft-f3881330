-- Public read APIs expose only approved homepage media and published sitemap rows.
-- Private media tables, source IDs and storage controls remain inaccessible to anon users.

create or replace function public.get_public_homepage_media()
returns table(role text, public_url text, alt_text text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.role,
    coalesce(nullif(m.ai_master_url,''), nullif(m.public_url,''), nullif(m.thumbnail_url,'')) as public_url,
    m.alt_text
  from public.site_media_placements p
  join public.media_assets m on m.id = p.media_asset_id
  where p.page_type = 'home'
    and p.page_slug = '/'
    and p.active
    and m.status = 'active'
    and m.verification_status = 'verified'
    and coalesce(nullif(m.ai_master_url,''), nullif(m.public_url,''), nullif(m.thumbnail_url,'')) is not null
  order by p.sort_order, p.role;
$$;

revoke all on function public.get_public_homepage_media() from public;
grant execute on function public.get_public_homepage_media() to anon, authenticated, service_role;

create or replace function public.get_public_sitemap_entries()
returns table(path text, image_url text, lastmod timestamptz, entry_kind text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.canonical_path as path,
    p.image_url,
    p.updated_at as lastmod,
    'product'::text as entry_kind
  from public.products p
  where p.source_drive_folder_id is not null
    and p.is_published
    and p.publish_state = 'published'
    and p.canonical_path like '/products/%'
    and nullif(trim(p.image_url),'') is not null

  union all

  select
    l.path,
    p.image_url,
    l.updated_at as lastmod,
    'localized_product'::text as entry_kind
  from public.seo_localized_pages l
  join public.products p on p.canonical_path = l.base_route
  where l.status = 'published'
    and not l.noindex
    and l.path like '/intl/%'
    and p.source_drive_folder_id is not null
    and p.is_published
    and p.publish_state = 'published'

  union all

  select
    '/products/' || n.full_slug_path as path,
    n.image_url,
    n.updated_at as lastmod,
    'taxonomy'::text as entry_kind
  from public.catalog_taxonomy_nodes n
  where n.publish_state = 'published'
    and nullif(trim(n.full_slug_path),'') is not null;
$$;

revoke all on function public.get_public_sitemap_entries() from public;
grant execute on function public.get_public_sitemap_entries() to anon, authenticated, service_role;
