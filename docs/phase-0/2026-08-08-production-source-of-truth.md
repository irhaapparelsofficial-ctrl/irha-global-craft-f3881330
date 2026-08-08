# Phase 0 — Production Source of Truth Evidence Report

**Audit date:** 2026-08-08  
**Evidence collection window:** 2026-08-08T10:43Z–2026-08-08T13:35Z  
**Production origin:** `https://irhaapparels.com`  
**Production repository:** `irhaapparelsofficial-ctrl/irha-global-craft-f3881330`  
**Baseline GitHub `main` SHA:** `5ac3f5309617cb6f8533a54d0987a0602340bc7e`  
**Production Supabase project:** `pvzjiozismyxqrzmtfbi`  
**Companion inventory:** `docs/phase-0/2026-08-08-legacy-route-inventory.csv`

## Scope and stop condition

This report establishes the Phase 0 production baseline requested by the owner. It records what the current GitHub source, deployed artifact, production Supabase project, crawler HTML, browser runtime, AI/LLM files and legacy-route systems actually contain. It does not begin Phase 1 cleanup or Phase 2 trust architecture.

The audit excludes confidential buyer/customer contents. Only public-content records, aggregate counts, policies and production configuration were inspected. No buyer names, messages, files, order data, credentials, tokens, keys or secrets are reproduced.

## Current production baseline

### GitHub and deployed revision

GitHub `main` resolved to `5ac3f5309617cb6f8533a54d0987a0602340bc7e` (`fix(parity): lock deployed notification-dispatcher v28 bundle`, committed 2026-08-08T10:43:08Z).

The live `/build.json` independently reported:

| Field | Live value |
|---|---|
| `repository` | `irhaapparelsofficial-ctrl/irha-global-craft-f3881330` |
| `source_branch` | `main` |
| `source_commit` | `5ac3f5309617cb6f8533a54d0987a0602340bc7e` |
| `built_at` | `2026-08-08T10:52:28.838Z` |
| `source_identity_state` | `verified` |
| `supabase_project_id` | `pvzjiozismyxqrzmtfbi` |
| `build_fingerprint` | `b1132a17b70b288dc49a14326ee070f5ed7d1d0e1039e24921c9d3640a36ca33` |
| `runtime_fingerprint` | `d315def9d8f56656c339facd88a1cadabbb9b99f1647946bf4c0a04ed0d0a524` |
| `application_fingerprint` | `451201534a0a6a36053e8ce1a3dab06e69f3026b755eceb39eebec43cb10e6b7` |

This is a direct Git-commit-to-live-artifact identity tie. A Cloudflare deployment UUID and an exact immutable `*.pages.dev` deployment alias were not available through the connected interfaces, so the Cloudflare deployment cannot additionally be tied to a Pages deployment UUID. The exact live Git SHA, build identity, immutable asset hashes and Cloudflare headers are the strongest available deployment evidence.

### Delivery architecture

Observed production delivery path:

1. Cloudflare serves the apex origin (`server: cloudflare`, HTTP/2/3, Cloudflare security/cache headers).
2. Pages-style `public/_headers` and `public/_redirects` control static assets and a subset of redirects.
3. A sealed Cloudflare Worker serves or patches route-specific HTML and applies database-backed redirect behaviour.
4. The application is Vite/React/TypeScript with route-specific crawler shells generated during the build.
5. Public catalogue and content queries use Supabase `pvzjiozismyxqrzmtfbi`; Supabase Storage hosts catalogue media and Edge Functions handle public/operational functions.

The host path remains two hops: `http://irhaapparels.com/` → `https://www.irhaapparels.com/` → `https://irhaapparels.com/`. The `www` HTTPS origin redirects once to the apex.

### Supabase identity and public-content state

The connected project is `ACTIVE_HEALTHY` in `ap-southeast-1`, uses Postgres 17, and has URL `https://pvzjiozismyxqrzmtfbi.supabase.co`.

Exact SQL counts at audit time:

