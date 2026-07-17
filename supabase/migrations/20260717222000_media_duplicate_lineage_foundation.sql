-- Exact-media duplicate lineage without deletion.
-- Preserve both storage objects and database rows, link the reviewed duplicate to
-- its canonical asset, record replacement history and block destructive cleanup
-- until a separate owner-approved migration explicitly releases the lock.

begin;

alter table public.media_assets
  add column if not exists duplicate_of uuid references public.media_assets(id) on delete restrict,
  add column if not exists duplicate_kind text,
  add column if not exists duplicate_status text not null default 'unique',
  add column if not exists replacement_history jsonb not null default '[]'::jsonb;

alter table public.media_assets
  drop constraint if exists media_assets_duplicate_kind_check,
  add constraint media_assets_duplicate_kind_check
    check (duplicate_kind is null or duplicate_kind in ('exact', 'near_visual')),
  drop constraint if exists media_assets_duplicate_status_check,
  add constraint media_assets_duplicate_status_check
    check (duplicate_status in ('unique', 'review', 'canonical', 'confirmed_duplicate')),
  drop constraint if exists media_assets_replacement_history_array_check,
  add constraint media_assets_replacement_history_array_check
    check (jsonb_typeof(replacement_history) = 'array');

create index if not exists media_assets_duplicate_of_idx
  on public.media_assets (duplicate_of)
  where duplicate_of is not null;
create index if not exists media_assets_duplicate_status_idx
  on public.media_assets (duplicate_status, updated_at desc)
  where duplicate_status <> 'unique';

create or replace function public.media_assets_validate_duplicate_lineage()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  canonical_row public.media_assets%rowtype;
begin
  if jsonb_typeof(new.replacement_history) <> 'array' then
    raise exception 'media replacement history must be a JSON array';
  end if;

  if tg_op = 'UPDATE'
     and jsonb_array_length(new.replacement_history) < jsonb_array_length(old.replacement_history) then
    raise exception 'media replacement history is append-only';
  end if;

  if new.duplicate_of is null then
    if new.duplicate_kind is not null then
      raise exception 'duplicate_kind requires duplicate_of';
    end if;
    if new.duplicate_status = 'confirmed_duplicate' then
      raise exception 'confirmed_duplicate requires duplicate_of';
    end if;
    if new.duplicate_status = 'canonical' and new.checksum_sha256 is null then
      raise exception 'canonical duplicate assets require a checksum';
    end if;
    return new;
  end if;

  if new.duplicate_of = new.id then
    raise exception 'a media asset cannot duplicate itself';
  end if;

  select * into canonical_row
  from public.media_assets
  where id = new.duplicate_of;

  if not found then
    raise exception 'canonical media asset was not found';
  end if;
  if canonical_row.duplicate_of is not null then
    raise exception 'duplicate chains are not allowed; link directly to the canonical asset';
  end if;
  if new.duplicate_kind is null then
    raise exception 'duplicate_kind is required when duplicate_of is set';
  end if;
  if new.duplicate_status not in ('review', 'confirmed_duplicate') then
    raise exception 'linked duplicate assets must remain review or confirmed_duplicate';
  end if;
  if new.duplicate_kind = 'exact'
     and (
       new.checksum_sha256 is null
       or canonical_row.checksum_sha256 is null
       or new.checksum_sha256 <> canonical_row.checksum_sha256
     ) then
    raise exception 'exact duplicate assets must share the canonical SHA-256 checksum';
  end if;

  return new;
end;
$$;

create or replace function public.media_assets_block_locked_duplicate_delete()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.duplicate_status in ('canonical', 'confirmed_duplicate') then
    raise exception 'locked duplicate lineage cannot be deleted; use a separate owner-approved cleanup migration with replacement evidence';
  end if;
  return old;
end;
$$;

drop trigger if exists media_assets_duplicate_lineage_validate on public.media_assets;
create trigger media_assets_duplicate_lineage_validate
before insert or update of duplicate_of, duplicate_kind, duplicate_status, replacement_history, checksum_sha256
on public.media_assets
for each row execute function public.media_assets_validate_duplicate_lineage();

drop trigger if exists media_assets_locked_duplicate_delete on public.media_assets;
create trigger media_assets_locked_duplicate_delete
before delete on public.media_assets
for each row execute function public.media_assets_block_locked_duplicate_delete();

comment on column public.media_assets.duplicate_of is
  'Canonical media asset for an exact or near-visual duplicate. Direct links only; chains are rejected.';
comment on column public.media_assets.duplicate_kind is
  'Owner-reviewed duplicate classification: exact or near_visual.';
comment on column public.media_assets.duplicate_status is
  'unique, review, canonical or confirmed_duplicate. Canonical and confirmed duplicate rows are deletion-locked.';
