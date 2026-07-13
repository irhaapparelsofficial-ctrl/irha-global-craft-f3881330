-- Add durable thumbnail metadata for Media Library images.
-- Originals remain authoritative and are never replaced by this migration.

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS thumbnail_bucket text,
  ADD COLUMN IF NOT EXISTS thumbnail_object_path text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_width_px integer,
  ADD COLUMN IF NOT EXISTS thumbnail_height_px integer,
  ADD COLUMN IF NOT EXISTS thumbnail_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS thumbnail_generated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'media_assets_thumbnail_dimensions_check'
      AND conrelid = 'public.media_assets'::regclass
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_thumbnail_dimensions_check
      CHECK (
        (thumbnail_width_px IS NULL OR thumbnail_width_px > 0)
        AND (thumbnail_height_px IS NULL OR thumbnail_height_px > 0)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'media_assets_thumbnail_size_check'
      AND conrelid = 'public.media_assets'::regclass
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_thumbnail_size_check
      CHECK (thumbnail_size_bytes IS NULL OR thumbnail_size_bytes >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'media_assets_thumbnail_fields_together_check'
      AND conrelid = 'public.media_assets'::regclass
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_thumbnail_fields_together_check
      CHECK (
        (thumbnail_object_path IS NULL AND thumbnail_url IS NULL)
        OR (thumbnail_object_path IS NOT NULL AND thumbnail_url IS NOT NULL)
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS media_assets_thumbnail_object_unique_idx
  ON public.media_assets (thumbnail_bucket, thumbnail_object_path)
  WHERE thumbnail_object_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS media_assets_missing_thumbnail_idx
  ON public.media_assets (created_at DESC)
  WHERE mime_type LIKE 'image/%' AND thumbnail_url IS NULL;

COMMENT ON COLUMN public.media_assets.thumbnail_bucket IS
  'Storage bucket containing the optimized website thumbnail; normally site-media.';
COMMENT ON COLUMN public.media_assets.thumbnail_object_path IS
  'Deterministic thumbnail object path: thumbnails/<original_object_path>.webp.';
COMMENT ON COLUMN public.media_assets.thumbnail_url IS
  'Public URL for cards, listings, admin previews and other small image surfaces.';
COMMENT ON COLUMN public.media_assets.thumbnail_generated_at IS
  'Timestamp when the current thumbnail was generated from the original asset.';