| Public-content area | Production state |
|---|---:|
| Products | 399 total: 254 published, 145 draft/non-public |
| Categories | 72 total: 71 published, 1 non-public |
| Taxonomy nodes | 251 total: 105 published, 144 archived, 2 draft |
| Approved product-taxonomy assignments | 254 |
| Published FAQs | 18 |
| Published blog posts | 10 |
| Localized SEO rows | 1,788; all 1,788 `noindex`; 0 public-eligible |
| Published CMS documents | 2 |
| Legacy redirect records | 1,304 |
| Published SEO overrides | 0 of 6 |

The table-listing API returned an approximate `products` row estimate of 499, but exact SQL returned 399; exact SQL is used in this report.

Public RLS policies restrict anonymous reads to published products/categories/FAQs/blogs, published taxonomy nodes and approved assignments connected to published products. The localized-page policy also requires published status, `noindex = false` and approved/not-required native review. Draft products, archived/draft taxonomy and all 1,788 localized rows are therefore excluded by the reviewed public gates. CMS documents are not directly anonymously readable; public CMS content is exposed through the scoped `cms_get_published_document` projection.

## Verified public facts

`VERIFIED` here means direct owner authority, an authoritative current public record, or production implementation was observed. Repetition of marketing copy is not evidence.

| Fact | Evidence and qualification |
|---|---|
| Public business name is **Irha Apparels**. | Latest owner-approved identity, production configuration, and current SCCI member directory record. No broader legal claim is inferred from the name alone. |
| Business location is **Sialkot, Pakistan**. | Owner-approved identity, production configuration, and current SCCI directory record. |
| Official website is `https://irhaapparels.com`. | Live origin, GitHub deployment lock and `build.json`. |
| Official and only public phone/WhatsApp is **+92 320 4110066** / `+923204110066`. | Explicit latest owner instruction on 2026-08-08. GitHub defaults, production CMS and all 436 crawler pages agree. A superseded alternate phone in third-party/internal records does not override the latest owner instruction. |
| Current production publishes **info@irhaapparels.com** as its public email. | Directly observed in source, CMS version 4, crawler/runtime output and the public-index guard. The supplied knowledge snapshot, SCCI member record and CMS versions 1–3 instead contain `irhaapparelsofficial@gmail.com`. Because the repository deliberately classifies the Gmail address as an owner/archive address, no current explicit owner instruction establishes which mailbox should be public. Email authority is therefore unresolved, not silently changed. |
| SCCI directory associates **A-101267** with IRHA APPARELS. | Live search and member-detail result on the official SCCI site. The directory also identifies an Associate-class apparel member record. This does not verify the separate provisional-certificate date/status wording. |
| Irha Apparels is an experienced B2B apparel manufacturer. | Explicit owner-approved wording. It does not establish a numeric age, founding year, workforce, capacity, factory dimensions, export history or customer count. |
| OEM, ODM, private-label and made-to-requirement enquiry capability is offered. | Owner-approved business position, approved database business rules, implemented RFQ flow and published specification model. Exact feasibility is order-specific. |
| A scheduled live factory-view video call can be requested. | Owner-approved rule, published FAQ, `/factory-video-call` route and implemented inquiry path. It remains appointment-, availability-, privacy- and scope-dependent. |
| Five primary product divisions are published. | Sitemap, SEO manifest, React routes and production taxonomy. |
| 254 product routes are published. | Live catalogue manifest, SEO manifest, sitemap and exact production SQL agree at 254. This is a catalogue count, not capacity, stock or prior-production evidence. |
| Commercial flow is quotation-led rather than fixed-price retail. | Owner-approved rule, RFQ implementation, database business rules and published FAQ. |
| Bulk production is intended to follow the latest approved specification/sample scope. | Approved rule and published FAQ/product workflow. This is a process rule, not evidence of a completed order. |

## Conditional / order-specific claims

These claims must not be converted into universal promises:

