# Irha Apparels — Organized Media Deployment Audit

_Last updated: 2026-07-13_

## Release scope

- Canonical Drive library: `https://drive.google.com/drive/folders/1t3MjRc67q1CJZwWPf3g_40fSTVnnsNQL`
- Master deployment sheet: `https://docs.google.com/spreadsheets/d/1rWDIZEZYP15oO4mP7L0GKnseQeGHhOoh-70nOxUQSnY`
- Target repository: `irhaapparelsofficial-ctrl/irha-global-craft-f3881330`
- Target branch: `feat/organized-media-library`

## Verified product and media counts

| Collection | Products | Selected images |
|---|---:|---:|
| Existing Short/Knee Lederhosen | 22 | 83 |
| New Long Lederhosen | 6 | 10 |
| New product-only Trachten Waistcoats | 13 | 13 |
| **Total** | **41** | **106** |

## New release files

- `scripts/product-media-batch-long-lederhosen.json`
- `scripts/product-media-batch-waistcoats.json`
- `src/lib/supplementalCatalogBatch11.ts`
- `src/lib/supplementalCatalogBatch10Legacy.ts`
- `src/lib/supplementalCatalogBatch10.ts`

The existing media pipeline reads `scripts/product-media-manifest.json` and all `scripts/product-media-batch-*.json` files, downloads first-party Drive sources, validates payloads, performs EXIF correction, constrains images to 1600 × 1600, converts them to WebP, and writes them to `public/product-media/<slug>/`.

## Catalogue behavior

- Database products remain authoritative.
- Supplemental products are added only when their slug is not already present.
- All new products are attached to `Bavarian Trachten Wear → Men / Menstrachten`.
- Gallery order is hero first, followed by available back/angle/detail media.
- Public pricing is not added.
- Claims are limited to visible product details; no unsupported material composition, leather species, certification, MOQ, production timeline, or shipping claims were introduced.

## Excluded from deployment

- 7 misfiled `swimwear-bathes` images found inside the Lederhosen source.
- 5 superseded/duplicate older Long Lederhosen views.
- 5 model-based waistcoat reference images.
- 36 low-resolution or third-party Shirts & T-Shirts reference graphics.

## Validation checklist

- [x] Unique product slugs prepared.
- [x] Duplicate-safe public catalogue integration prepared.
- [x] Existing Batch10 products preserved through a legacy module.
- [x] New Drive media manifests prepared.
- [ ] GitHub media workflow completes and commits optimized WebP assets.
- [ ] Lint passes on the pull-request branch.
- [ ] Production build passes on the pull-request branch.
- [ ] Public product routes and galleries are smoke-tested after CI.

The remaining unchecked items must be updated from the pull-request CI results before merge.
