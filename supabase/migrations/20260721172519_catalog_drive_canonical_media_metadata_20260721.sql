-- Keep immutable source metadata separate from canonical public WebP metadata.
alter table public.catalog_drive_files
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists width_px integer,
  add column if not exists height_px integer;

alter table public.catalog_drive_files
  drop constraint if exists catalog_drive_files_canonical_mime_type_check,
  drop constraint if exists catalog_drive_files_canonical_size_check,
  drop constraint if exists catalog_drive_files_canonical_dimensions_check;

alter table public.catalog_drive_files
  add constraint catalog_drive_files_canonical_mime_type_check
    check (mime_type is null or mime_type in ('image/jpeg','image/png','image/webp')),
  add constraint catalog_drive_files_canonical_size_check
    check (size_bytes is null or (size_bytes > 0 and size_bytes <= 26214400)),
  add constraint catalog_drive_files_canonical_dimensions_check
    check ((width_px is null and height_px is null) or (width_px >= 100 and height_px >= 100));

comment on column public.catalog_drive_files.mime_type is
  'Canonical public derivative MIME type; source MIME remains in source_mime_type.';
comment on column public.catalog_drive_files.size_bytes is
  'Canonical public derivative size; source bytes remain in source_size_bytes.';
comment on column public.catalog_drive_files.width_px is
  'Canonical public derivative width.';
comment on column public.catalog_drive_files.height_px is
  'Canonical public derivative height.';