| Claim area | Phase 0 source-of-truth wording |
|---|---|
| Materials and trims | Material/composition/GSM/finish is reviewed for the selected product, quantity and supply chain. Website ranges are guidance, not guaranteed stock. |
| MOQ | Confirmed per product, material, colour split, customization, labels, packaging and production setup. No universal MOQ is verified. |
| Complimentary sample | One complimentary development sample only may be offered to an eligible verified/registered company, business or brand after product scope, expected order, quotation and specifications are reviewed. |
| Sample shipping | Buyer pays sample courier/freight, including for the complimentary sample. |
| Additional samples | Chargeable. A paid sample cost may be adjusted against a later confirmed bulk order only when written commercial terms say so. |
| Development start | Do not start merely on request; review order scope, finalize quotation and lock the agreed specifications/commercial terms first. |
| Production timing | Confirmed after product, quantity, material availability, customization, sample and final specification approval. |
| Price/payment | Unit price, payment method and milestones belong to the approved quotation/proforma invoice. No universal public schedule is verified. |
| Private label/decoration/packaging | Availability and method depend on the product, artwork, material, quantities and written program. |
| Shipping/Incoterms | EXW/FOB/CIF/DDP may be evaluated, but named place, destination coverage, duties, documentation and responsibility must be written into the quotation. |
| Confidentiality/NDA | Confidential handling and NDA review can be requested; governing terms, retention/deletion and exclusivity require a written agreement. |
| Organic/recycled/sustainability options | Options may be sourced/reviewed subject to supply, minimums and exact evidence. No blanket company or product claim is verified. |

The detailed complimentary-sample rule is owner-approved but is not encoded in the current public FAQ, product rows or approved `ai_business_rules` v2.

## Third-party-dependent claims

The following depend on external parties and must remain scoped to a written order/program:

- supplier composition, origin, availability, GSM and organic/recycled-content documentation;
- laboratory testing and test reports;
- OEKO-TEX, GOTS, GRS, REACH, ISO, WRAP, BSCI, SEDEX/SMETA, SGS, Intertek, CE or other requested audit/certificate evidence;
- third-party inspection scope, timing, cost and result;
- freight rates, schedules, transit time, loss/delay and last-mile delivery;
- customs clearance, duties, taxes, port/authority action and destination admissibility;
- DDP feasibility and destination coverage.

The current compliance/buyer-information wording generally states these dependencies and says that mentioning a standard is not evidence that Irha Apparels holds it.

## Unsupported or risky public/source claims

| Claim | Location | Classification and evidence gap |
|---|---|---|
| Provisional Certificate of Membership, status `Provisional`, issue date **27 July 2026**, and a pending Executive Committee step. | Live `/buyer-trust`; `src/lib/publicBusinessEvidence.mjs`; `src/pages/BuyerTrust.tsx`; generated crawler HTML. | **UNSUPPORTED in connected evidence.** The official SCCI directory verifies IRHA APPARELS and A-101267, but the underlying provisional certificate is absent from GitHub and production Storage. Directory evidence does not verify the certificate's issue date, provisional status or quoted qualification. The statement is not proven false, so it is flagged rather than emergency-removed. |
| “Learn about … serving global B2B buyers.” | Live `/about` crawler description; `scripts/finalize-seo-route-manifest.ts`; `scripts/generate-static-route-shells.ts`. | **RISKY customer-history implication.** Global buyers are the target audience, but no customer/export history was supplied. Phase 0 candidate wording changes “serving” to “for.” |
| “Experienced export-focused …” | Live `/llms.txt`. | **RISKY export-history implication.** “Experienced” is approved; export/customer history is not evidenced. Phase 0 candidate removes “export-focused.” |
| “Exports [market list]”. | Dormant `src/pages/CategoryPage.tsx` line 298. | **UNSUPPORTED source wording, not active public output.** The only registered route using this component, `/products/:categorySlug/all-products`, currently passes `categorySlug` while the component reads `slug`; the tested canonical route returns a noindex 404 and no sitemap route contains `all-products`. Record for Phase 1; no Phase 0 redesign/fix. |
| A single, current owner-approved public email. | Production code/CMS/crawler output use `info@irhaapparels.com`; the supplied knowledge snapshot, SCCI directory and CMS versions 1–3 use `irhaapparelsofficial@gmail.com`. | **UNRESOLVED identity authority.** `scripts/enforce-public-index-policy.mjs` deliberately treats the Gmail address as an owner address that must not leak into public HTML, while notification delivery uses the domain address as sender and Gmail as an archive destination. Reversing that design without an explicit current owner decision could expose a private mailbox or disturb delivery. Phase 0 records the conflict and makes no email mutation. |

