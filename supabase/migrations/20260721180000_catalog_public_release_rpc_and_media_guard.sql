-- Public read APIs expose only approved catalogue data. Private media/source tables remain hidden.
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

-- Restore the normal verification contract after the one-time Drive dimension backfill.
create or replace function public.media_assets_before_write()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  service_call boolean := coalesce(auth.role() = 'service_role', false);
  verification_changed boolean := false;
begin
  if not service_call and (auth.uid() is null or not public.has_role(auth.uid(), 'admin')) then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    verification_changed :=
      old.verification_status is distinct from new.verification_status or
      old.width_px is distinct from new.width_px or
      old.height_px is distinct from new.height_px or
      old.duration_ms is distinct from new.duration_ms or
      old.checksum_sha256 is distinct from new.checksum_sha256;
    if verification_changed and not service_call then
      raise exception 'media verification fields are renderer/service controlled' using errcode = '42501';
    end if;
  elsif not service_call and new.verification_status <> 'pending' then
    raise exception 'new admin uploads must start pending verification' using errcode = '42501';
  end if;

  if new.verification_status not in ('pending','verified','rejected') then
    raise exception 'invalid media verification status';
  end if;

  if new.verification_status = 'verified' then
    if new.width_px is null or new.width_px < 100 or new.height_px is null or new.height_px < 100 then
      raise exception 'verified media requires valid dimensions';
    end if;
    if new.checksum_sha256 is null or new.checksum_sha256 !~ '^[A-Fa-f0-9]{64}$' then
      raise exception 'verified media requires SHA-256 checksum';
    end if;
    if new.mime_type !~ '^(image|video)/' then
      raise exception 'only image or video media can be verified for social use';
    end if;
    if new.mime_type ~ '^video/' and (new.duration_ms is null or new.duration_ms <= 0) then
      raise exception 'verified video requires duration';
    end if;
  end if;

  if new.social_approved then
    if new.status <> 'active' or new.verification_status <> 'verified' then
      raise exception 'only active verified media can be approved for social use';
    end if;
    if tg_op = 'INSERT' or not coalesce(old.social_approved, false) then
      new.social_approved_at := now();
      new.social_approved_by := coalesce(auth.uid(), new.social_approved_by);
    end if;
  else
    new.social_approved_at := null;
    new.social_approved_by := null;
  end if;

  new.updated_at := now();
  if not service_call then
    new.updated_by := auth.uid();
    if tg_op = 'INSERT' then
      new.created_by := coalesce(new.created_by, auth.uid());
    end if;
  end if;
  return new;
end;
$$;
