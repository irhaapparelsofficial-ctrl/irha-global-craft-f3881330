# IA-BRAND-VISUAL-E001 evidence

Starting main: `b399b79856c5544ff1a80471b8030b609a89c1a2`

## Official logo source

Historical repository evidence records that the owner supplied the official Irha Apparels crest on 2026-07-17. The exact crest artwork is embedded in `public/favicon.svg`; the production-ready square PNG derivative used for header, footer and controlled image fallback is `public/icon-512x512.png` (Git blob checksum `6da839c69684a251e201cb544c29011dd1b3d2d2`).

The previous `public/irha-brand-mark.svg` was a hybrid lockup: it embedded the owner-supplied crest but appended separately reconstructed `Irha Apparels` and `B2B CUSTOM MANUFACTURING` text. It is no longer used by the header, footer or controlled fallback.

## Blue question-mark root cause

`CatalogListingCard.tsx` and `HeroCarousel.tsx` intentionally overlaid `/favicon.svg` as a small brand badge on product/category imagery. On affected mobile rendering this nested SVG/WebP badge surfaced as the blue broken-asset/question-mark indicator. The overlay also conflicted with the current product-image no-watermark contract.

The shared badge implementations were removed at their source. Product/category media delivery and fallbacks remain unchanged.

## Completed-state lock

No Supabase files, migrations, product mappings, media manifests, taxonomy files, or SEO/AEO files are changed by this execution. IA-MEDIA mutation workflows are not invoked by these source changes.