No public numeric production/monthly capacity, employee count, factory size, machinery count, customer count, countries-served count, years-in-business number, founding date, client name or delivery guarantee was found in the 436-route crawl.

No blanket company-held OEKO-TEX, GOTS, ISO, WRAP, BSCI, SEDEX/SMETA, SGS, Intertek, CE, REACH, ethical-manufacturing, sustainable-manufacturing, organic-product or recycled-product credential was found. Educational/conditional pages mention some standards while denying that mention equals possession.

## Business-rule source of truth

| Rule | Phase 0 authority | Production state/conflict |
|---|---|---|
| Company name | Latest owner identity + current production + SCCI directory | Consistent. |
| Official phone/WhatsApp | Latest explicit owner instruction: `+923204110066` only | Live GitHub/CMS/crawler correct. Older alternate internal/SCCI data is stale and must not be copied back. |
| Official public email | Unresolved: supplied knowledge + current SCCI directory + CMS v1–3 use `irhaapparelsofficial@gmail.com`; deliberate production policy + code/CMS v4/crawler use `info@irhaapparels.com` | No Phase 0 mutation. Requires an explicit current owner decision covering public contact, privacy and delivery roles. |
| Sample eligibility | One complimentary development sample for one eligible verified/registered business/brand after scope/quotation/specification review | Public FAQ is less specific. |
| Sample shipping | Buyer pays courier/freight | Not stated publicly. |
| Additional samples | Chargeable | Not stated publicly. |
| Bulk adjustment of paid sample cost | Only if agreed in writing | Not stated publicly. |
| Quotation before development | Requirements and commercial/specification review precede commitment | Generally consistent. |
| Final specification approval | Latest approved specification/sample governs bulk | Generally consistent. |
| MOQ | Program/product-specific | Generally consistent; “Flexible MOQ” is non-numeric but should remain conditional. |
| Production timeline | Confirm after material, quantity, customization and approval review | Consistent. |
| Payment terms | Approved quotation/proforma invoice only | Consistent. |
| Buyer confidentiality | Scoped handling; detailed obligations require written agreement/NDA | Generally consistent. |
| Private label | Supported subject to program feasibility/written scope | Consistent. |
| Live factory call | Scheduled, subject to availability/scope/privacy/safety | Consistent. |
| Shipping/Incoterms | Destination/order-specific written quotation | Consistent. |
| Certification/compliance | No blanket credential; evidence must match material/facility/order scope | Generally consistent except the unsupported SCCI document detail, which is membership rather than product compliance. |

### Duplicated public identity sources

- `src/lib/publicIdentity.mjs`
- `src/lib/constants.ts`
- `src/lib/siteSettings.ts` defaults derived from `PUBLIC_IDENTITY`
- hard-coded WhatsApp URL in `src/pages/Connect.tsx`
- CMS document `site.global.settings`
- generated static HTML, JSON-LD and compiled assets

The phone happens to agree today, but multiple writable identity sources remain a drift risk. Consolidation belongs to Phase 1.

## Content and policy contradictions

