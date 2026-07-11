# Batch 01 — Bavarian Men's Core Audit

_Date: 2026-07-12_

## Scope

This batch reorganises the buyer-facing Bavarian men's catalog around clear B2B sourcing intent while keeping the existing canonical top category:

- `Bavarian Trachten Wear`
  - `Short Lederhosen`
  - `Knee-Length Lederhosen & Bundhosen`
  - `Long Leather Pants`
  - `Trachten Shirts`
  - `Trachten Vests & Jankers`
  - `Bavarian Accessories`

The website remains quote-led. No public prices were introduced.

## Canonical collection routes

- `/products/bavarian-trachten-wear/mens-trachten/short-lederhosen`
- `/products/bavarian-trachten-wear/mens-trachten/knee-length-lederhosen-bundhosen`
- `/products/bavarian-trachten-wear/mens-trachten/long-leather-pants`
- `/products/bavarian-trachten-wear/mens-trachten/trachten-shirts`
- `/products/bavarian-trachten-wear/mens-trachten/trachten-vests-jankers`
- `/products/bavarian-trachten-wear/mens-trachten/bavarian-accessories`

The compatibility route `/products/bavarian-trachten-wear/mens-trachten` redirects to the existing Men's Trachten filter on the main Bavarian category.

## Buyer journey delivered

1. The Bavarian top-category hero is followed by a dedicated Men's Trachten collection navigator.
2. Each collection has its own indexable landing page with a relevant hero and buyer-focused introduction.
3. Collection product cards link to the existing canonical product pages.
4. Breadcrumbs connect Home → Collections → Bavarian Trachten → collection.
5. Quote, WhatsApp and factory video-call trust actions are available without exposing public pricing.

## Public catalog source correction

The buyer-facing catalog previously depended on a hardcoded external Supabase project. That dependency did not represent the current Lovable Cloud project and could cause empty catalogs, slow error fallbacks or build failures.

Batch 01 changes the public runtime source to the committed Lovable/GitHub catalog:

- `src/lib/categories.ts`
- `src/lib/catalog.ts`
- `src/lib/supplementalCatalog.ts`
- `src/lib/supplementalCatalogBatch02.ts` through `supplementalCatalogBatch10.ts`
- verified local and Lovable-hosted media already committed in the repository

The admin area was not redesigned in this batch. This change is limited to public category/product rendering and canonical product lookup.

## Duplicate decisions

Duplicate handling is deterministic and conservative:

- Product slugs are unique inside each subcategory.
- A supplemental product is appended only when its slug does not already exist.
- Repeated gallery paths are removed.
- The sitemap uses a map keyed by canonical path, so duplicate URLs collapse to one entry.
- Same colour, same gallery and same slug are treated as the same product identity.
- Different colourways, embroidery motifs, constructions, suspenders, piping or silhouettes remain separate products.
- Front, rear, angle and detail images of one product remain one gallery and are not treated as duplicate products.

No legitimate variant was deleted merely because its base garment type was also Lederhosen or a Trachten shirt.

## Image audit

### Selected hero assets

- Short Lederhosen: `/product-media/distressed-brown-short-lederhosen/01-hero-front.webp`
- Knee-Length Lederhosen & Bundhosen: `/product-media/traditional-lederhosen/01-hero-front.webp`
- Long Leather Pants: `/product-media/black-contrast-piped-long-leather-pants/01-hero-front.webp`
- Trachten Shirts: `/product-media/classic-blue-micro-check-trachten-shirt/01-hero-front.webp`
- Trachten Vests & Jankers: existing correct Trachten vest asset in Lovable CDN
- Bavarian Accessories: existing correct Alpine accessory asset in Lovable CDN

### Rejected image types

- Size charts used as banners or heroes
- Images with old `S&E INTERNATIONAL` branding
- Unrelated swimwear media stored inside Lederhosen sources
- Mixed children's-folder files without product-by-product classification
- Weak partial crops when a clean full-product hero is already available
- Different designs mixed into a single product gallery

Full file-level decisions are recorded in `docs/IMAGE_ASSET_MAP.md`.

## SEO work

Each new collection contains:

- A unique SEO title
- A unique meta description
- A natural H1
- A buyer-focused introduction
- A short lowercase hyphenated URL
- CollectionPage and ItemList structured data
- Breadcrumb structured data
- Descriptive product image alt text
- Internal links to canonical product pages and adjacent Men's Trachten collections

Keyword use is commercial but controlled, including phrases such as Lederhosen manufacturer, wholesale Lederhosen, private-label Trachten, OEM and B2B. Copy avoids keyword repetition and does not invent pricing, leather species, certifications, MOQ or delivery commitments.

## Sitemap correction

`scripts/generate-sitemap.ts` now generates the sitemap from the committed catalog without contacting an external database. It includes:

- Static public pages
- Five canonical top categories
- Canonical product URLs generated from the committed legacy and supplemental catalogs
- The six new Men's Trachten collection routes
- Deduplication by canonical URL

The prebuild step no longer fails because an unrelated database is paused or unavailable.

## Files changed

- `src/lib/bavarianMensCollections.ts`
- `src/pages/BavarianMensCollection.tsx`
- `src/App.tsx`
- `src/components/CategoryHero.tsx`
- `src/hooks/usePublicCatalog.ts`
- `scripts/generate-sitemap.ts`
- `docs/IMAGE_ASSET_MAP.md`
- `docs/BATCH_01_BAVARIAN_MENS_AUDIT.md`

## Verification checklist

- [x] No public pricing introduced
- [x] Original/committed product media used
- [x] Old third-party branding excluded from heroes
- [x] Product galleries deduplicated by path
- [x] Product records deduplicated by canonical slug
- [x] Collection routes use canonical product links
- [x] SEO title, description, H1, breadcrumbs and structured data added
- [x] Sitemap external database dependency removed
- [x] Existing legacy category redirects retained
- [ ] Live production verification after the owner presses Lovable Update/Publish

## Intentionally deferred

- Women's Trachten and Dirndl folder-by-folder classification
- Children's mixed-folder classification
- Factory-proof gallery for the Manufacturing/Buyer Trust pages
- Admin data-source migration or cleanup
- New binary uploads from Drive where an exact coherent same-product set is not already committed
