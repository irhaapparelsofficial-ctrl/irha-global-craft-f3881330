# IA-BRAND-VISUAL-E001 evidence

Starting main: `b399b79856c5544ff1a80471b8030b609a89c1a2`

## Official logo source

Historical repository evidence records that the owner supplied the official Irha Apparels navy-and-gold circular crest on 2026-07-17.

The authoritative valid raster derivative used to repair this release is `public/icon-192x192.png` with Git blob checksum `ad8355df858e1a93e772e485ed8ee303ab44ddd1`. The runtime header/footer path remains `/icon-512x512.png`; that file is a technical 512×512 derivative of the same crest, not a redrawn or reconstructed logo.

The previous `public/irha-brand-mark.svg` was a hybrid lockup: it embedded the owner-supplied crest but appended separately reconstructed `Irha Apparels` and `B2B CUSTOM MANUFACTURING` text. It is not used by the header, footer or controlled fallback.

## Quality Gate reproduction and root-cause classification

Run `30705671911`, job `91384224097`, failed Unit / smoke tests. Exact reproduction identified four assertions:
- `src/lib/performanceDiscoveryContract.test.ts` expected the removed homepage favicon badge.
- `src/test/buyerReadinessContracts.test.ts` expected the removed catalogue/favicon badge.
- `src/test/proB2BHomepage.test.ts` expected the removed homepage favicon badge.
- `src/test/faviconBranding.test.ts` used an over-strict favicon payload contract.

The first three were stale test expectations caused by the intended no-overlay branding change. Corrective commit `d28953d448555c003327781f01c74284c61c6b74` updated those contracts without deleting or skipping coverage.

The next exact-head Quality Gate run `30710227063` exposed a genuine implementation defect in the legacy technical brand assets. Local binary reconstruction proved:
- old `public/favicon-16x16.png` blob `d1ac34be59355157821b4ace886cec9c6b215461` cannot be decoded as an image;
- old `public/icon-512x512.png` blob `6da839c69684a251e201cb544c29011dd1b3d2d2` is structurally truncated and fails full image decode.

The repair uses the valid authoritative 192×192 crest as source. `public/favicon.svg` embeds those exact 192×192 PNG bytes; `public/favicon-16x16.png` and `public/icon-512x512.png` are technical derivatives of the same artwork. Regression coverage now forces full Sharp decode, not metadata-only validation.

## Blue question-mark root cause

`CatalogListingCard.tsx` and `HeroCarousel.tsx` intentionally overlaid `/favicon.svg` as a small brand badge on product/category imagery. On affected mobile rendering the nested SVG/image badge surfaced as the blue broken-asset/question-mark indicator. The overlay also conflicted with the current product-image no-watermark contract.

The shared badge implementations were removed at their source. Product/category media mappings and primary image-loading paths are unchanged.

## Completed-state lock

No Supabase files, migrations, product mappings, media manifests, taxonomy files, SEO/AEO files or localization files are changed by this execution. IA-MEDIA production mutation is not invoked by these source changes. P001–P007 mappings remain untouched and P008–P254 remain untouched.