1. **Phone authority conflict outside production:** live production correctly uses only +92 320 4110066. The SCCI directory and the 31 July internal knowledge snapshot contain a superseded alternate phone. Latest owner instruction controls; no website number change is required.
2. **Official email conflict:** the supplied knowledge snapshot, SCCI directory and CMS versions 1–3 say `irhaapparelsofficial@gmail.com`; deliberate production source/policy, CMS v4 and crawler output say `info@irhaapparels.com`. The latest owner instruction in this audit resolves the phone only, so the email is not changed.
3. **Sample-policy omission:** public FAQ says feasibility, cost, timing and shipping are confirmed after review, but omits one-sample eligibility, buyer-paid shipping, additional-sample charges and possible written bulk adjustment.
4. **Target buyers versus served/exported buyers:** approved positioning targets global buyers; `/about` crawler metadata and `/llms.txt` imply served/export history without evidence.
5. **SCCI evidence split:** official directory verifies IRHA APPARELS and A-101267; connected systems do not contain the provisional certificate used for the public date/status/qualification.
6. **Redirect authority conflict:** 14 paths have different static and Supabase targets. Live precedence is not uniform: `/catalog` follows the static target `/products`, while tested sports review aliases follow the Worker/database target.
7. **Localization source conflict:** 1,788 Supabase localized rows are all `noindex`, while 43 localized-market/static routes are indexable from repository/build definitions.
8. **Runtime versus crawler content authority:** crawler manifest/static shells and hydrated React pages independently set titles/H1s; the representative browser audit found 9 H1 and 11 title mismatches.

No conflicting numeric MOQ, fixed production guarantee, universal payment schedule or blanket certification promise was found in the indexable route set.

## Crawler, browser and generated-SEO comparison

### Full crawler/static verification

All 436 current sitemap/manifest URLs were fetched with a crawler user agent:

- 436/436 fetched successfully;
- 0 non-200 responses;
- 0 sitemap/manifest count drift;
- 0 title mismatches against the live SEO manifest;
- 0 canonical mismatches;
- 0 H1 mismatches;
- 2 description mismatches caused by static ellipsis truncation;
- 26 `<html lang>` mismatches;
- official `+923204110066` phone present in 436/436;
- any superseded alternate phone present in 0/436;
- `info@irhaapparels.com` present in 436/436;
- owner/SCCI Gmail present in 0/436.

The two description mismatches are:

- `/de/bekleidungshersteller-deutschland`
- `/de/lederbekleidung-hersteller`

The 26 language-tag mismatches comprise:

- 3 German routes: manifest `de`, static `de-DE`;
- 9 `/markets/*` routes: regional English manifest locales, static `en`;
- 14 flat country/buyer-intent routes: manifest `en-US`, static `en`.

Exact paths are preserved in the crawl evidence and Phase 1 input.

### Representative browser/runtime verification

Thirty routes were loaded after hydration, including all five divisions, one product from each division, company/manufacturing/FAQ/contact/inquiry/trust/policy routes, German routes, three expected legacy policy URLs and the dormant all-products route.

Of 25 routes also present in the live manifest:

- 0 canonical mismatches;
- 0 runtime language mismatches;
- 9 H1 mismatches;
- 11 title mismatches.

H1 mismatches:

| Path | Browser H1 | Crawler/manifest H1 |
|---|---|---|
| `/products` | Browse by category, buyer group and product type. | Main category to buyer-ready product. |
| `/about` | Built for serious B2B programs. | About Irha Apparels |
| `/manufacturing` | From requirement to a reviewed production path. | Custom Apparel Manufacturing |
| `/faq` | Clear answers before you request a quote. | Frequently Asked Buyer Questions |
| `/factory-video-call` | Meet the team and view the factory live. | Live Factory Video Call |
| `/buyer-information` | Clear commercial information before sampling and production. | Buyer Information |
| `/buyer-trust` | Verify the supplier before the order. | Buyer Trust Center |
| `/compliance` | Requirements first. Evidence before claims. | Compliance and Documentation Readiness |
| `/de/` | B2B-Bekleidungsfertigung für deutschsprachige Einkäufer | B2B-Bekleidungsfertigung für Marken, Großhändler und Importeure |

