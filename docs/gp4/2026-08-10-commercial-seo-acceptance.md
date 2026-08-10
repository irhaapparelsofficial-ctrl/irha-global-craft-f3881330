# IRHA APPARELS — GP-4 Commercial SEO Acceptance Record

Execution: IRHA-GP4-COMMERCIAL-SEO-20260810
GP-3 authority model: IRHA-GP3-20260810-V1
Starting main: `07ca85f96a58cefe75de09a53e4710543c472d9c`
Production Supabase: `pvzjiozismyxqrzmtfbi`
GSC run: `b02d2344-fb32-47f0-ac17-c60a23cf69fa`
GSC data window: 2026-07-12 through 2026-08-08

## Guardrails

- One strategic query family continues to own one preferred GP-3 URL.
- No GP-4 keyword database, second CMS, country clone or competing commercial URL is created.
- Existing taxonomy pages remain the authority wherever GP-3 already assigned them.
- Commercial wording is specification-led. No fixed MOQ, capacity, pricing, production timing, certifications, ratings, reviews or export claims are introduced.
- Existing CollectionPage and BreadcrumbList schema remains the schema authority; no parallel schema system is added.
- Existing hierarchical category links remain the primary commercial internal-link system.

## Search evidence used

- `/products/sportswear`: current-period GSC page observations include positions approximately 4.1 and 6.7 across canonicalized host variants; strongest existing broad sportswear near-win.
- `/products/streetwear-activewear`: 19 impressions at average position 6.58 in the current period.
- `/products/leisure-nightwear`: 28 impressions at average position 14.43 in the current period.
- `/products/bavarian-trachten-wear/women/dirndl-dresses`: 2 impressions at average position 6.5; product P017 additionally shows `custom dirndl` demand with 29 impressions at product level.
- `/custom-sportswear-manufacturer-germany`: 4 clicks, 34 impressions, 11.76% CTR and average position 9; retain as a distinct Germany buyer-support page.
- `/sportswear-manufacturer-sialkot`: only 4 current impressions at average position 14.75 plus one query-page observation for the local Sialkot query at position 48; it overlaps the stronger `/products/sportswear` authority and does not justify a second broad manufacturer page.

## GP-4 commercial acceptance matrix

