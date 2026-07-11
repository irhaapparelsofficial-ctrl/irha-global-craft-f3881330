# Batch 02 — Bavarian Women's Trachten Audit

_Date: 2026-07-12_

## Live-first prerequisite

Before this batch, the published website was checked with a real-browser Playwright workflow.

Verified live results:

- Homepage, `/products` and the Bavarian category returned HTTP 200.
- The Bavarian category showed 72 styles, including 61 Men's Trachten and 3 Women's Trachten products.
- Three tested Lederhosen product pages returned HTTP 200 with working galleries and correct H1/title output.
- The apparent broken carousel images were hidden lazy-loaded slides, not visible product failures.
- A genuine HTTP 400 request on product pages was traced to the Related Products section querying a stale Supabase products table.

The Related Products section now resolves products from the committed Lovable catalog. No public product-page Supabase request is required.

## Women's product identity audit

Three distinct Women's Trachten products were verified in the committed catalog:

1. `traditional-dirndl-dress`
2. `dirndl-blouse`
3. `dirndl-apron`

Duplicate result:

- No repeated canonical slug.
- No repeated product title.
- No gallery path shared between the three product identities.
- Each gallery remains attached to its own product.

## Canonical collection routes

- `/products/bavarian-trachten-wear/womens-trachten/dirndl-dresses`
- `/products/bavarian-trachten-wear/womens-trachten/dirndl-blouses`
- `/products/bavarian-trachten-wear/womens-trachten/dirndl-aprons`

The compatibility route `/products/bavarian-trachten-wear/womens-trachten` redirects to the existing Women's Trachten category filter.

## Product SEO delivered

Unique verified overrides were added for all three products:

- SEO title
- Meta description
- Buyer-facing product description
- Short description
- Safe B2B specification bullets

Copy does not invent fabric composition, GSM, certifications, MOQ, lead time or production capacity. Material and construction are confirmed against the approved sample and buyer specification.

## Collection SEO delivered

Every collection page includes:

- Unique SEO title and meta description
- Natural H1 and introductory copy
- Canonical short URL
- CollectionPage, ItemList and Breadcrumb structured data
- Product-specific alt text
- Quote, WhatsApp and factory video-call CTAs
- Internal links to the correct canonical product page and adjacent Women's Trachten collections

## Navigation and sitemap

- The Bavarian category navigation now contains separate Men's and Women's buyer collections.
- All three Women's collection URLs are generated in `sitemap.xml`.
- Duplicate sitemap paths are collapsed by canonical URL.

## Files changed

- `src/pages/ProductDetail.tsx`
- `src/lib/bavarianWomensCollections.ts`
- `src/lib/productSeoOverrides.ts`
- `src/hooks/usePublicCatalog.ts`
- `src/pages/BavarianWomensCollection.tsx`
- `src/App.tsx`
- `src/components/BavarianMensCollectionNav.tsx`
- `scripts/generate-sitemap.ts`

## Deferred

- New Dirndl design variations are not invented from unmatched images.
- Women's products from Drive will only be added after exact same-product galleries are visually classified.
- Children's Trachten remains the next Bavarian taxonomy and duplicate-audit batch.
