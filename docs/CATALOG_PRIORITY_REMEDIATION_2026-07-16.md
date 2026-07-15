# Catalog Priority Remediation Baseline

_Date: 2026-07-16_

## Scope

Live website, GitHub catalog code and owner Supabase product/media records were checked before any destructive catalog change.

## Verified live baseline

- 26 categories
- 86 published products
- 86 products with hero images
- 494 product-gallery URLs mapped to 494 media-library assets
- 500 media-library assets technically verified
- 0 duplicate URL entries inside individual product galleries
- 0 unpublished product records

## Priority queue

| Priority | Products | Meaning |
|---|---:|---|
| P0 | 5 | Fewer than four distinct gallery images |
| P1 | 35 | Reference-style identity review and/or weakest image below 800px |
| P2 | 42 | Weakest image between 800px and 1199px |
| P3 | 4 | Media reaches 1200px; buyer-data completion remains |

## P0 products

1. Bavarian Checkered Shirt — 3 gallery images, minimum edge 768px
2. Baseball Jersey — 3 gallery images, minimum edge 912px
3. Basketball Mesh Jersey — 3 gallery images, minimum edge 912px
4. Cricket Jersey — 3 gallery images, minimum edge 912px
5. Rugby Jersey — 3 gallery images, minimum edge 912px

Existing media-library lookup did not find a safe unused fourth exact-product view for the four sports jerseys. New matching views are required. The Bavarian shirt also has overlapping checkered-shirt product families; exact identity must be resolved before borrowing another product's images.

## P1 identity/media risks

- 22 published products contain `Reference Style 02/03` naming and require exact identity review before keeping them as separate SEO pages.
- 28 products have at least one gallery image below 800px.
- Lowest known product image edge: 543px on Leather Gloves — Reference Style 02.
- Premium Leather Bag — Reference Style 02 reaches only 600px on its weakest image.
- Multiple Bavarian accessories and leather products use 720–768px media.

## Buyer-data gaps

Across the 86 published products:

- Material specifications missing: 86
- Available sizes missing: 86
- Available colours missing: 86
- Packaging standard missing: 86
- Sample status missing: 86
- Sample timeline missing: 86
- Country of origin missing: 86
- Fabric composition missing: 86
- MOQ wording missing: 22
- Primary material missing: 22
- Production timeline missing: 22

Descriptions and SEO titles/descriptions are populated, but product records must not be marked fully verified until safe buyer-facing data is confirmed.

## Existing Drive audit evidence

- Men's Bavarian Drive section: 291 images reviewed.
- Women's Bavarian Drive section: 79 images reviewed.
- Women's section contains eight verified Women's Lederhosen candidates.
- No complete Dirndl dress product-image set was found in the audited Women's folder.
- Men's shoes and socks should remain product families/variants until exact multi-angle sets exist.
- Children's Kniebund audit found three genuine new product candidates and one binary duplicate source file.

## Remediation order

### Workstream A — P0 gallery completion

Create or source exact matching front, three-quarter, side and back views. Do not combine different jersey designs merely to reach four images.

### Workstream B — P1 identity review

Review the 22 Reference Style pages against their exact media clusters. Outcome per page: keep as separate verified product, merge as a variation, or unpublish with redirect. No merge/unpublish is performed before visual confirmation.

### Workstream C — Resolution replacement

Replace weak originals rather than only enlarging compressed files. Minimum master target: 1600px short edge; preferred website/catalog master: 2048×2048 where product framing permits.

### Workstream D — Product information

Confirm material, composition, sizes, colours, sampling, production timeline, packaging, origin and MOQ from actual manufacturing capability. Unknown details remain explicitly unverified.

### Workstream E — Verified catalog additions

Prepare new products only from verified media clusters:

- Women's Lederhosen product family
- Children's Kniebund / Bundhosen candidates
- Haferl shoes product family
- Loferl and Trachten sock families
- Dirndl products only when complete exact-product photography is available

## Safety controls

- No product deleted, merged or unpublished in this baseline batch.
- New database audit object is a read-only view.
- GitHub changes are isolated on `catalog-priority-audit-2026-07-16`.
- Draft PR is used for CI and review before merge.
- Existing live catalog remains available during remediation.