| # | QUERY_FAMILY | PREFERRED_URL | CURRENT_PAGE_STATE | GSC_EVIDENCE | ACTION | TITLE_DECISION | H1_DECISION | COMMERCIAL_COPY_DECISION | INTERNAL_LINK_DECISION | SCHEMA_DECISION | CANNIBALIZATION_RESULT | LIVE_VERIFICATION |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Custom Football Kit / Teamwear Manufacturer | `/products/sportswear/team-club/team-uniforms` | Published taxonomy authority; generic copy | No direct page row yet; GP-3 priority #1 | UPGRADE | Lead with custom football kit + private-label teamwear | Buyer-facing football/teamwear manufacturer H1 | Team kit, artwork, names/numbers, sizing, labels, packaging, sampling/quotation scope | KEEP hierarchy: Sportswear → Teams & Clubs → Team Uniforms | KEEP existing truthful CollectionPage/BreadcrumbList | One authority retained; no new football landing page | Required post-merge |
| 2 | Lederhosen Manufacturer / Wholesale Supplier | `/products/bavarian-trachten-wear/men/lederhosen` | Published taxonomy authority; generic copy | No direct page row yet | UPGRADE | Lederhosen manufacturer + wholesale/private label | Natural wholesale/private-label Lederhosen H1 | Lederhosen range, leather/material, embroidery, sizing, trims, labels, packaging | KEEP hierarchy | KEEP existing schema | No new supplier/OEM variants | Required post-merge |
| 3 | Private-label Sportswear Manufacturer | `/products/sportswear` | Published broad authority with strong near-win | ~4.1–6.7 positions across current canonicalized page observations | UPGRADE | Private-label sportswear + custom teamwear | Private-label sportswear for B2B buyers | Team uniforms, performance, combat, training; OEM/ODM and spec-led development | KEEP existing audience links | KEEP existing schema | Broad sportswear intent stays here | Required post-merge |
| 4 | Private-label Leather Jacket Manufacturer | `/products/premium-leather-apparel/men/jackets-outerwear` | Published taxonomy authority; generic copy | No direct page row yet | UPGRADE | Private-label leather jacket | Leather jacket/outerwear manufacturer | Material, construction, fit, sizing, trims, branding, labels, packaging | KEEP hierarchy | KEEP existing schema | No duplicate jacket manufacturer URL | Required post-merge |
| 5 | Private-label Heavyweight Hoodie / Streetwear Manufacturer | `/products/streetwear-activewear` | Published broad authority, near-win | 19 impressions; position 6.58 | UPGRADE | Private-label streetwear + heavyweight hoodie intent | Streetwear & hoodie manufacturer | Published streetwear families; heavyweight requirement remains buyer-specification-led | KEEP child/audience links | KEEP existing schema | Broad streetwear intent stays at root; no hoodie clone created | Required post-merge |
| 6 | Private-label Dirndl Manufacturer | `/products/bavarian-trachten-wear/women/dirndl-dresses` | Published taxonomy authority | 2 category impressions at position 6.5; P017 `custom dirndl` 29 impressions | UPGRADE | Private-label Dirndl + wholesale Trachten | Private-label Dirndl for wholesale buyers | Fabric, bodice/apron, trims, embroidery, sizing, labels, packaging | KEEP hierarchy | KEEP existing schema | Product demand supports category; no new Dirndl landing page | Required post-merge |
| 7 | Private-label Nightwear / Pajama Manufacturer | `/products/leisure-nightwear` | Published broad authority | 28 impressions; position 14.43 | UPGRADE | Pajama + nightwear private-label intent | Private-label pajama/nightwear H1 | Pajamas, sleepwear, robes, leisure/nightwear; fabrics, construction, sizing, branding, labels, packaging | KEEP existing audience links | KEEP existing schema | Broad nightwear intent stays here | Required post-merge |
| 8 | Private-label Activewear Manufacturer | `/products/sportswear/fitness-activewear/performance-activewear` | Published taxonomy authority; generic copy | No direct page row yet | UPGRADE | Private-label activewear + performance apparel | Activewear/performance apparel manufacturer | Materials, construction, fit, sizing, branding, labels, packaging | KEEP hierarchy | KEEP existing schema | Distinct performance-activewear intent retained below Sportswear | Required post-merge |
| 9 | Private-label Leather Accessories Manufacturer | `/products/premium-leather-apparel/accessories` | Published accessories authority; generic copy | No direct page row yet | UPGRADE | Private-label leather accessories | Leather accessories manufacturer | Published bags/accessories families, material, construction, branding, labels, packaging | KEEP hierarchy | KEEP existing schema | Distinct accessories intent; no new accessories landing page | Required post-merge |
| 10 | Trachten Shirt / Vest Manufacturer | `/products/bavarian-trachten-wear/men` | Published men's Trachten authority; generic copy | No direct page row yet | UPGRADE | Trachten shirt & vest + wholesale/private label | Shirt & vest manufacturer for B2B | Men's Trachten shirts, vests and related apparel; materials, embroidery/branding, sizing, trims, labels, packaging | KEEP links to shirt/vest child collections | KEEP existing schema | Audience authority consolidates related shirt/vest intent | Required post-merge |

## Special commercial routes

### `/sportswear-manufacturer-sialkot`

Decision: **MERGE / REDIRECT** to `/products/sportswear`.

Reason: the route overlaps broad sportswear manufacturer intent, has materially weaker GSC evidence, and does not provide enough distinct local buyer value to justify a competing indexable authority. GP-4 aligns the curated legacy resolver and Cloudflare redirect file to a direct one-hop 301.

### `/custom-sportswear-manufacturer-germany`

Decision: **KEEP DISTINCT / SUPPORTING PAGE**.

Reason: current GSC evidence is material (4 clicks / 34 impressions / average position 9) and the current page is specifically written for German clubs, distributors, wholesalers and brands, including Germany-specific sourcing context and a link to the canonical Sportswear category. It is not converted into the broad sportswear authority and no additional country clones are created.

## Google-first implementation notes

GP-4 follows current Google Search Central principles: useful people-first copy, descriptive and non-stuffed title links, page-specific snippet support, crawlable hierarchical internal links, consistent canonicals, and no assumption that extra AI-specific markup or arbitrary word counts are required.

## GP-5 boundary

GP-4 does not build a knowledge hub, glossary, broad FAQ program, answer-first content cluster or entity-authority program. Those remain GP-5 work after GP-4 production acceptance.