Title mismatches occur on `/about`, `/manufacturing`, `/faq`, `/contact`, `/inquiry`, `/factory-video-call`, `/privacy-policy`, `/buyer-information`, `/buyer-trust`, `/compliance` and `/de/`.

The shared runtime footer was absent on 12 tested indexable routes: `/`, `/about`, `/manufacturing`, `/faq`, `/contact`, `/factory-video-call`, `/privacy-policy`, `/buyer-information`, `/buyer-trust`, `/compliance`, `/de/` and `/de/einkaeufer-informationen`. Product/taxonomy routes and `/inquiry` did render the footer. Crawler shells nevertheless expose contact identity on all 436 routes.

`/shipping`, `/shipping-policy` and `/buyer-confidence` return noindex not-found pages. `/shipping-returns` redirects to `/resources`; current logistics/Incoterm guidance is under `/buyer-information`.

The advertised `/.well-known/api-catalog` returns HTTP 200 and an `application/linkset+json` content type but its body is the HTML application shell, not a Linkset JSON document. The cloud browser also could not open it as a valid document. This is an exact discovery-contract mismatch.

## Legacy route inventory

The companion CSV contains 1,813 evidence rows:

- 436 current live indexable routes;
- 1,304 Supabase legacy records;
- 73 static Cloudflare rules (72 status-301 redirects and one status-200 favicon rewrite).

Across the database and static maps there are 1,346 unique legacy source paths:

| Integrated classification | Unique paths |
|---|---:|
| KEEP | 1 (favicon rewrite) |
| 301 | 1,331 |
| INVESTIGATE | 14 |
| 410 | 0 |

There are 31 paths present in both static and database sources. Fourteen have different targets. All 13 database `confidence='review'` paths are among those conflicts; `/catalog` is the additional auto/static conflict.

The 14 conflicts are:

| Source path | Static target | Supabase target |
|---|---|---|
| `/catalog` | `/products` | `/catalogue` |
| `/products/sportswear-soccer` | `/products/sportswear/team-club/football-kits` | `/products/sportswear/team-club/team-uniforms` |
| `/products/sportswear-cricket` | `/products/sportswear/team-club/cricket-uniforms` | `/products/sportswear/team-club/team-uniforms` |
| `/products/sportswear-baseball` | `/products/sportswear/team-club/baseball-uniforms` | `/products/sportswear/team-club/team-uniforms` |
| `/products/sportswear-basketball` | `/products/sportswear/team-club/basketball-uniforms` | `/products/sportswear/team-club/team-uniforms` |
| `/products/sportswear-rugby` | `/products/sportswear/team-club/rugby-kits` | `/products/sportswear/team-club/team-uniforms` |
| `/products/bavarian-trachten-wear/alpine-trachten-hat` | `/products/bavarian-trachten-wear/accessories/alpine-hats/alpine-trachten-hat` | `/products/bavarian-trachten-wear/accessories/accessories/alpine-wool-hat` |
| `/products/sportswear/athletic-onesie` | `/products/sportswear/unisex/athletic-bodysuits/athletic-onesie` | `/products/sportswear/fitness-activewear/performance-activewear` |
| `/products/sportswear/baseball-jersey` | `/products/sportswear/team-club/baseball-uniforms/baseball-jersey` | `/products/sportswear/team-club/team-uniforms/baseball-uniform` |
| `/products/sportswear/baseball-uniform-kit` | `/products/sportswear/team-club/baseball-uniforms/baseball-uniform-kit` | `/products/sportswear/team-club/team-uniforms/baseball-uniform` |
| `/products/sportswear/basketball-mesh-jersey` | `/products/sportswear/team-club/basketball-uniforms/basketball-mesh-jersey` | `/products/sportswear/team-club/team-uniforms/basketball-uniform` |
| `/products/sportswear/basketball-uniform-kit` | `/products/sportswear/team-club/basketball-uniforms/basketball-uniform-kit` | `/products/sportswear/team-club/team-uniforms/basketball-uniform` |
| `/products/bavarian-trachten-wear/bavarian-checkered-shirt` | `/products/bavarian-trachten-wear/men/trachten-shirts/bavarian-checkered-shirt` | `/products/bavarian-trachten-wear/men/trachten-shirts/checked-trachten-shirt` |
| `/products/bavarian-trachten-wear/bavarian-embroidered-vest` | `/products/bavarian-trachten-wear/men/trachten-vests/bavarian-embroidered-vest` | `/products/bavarian-trachten-wear/men/vests-waistcoats/wool-trachten-vest` |

