# Website Image Thumbnail System

## Purpose

Every website image now has a lightweight preview path for cards, grids, search results, shortlist/compare views, catalogue listings and Media Library previews. Full-resolution originals remain available for hero sections, product detail, zoom, SEO and social rendering.

## Committed website assets

`npm run generate:thumbnails` scans supported raster files under `public/` and creates deterministic WEBP previews under:

```text
public/thumbnails/<original-relative-path>.webp
```

Example:

```text
/product-media/lederhosen/01-front.webp
/thumbnails/product-media/lederhosen/01-front.webp.webp
```

The generator:

- runs automatically before development and production builds;
- creates a maximum 720 px WEBP preview without enlarging small images;
- processes files in small parallel batches;
- writes into a staging directory first;
- replaces the generated thumbnail tree only after the entire run succeeds;
- never edits or deletes an original image;
- writes a manifest with dimensions, byte sizes and SHA-256 hashes;
- fails the build instead of silently shipping an incomplete thumbnail set.

Generated files are build artifacts and are intentionally excluded from Git. Any newly committed public image is picked up automatically on the next development or production build.

Imported images under `src/assets` use Vite Image Tools to create equivalent optimized WEBP variants during the bundle build.

## Public website use

The shared thumbnail resolver and `ThumbnailImage` component use preview assets on small image surfaces and fall back safely to the original if a thumbnail is not available. Product/category normalization keeps both:

- `image` — thumbnail URL for cards and listings;
- `originalImage` — full-resolution URL for heroes and large presentation.

Product galleries retain original URLs. Their selector strips and related-product cards use thumbnails.

## Media Library uploads

A new image uploaded through Admin → Website Editor → Media Library follows this order:

1. generate a 720 px WEBP thumbnail in the browser;
2. upload the original;
3. upload the thumbnail to `site-media/thumbnails/<original_object_path>.webp`;
4. save original and thumbnail metadata;
5. roll back both storage objects if metadata persistence fails.

The upload remains backward-compatible before the new database migration is activated: the deterministic thumbnail object is still created, and the original Media Library row can still be saved using the legacy columns.

## Existing Media Library images

Use **Generate next thumbnails** in Media Library. It deliberately processes at most eight missing images per run so failures are isolated and retryable. Originals are downloaded read-only, thumbnails are uploaded with deterministic paths, and successful rows are updated individually.

## Backend activation

Apply the migration:

```text
supabase/migrations/20260714040000_media_asset_thumbnails.sql
```

It only adds nullable thumbnail metadata columns, validation constraints and indexes. It does not modify, replace or delete original media.

After activation:

1. open Media Library;
2. refresh;
3. run one eight-image thumbnail batch;
4. verify previews and metadata;
5. continue in small batches until the missing count reaches zero.

## Rollback

Frontend rollback is a normal Git revert. Existing originals continue to work because every thumbnail surface has original-image fallback.

The database migration does not need to be reversed for a frontend rollback; its columns are nullable and unused by older code. Storage thumbnails can remain safely because they use a separate `thumbnails/` prefix and do not replace originals.
