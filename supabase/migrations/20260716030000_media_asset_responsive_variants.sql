-- Non-destructive metadata for browser-generated responsive WebP variants.
-- Originals and existing thumbnail columns remain unchanged.

alter table public.media_assets
  add column if not exists responsive_widths integer[],
  add column if not exists responsive_format text,
  add column if not exists responsive_total_size_bytes bigint,
  add column if not exists responsive_generated_at timestamptz;

comment on column public.media_assets.responsive_widths is
  'Available optimized image widths in pixels. Current website contract: 360, 720 and 1200.';
comment on column public.media_assets.responsive_format is
  'MIME type shared by generated responsive variants, normally image/webp.';
comment on column public.media_assets.responsive_total_size_bytes is
  'Combined storage size of generated responsive variants.';
comment on column public.media_assets.responsive_generated_at is
  'Timestamp when the full responsive image set was successfully generated and uploaded.';

create index if not exists media_assets_responsive_backfill_idx
  on public.media_assets (created_at desc)
  where mime_type like 'image/%'
    and responsive_generated_at is null;