Supabase has no self-redirects, duplicate-source/multiple-target rows, or targets that are themselves Supabase sources. No deliberate 410 rule was found. Phase 1 must make any 410 decision explicitly.

## SEO content source map

| Output | Current controlling sources | Drift |
|---|---|---|
| Canonicals/route eligibility | `finalize-seo-route-manifest.ts`, taxonomy alignment/sealing scripts, generated `seo-route-manifest.json` | React metadata and late static/Worker writers are additional authorities. |
| Sitemap | Published Supabase catalogue/taxonomy → manifest generator → `public/sitemap.xml` | Live manifest/sitemap agree at 436. |
| Robots/index policy | `public/robots.txt`, index-policy script, headers and route metadata | Current public/private policy is internally consistent. |
| Hreflang/language | `i18nFoundation.ts`, manifest alternates and static patchers | 26 static `lang` mismatches. |
| Titles/descriptions/H1 | React `SEO`, manifest, static-shell generators, market/buyer patchers, authoritative applicator and Worker | 2 static description truncations; 9 runtime H1 and 11 runtime title mismatches in the representative set. |
| Structured data | `seoSchema.ts`, `publicIdentity.mjs`, page components, static generators and Worker | Identity facts are duplicated. |
| OpenGraph/Twitter | Page SEO props, manifest/static application and media manifest | Inherits duplicated identity/SEO sources. |
| Counts | Supabase published views, catalogue manifest, taxonomy generators | 254 agrees; a hard assertion is a release lock, not an evergreen source. |
| Redirects | `public/_redirects`, React `Navigate`/legacy maps, Supabase redirects and Worker | 14 exact target conflicts; precedence varies by path. |
| AI/LLM content | `public/llms.txt`, `public/llms-full.txt`, AI-guide installer and Worker | Public `llms.txt` contains the risky export implication. |
| Contact identity | `publicIdentity.mjs`, `constants.ts`, CMS settings, generated HTML and compiled assets | Phone is now aligned; email is not. |

The build pipeline contains more than twenty sequential generators/patchers. Late authoritative manifest and sealed Worker writers can overwrite an early edit during the same build.

## Supabase public-content source review

- Published product/category/taxonomy data powers catalogue navigation, route manifests, product pages and build-time static content.
- Published FAQ/blog tables power `/faq`, `/blog` and article routes.
- `cms_get_published_document('site.global.settings')` projects approved CMS settings; direct anonymous table access is not granted.
- Public lead/chat functions and RPCs support inquiry/communication flows.
- Storage supplies published media.
- No Storage object name matching `scci`, `chamber`, `membership` or `certificate` was found.
- Approved `ai_business_rules` v2 contains conditional commercial/manufacturing rules, an empty certification list, and prohibitions on invented MOQ/capacity/delivery/certification claims. It does not contain the detailed complimentary-sample policy or current contact authority.
- CMS global settings v4 contains the correct `+923204110066` phone but `info@irhaapparels.com`. CMS versions 1–3 contain the same official phone and the owner/SCCI Gmail.
- 145 product drafts, 144 archived taxonomy nodes, 2 taxonomy drafts and 1,788 noindex localized rows remain in production but are not public under the reviewed gates.
- 1,304 redirect rows remain a separate route authority from the static map.

No confidential CRM/order row content was selected. No public-content policy reviewed exposes private buyer rows.

## Immediate critical risks and Phase 0 emergency scope

