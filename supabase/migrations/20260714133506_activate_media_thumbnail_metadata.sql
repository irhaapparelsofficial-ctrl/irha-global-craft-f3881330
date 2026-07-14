-- Persist optimized media thumbnail metadata used by the owner Admin Media Library.
-- Originals remain authoritative; thumbnails are derived previews only.

alter table public.media_assets
  add column if not exists thumbnail_bucket text,
  add column if not exists thumbnail_object_path text,
  add column if not exists thumbnail_url text,
  add column if not exists thumbnail_width_px integer,
  add column if not exists thumbnail_height_px integer,
  add column if not exists thumbnail_size_bytes bigint,
  add column if not exists thumbnail_generated_at timestamptz;

alter table public.media_assets
  drop constraint if exists media_assets_thumbnail_dimensions_check;

alter table public.media_assets
  add constraint media_assets_thumbnail_dimensions_check
  check (
    (thumbnail_width_px is null or thumbnail_width_px > 0)
    and (thumbnail_height_px is null or thumbnail_height_px > 0)
    and (thumbnail_size_bytes is null or thumbnail_size_bytes >= 0)
  );

create index if not exists media_assets_missing_thumbnail_idx
  on public.media_assets (created_at)
  where status = 'active'
    and mime_type like 'image/%'
    and thumbnail_url is null;

comment on column public.media_assets.thumbnail_url is
  'Public URL of the optimized admin/social preview thumbnail; original media remains authoritative.';