comment on column public.media_assets.replacement_history is
  'Append-only evidence for duplicate linkage, safe replacement and any future owner-approved cleanup.';

-- Reviewed 2026-07-17 exact duplicate group.
do $$
declare
  canonical_id constant uuid := 'b4c6f3d0-f50c-45c3-9446-3752e4b4800c'::uuid;
  duplicate_id constant uuid := '06bd5d3d-d7ec-4d8b-ac71-5d080e9c00ce'::uuid;
  expected_checksum constant text := '329b168f762b26aac6a426809fef57987aa58eedab66972437d809dd4dc1940b';
  event_key constant text := 'exact-duplicate-leather-wallet-20260717';
  canonical_row public.media_assets%rowtype;
  duplicate_row public.media_assets%rowtype;
begin
  select * into canonical_row from public.media_assets where id = canonical_id;
  select * into duplicate_row from public.media_assets where id = duplicate_id;

  if canonical_row.id is null or duplicate_row.id is null then
    raise exception 'reviewed media duplicate records were not found';
  end if;
  if canonical_row.checksum_sha256 <> expected_checksum
     or duplicate_row.checksum_sha256 <> expected_checksum then
    raise exception 'reviewed media duplicate checksum changed; manual re-review is required';
  end if;
  if canonical_row.bucket <> 'site-media'
     or duplicate_row.bucket <> 'site-media'
     or canonical_row.status <> 'active'
     or duplicate_row.status <> 'active'
     or canonical_row.verification_status <> 'verified'
     or duplicate_row.verification_status <> 'verified' then
    raise exception 'reviewed media duplicate identity or verification state changed; manual re-review is required';
  end if;

  if exists (
    select 1 from public.products p
    where p.image_url = duplicate_row.public_url
       or duplicate_row.public_url = any(coalesce(p.gallery, '{}'::text[]))
  ) or exists (
    select 1 from public.categories c where c.image_url = duplicate_row.public_url
  ) or exists (
    select 1 from public.social_calendar_items s where s.source_media_asset_id = duplicate_id
  ) or exists (
    select 1 from public.social_render_job_items s where s.media_asset_id = duplicate_id
  ) or exists (
    select 1 from public.social_render_jobs s where s.output_asset_id = duplicate_id
  ) then
    raise exception 'reviewed duplicate acquired a live reference; lineage must be re-audited before linking';
  end if;

  if not exists (
    select 1 from public.products p
    where p.image_url = canonical_row.public_url
       or canonical_row.public_url = any(coalesce(p.gallery, '{}'::text[]))
  ) then
    raise exception 'canonical leather-wallet asset is no longer used by the reviewed live product';
  end if;

  update public.media_assets
  set duplicate_status = 'canonical',
      duplicate_of = null,
      duplicate_kind = null,
      replacement_history = case
        when replacement_history @> jsonb_build_array(jsonb_build_object('event_key', event_key))
          then replacement_history
        else replacement_history || jsonb_build_array(jsonb_build_object(
          'event_key', event_key,
          'action', 'canonical_confirmed',
          'related_asset_id', duplicate_id,
          'checksum_sha256', expected_checksum,
          'source', 'verified_read_only_audit_20260717',
          'recorded_at', now()
        ))
      end,
      updated_at = now()
  where id = canonical_id;

  update public.media_assets
  set duplicate_of = canonical_id,
      duplicate_kind = 'exact',
      duplicate_status = 'confirmed_duplicate',
      social_approved = false,
      replacement_history = case
        when replacement_history @> jsonb_build_array(jsonb_build_object('event_key', event_key))
          then replacement_history
        else replacement_history || jsonb_build_array(jsonb_build_object(
          'event_key', event_key,
          'action', 'exact_duplicate_linked',
          'canonical_asset_id', canonical_id,
          'checksum_sha256', expected_checksum,
          'source', 'verified_read_only_audit_20260717',
          'storage_deleted', false,
          'database_row_deleted', false,
          'recorded_at', now()
        ))
      end,
      updated_at = now()
  where id = duplicate_id;

  if not exists (
    select 1
    from public.media_assets duplicate
    join public.media_assets canonical on canonical.id = duplicate.duplicate_of
    where duplicate.id = duplicate_id
      and duplicate.duplicate_kind = 'exact'
      and duplicate.duplicate_status = 'confirmed_duplicate'
      and duplicate.social_approved = false
      and canonical.id = canonical_id
      and canonical.duplicate_status = 'canonical'
      and duplicate.checksum_sha256 = canonical.checksum_sha256
      and jsonb_array_length(duplicate.replacement_history) >= 1
      and jsonb_array_length(canonical.replacement_history) >= 1
  ) then
    raise exception 'exact duplicate lineage verification failed';
  end if;
end
$$;

commit;