### Confirmed emergency correction

1. **Unsupported customer/export implications:** the candidate changes “serving global B2B buyers” to “for global B2B buyers” in the About crawler sources and removes “export-focused” from `llms.txt`.
2. **Phone guard:** no phone source is changed because GitHub, CMS and all crawler pages already use only `+923204110066` (allowing display spacing without changing its digits).

### Flagged, not emergency-mutated

- SCCI A-101267 is directory-verified, but the provisional certificate date/status/qualification lacks the underlying document in connected evidence.
- Public-email authority is contradictory. Phase 0 does not replace the deliberate public/domain-email policy with the supplied Gmail address without a fresh explicit owner decision covering public contact and notification-delivery roles.
- Dormant CategoryPage “Exports …” copy is not in the sitemap and the tested route is a noindex 404; route repair/content consolidation is Phase 1.
- Redirect conflicts, localized-source duplication, runtime/static title/H1 drift, missing runtime footers, language/description mismatches, two-hop host redirect and malformed API-catalog response are not immediate RFQ-security blockers and remain Phase 1 input.
- Current main has a pre-existing failing **Irha Supabase Function Reconciliation** status while Quality Gate, Cloudflare Production, Search Discovery and Cache Consistency are green. PR #886 is the separate concurrent recovery path; Phase 0 must not absorb or bypass it.

## Recommended input for Phase 1

1. Obtain an explicit current owner decision for the public email and its sender/archive roles, then consolidate identity into one validated authority and remove independent contact defaults.
2. Encode the detailed complimentary-sample policy in one approved business-rule source consumed by FAQ/RFQ/product help.
3. Attach/approve the actual SCCI provisional certificate in a controlled evidence location or remove the unverified date/status/qualification while retaining only directory-verifiable membership facts.
4. Select one redirect authority; resolve the 14 conflicts and make any 410 decision explicitly.
5. Resolve the 26 static language mismatches, 2 description truncations, 9 representative H1 mismatches, 11 representative title mismatches, conditional footer absence, two-hop host redirect and API-catalog body/content-type mismatch.
6. Decide whether 1,788 localized database rows are archival drafts or a future content source.
7. Remove or correct the dormant CategoryPage “Exports …” wording when that route is deliberately resolved.

## Validation record

- Refreshed GitHub repository identity, permissions, default branch, recent commits and open PRs.
- Re-fetched current main; it remained `5ac3f5309617cb6f8533a54d0987a0602340bc7e` during evidence collection.
- Matched live `/build.json` source repository/branch/commit/Supabase identity to GitHub main.
- Fetched all 436 sitemap routes and compared them with the live SEO manifest.
- Loaded 30 representative browser routes across divisions, products, policies, inquiry and German content.
- Queried exact production public-content counts and the relevant RLS policies.
- Inspected approved AI business rules, public FAQs, CMS publication history and scoped CMS projection functions.
- Compared 1,304 database redirects with 73 static rules and created the 1,813-row companion inventory.
- Verified the official SCCI directory result for IRHA APPARELS / A-101267.
- Searched production Storage object names for SCCI/certificate evidence; none matched.
- Verified HTTP/apex/www redirects, representative conflicting legacy redirects and the advertised API-catalog response.
- No product, taxonomy, private CRM/order, buyer, Storage, Auth, RLS, schema or Edge Function mutation was performed.
- No email source, CMS document or notification-delivery setting was changed because current authority is contradictory.
- No phone-number source was changed.

## Phase 0 conclusion

The live artifact is exactly tied to current GitHub main and the intended Supabase project. Catalogue count and crawler title/canonical/H1 parity are strong. The official `+923204110066` phone is already correct across production and must remain the only number. Public-email authority remains an explicit-decision blocker, while the largest evidence risk is the provisional-certificate detail that cannot be checked against its source document. Redirect, localization and runtime/static duplication remain structural Phase 1 work.

Phase 0 stops here. It does not authorize the broader cleanup or Phase 2 trust architecture.
