# Irha Apparels — Organized Media Deployment Audit

_Last updated: 2026-07-13_

## Release scope

- Canonical Drive library: `https://drive.google.com/drive/folders/1t3MjRc67q1CJZwWPf3g_40fSTVnnsNQL`
- Master deployment sheet: `https://docs.google.com/spreadsheets/d/1rWDIZEZYP15oO4mP7L0GKnseQeGHhOoh-70nOxUQSnY`
- Target repository: `irhaapparelsofficial-ctrl/irha-global-craft-f3881330`
- Target branch: `feat/organized-media-library`
- Pull request: `#153`

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
- 23 optimized WebP assets under `public/product-media/<slug>/`

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

## Validation results

- [x] Unique product slugs prepared.
- [x] Duplicate-safe public catalogue integration prepared.
- [x] Existing Batch10 products preserved through a legacy module.
- [x] New Drive media manifests prepared.
- [x] GitHub `Sync Product Media` workflow completed successfully and committed optimized WebP assets.
- [x] Deployment source lock passed.
- [x] Bavarian importer safety verification passed.
- [x] Typecheck passed.
- [x] Automated tests passed.
- [x] Production build passed.
- [x] Built release identity and canonical-host verification passed.
- [x] Legacy public-claim guard passed.
- [ ] Post-merge public product route and gallery smoke test.

Validated by GitHub Actions runs `29265463977` (media sync) and `29265464048` (quality gate). The final unchecked item is intentionally post-merge because it requires the deployed public release.
