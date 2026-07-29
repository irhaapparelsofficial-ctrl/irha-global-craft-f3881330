
# IA-CONTENT-E001 — Buyer-facing internal wording audit (read-only)

Base commit: 9b7f7a2f54ac3804ee096858460f6025eafd9971. No code was edited during this audit. Scope is restricted to buyer-facing wording, imagery fallbacks and branding assets; taxonomy, SEO route parity, and fabric/logistics/NDA/sustainability/company-story/compliance content are out of scope per the request.

## 1. Findings summary

The site has **no per-locale JSON files** (no `src/lib/i18n` or `src/locales`). All copy is either inline English React content or German/French/Dutch strings hard-coded inside `src/lib/marketPages.ts` and inside individual market landing pages. That means "per-locale replacements" below all live in TS source, not translation resources.

Two categories of buyer-facing internal wording remain:

**A. "Digital catalogue reference / Digital reference / Design direction · not production proof" callouts on public pages.** Purpose is honest disclosure but the current density and phrasing reads as internal QA / development state and repeats several times per card and per section. IA-UX-E001 responsive/loading behavior does not depend on these strings — they are pure text overlays and alt-suffixes. IA-UX-E002 media mappings live in `src/lib/categoryMediaRegistry.ts` and are unaffected by the text changes below.

**B. "Newly built website" trust wording on public market/blog/buyer-intent pages.** A build-time sanitizer (`scripts/sanitize-unsupported-trust-copy.mjs`) already rewrites many variants inside `dist/` but only after the fact; the same strings still appear in source and therefore in dev/preview and in any output the sanitizer misses. On admin/outreach/playbook surfaces the phrase is required internal guidance and must remain.

**C. Fallback and offline artifacts.** `public/placeholder.svg` is the **Lovable wordmark SVG** — a clear buyer-visible violation if it is ever rendered. It is still referenced from `src/components/sections/FiveCategories.tsx`, `src/lib/assetResolver.ts` and `src/pages/CanonicalProductDetail.tsx`. `src/lib/imageLoading.ts` renders an inline SVG saying "IMAGE UNAVAILABLE / PRODUCT DETAILS REMAIN AVAILABLE" — acceptable but the copy can be softened.

No occurrences of "Coming soon", "Media pending", "AI generated / AI image / AI concept" (except a required legal clause on `/terms`), "prototype", "demo", "mock" (outside the legitimate Mockup Studio feature name), or "still under development" were found on public pages. Alt text does not use forbidden phrasing beyond the "Digital catalogue reference for …" pattern covered in category A.

## 2. Files needing change (exact paths)

Category A — reduce "Digital reference / not production proof" density on public pages:

- `src/components/HeroCarousel.tsx` (lines 84, 131, 157)
- `src/components/catalog/CatalogListingCard.tsx` (lines 35–36, 49, 105, 114)
- `src/components/sections/HomeCategoryUniverse.tsx` (line 59)
- `src/pages/GlobalCollectionsPage.tsx` (lines 50, 156–157)
- `src/pages/CategoryTaxonomyPage.tsx` (lines 276, 278)
- `src/pages/CanonicalProductDetail.tsx` (lines 188, 329, 505)
- `src/pages/BavarianMensCollection.tsx` (lines 38, 43, 123, 202, 208)
- `src/pages/BavarianWomensCollection.tsx` (lines 38, 43, 123, 192, 198)
- `src/lib/imageSeo.ts` (line 100 — alt normalization prefix)

Category B — remove "newly built website" from buyer-facing surfaces (keep on admin surfaces):

- `src/lib/marketPages.ts` (lines 74, 182, 236, 290, 344 and other DE/FR/NL region bodies containing "newly built" / "neu aufgebaut" / "récemment" / "recent gebouwde")
- `src/lib/blogPostsTrusted.ts` (line 68)
- `src/lib/buyerIntentLandingPages.ts` (line 100)
- `src/pages/AdminLiveChatPro.tsx` (line 77 — quick-reply text visible to buyers when sent; replace with neutral verification wording)

Category C — imagery and fallback assets:

- `public/placeholder.svg` — replace file content with a neutral Irha-branded SVG (dark charcoal card + gold hairline + IA monogram); size and viewBox unchanged so IA-UX-E001 lazy loading and layout math are preserved.
- `src/components/sections/FiveCategories.tsx` (line 65) and `src/lib/assetResolver.ts` (line 43) — switch fallback constant to reuse `CONTROLLED_IMAGE_FALLBACK` from `src/lib/imageLoading.ts` instead of `/placeholder.svg`.
- `src/pages/CanonicalProductDetail.tsx` (line 83) — same substitution.
- `src/lib/imageLoading.ts` — soften copy in `FALLBACK_SVG` from "IMAGE UNAVAILABLE / PRODUCT DETAILS REMAIN AVAILABLE" to "IRHA APPARELS / Product visual loading" (see §3).

Left intentionally unchanged (admin-only or legal, must remain):

- `src/components/admin/*` (SocialPanel, SocialContentPlaybook, AIOperationsPlaybook, OutreachTemplateLibrary, SeoReleaseReadiness) — internal owner guidance.
- `src/lib/businessRules.ts` — internal operating rules consumed by admin AI.
- `src/pages/TermsOfService.tsx` § "AI concept previews" — required legal disclosure.
- `scripts/sanitize-unsupported-trust-copy.mjs` — release guard, retain as a defense-in-depth net.
- `src/test/buyerReadinessContracts.test.ts` assertions about "not production proof" — will need update (see §5).

## 3. Suggested buyer-safe replacements per locale

Category A — public catalogue overlays and alt text:

| Current (EN) | Replacement (EN) |
| --- | --- |
| `Digital reference` (badge) | `Catalogue image` |
| `Digital catalogue reference` (overlay) | `Design catalogue` |
| `Digital catalogue references show design direction only; they are not photographs of completed buyer orders. Materials, construction and finishes are confirmed from the approved specification.` | `Catalogue images illustrate the style. Final material, construction and finish are confirmed from the approved specification.` |
| `Design direction · not production proof` | `Style illustration` |
| `Catalogue reference · not production proof` (card note) | Remove; card body already carries the eyebrow. |
| `Digital catalogue reference for <name>; not production proof` (alt) | `<name> — catalogue image` |
| `Digital catalogue reference for <name>` (alt) | `<name> — catalogue image` |
| `Digital catalogue reference · Made-to-order program` | `Made-to-order program` |

Category B — market pages, apply per locale in `src/lib/marketPages.ts` (DE/FR/NL bodies live there):

| Locale | Current | Replacement |
| --- | --- | --- |
| EN | "Irha Apparels is an experienced manufacturer and the current website is newly built." | "Irha Apparels is a Sialkot-based B2B manufacturer that supports qualified buyers with a live factory video call before commitment." |
| EN | "The website is newly built, but Irha Apparels is not a new manufacturing operation." | "Buyers can request a live factory video call to see the working environment before commitment." |
| EN | "Irha Apparels is an experienced manufacturer with a newly built website." | "Irha Apparels supports qualified buyers with a live factory video call before commitment." |
| EN | "The current website is newly built, while Irha Apparels has manufacturing experience in Sialkot." | "Irha Apparels manufactures from Sialkot and supports qualified buyers with a live factory video call." |
| DE | Any variant containing "neu aufgebaut" / "neu erstellt" | "Irha Apparels ist ein B2B-Hersteller aus Sialkot; qualifizierte Einkäufer können vor jeder Freigabe einen Live-Video-Rundgang durch die Fertigung anfragen." |
| FR | Any variant containing "site récemment construit" / "récent" | "Irha Apparels est un fabricant B2B basé à Sialkot ; les acheteurs qualifiés peuvent demander un appel vidéo en direct de l'usine avant tout engagement." |
| NL | Any variant containing "recent gebouwde website" / "nieuw opgezette" | "Irha Apparels is een B2B-fabrikant in Sialkot; gekwalificeerde inkopers kunnen vóór elke toezegging een live videobezoek aan de fabriek aanvragen." |

Category C — image fallback caption inside `FALLBACK_SVG`:

- Line 1: `IRHA APPARELS`
- Line 2: `Product visual loading`
- Keep viewBox `0 0 1200 1500`, gold hairline frame and colour tokens intact so IA-UX-E001 loading affordance is unchanged visually.

## 4. Branding and favicon inventory

Authoritative logo source (already committed):

- Wordmark: `public/irha-brand-mark.svg` — referenced by `src/lib/publicIdentity.mjs`, `src/lib/siteSettings.ts`, tests in `src/lib/publicIdentity.test.ts`, and JSON-LD `Organization.logo`.
- Owner-supplied crest artwork note: `docs/branding/IRHA_EXACT_LOGO_UPDATE_NOTE.md` and `public/irha-logo-official-source-note.txt` (dated 2026-07-17).
- Rasterized master: `src/assets/irha-logo.png.asset.json` (asset manifest).

Current favicon / app-icon files:

- `public/favicon.ico` (legacy)
- `public/favicon.svg` (linked from `index.html` lines 22–23 as both `icon` and `shortcut icon`)
- `public/icon-512x512.png` (referenced from `public/manifest.webmanifest`)
- `public/manifest.webmanifest` — icons array points at `/favicon.svg` (any) and `/icon-512x512.png` (any, maskable)

No Lovable-branded favicon was found. `public/placeholder.svg` is the only Lovable-branded asset still shipping and it is a **content fallback**, not a favicon — replacing its contents (see §2 Category C) is sufficient.

## 5. Recommended restrained card / fallback treatment

- Cards: keep the existing gold-hairline eyebrow (`Manufacturing category` / `Product category` / `<count> styles`) as the single label. Remove per-card "Digital reference" badges and the small "not production proof" note; retain a single, short "Catalogue image" caption inside `HeroCarousel` and on the taxonomy hero, so buyers still see the honesty statement once per screen rather than four to six times.
- Fallback SVG: retain the current dark-charcoal card, gold hairline frame and small brand hairline. Replace the two text lines with `IRHA APPARELS` / `Product visual loading`. Preserve viewBox and aspect ratio so `ThumbnailImage` / `ResilientImage` skeleton sizing (IA-UX-E001) is unchanged.
- `public/placeholder.svg`: swap file body for a neutral SVG at the same 150×39 viewport (so `<img src="/placeholder.svg">` sites do not layout-shift) containing "IRHA APPARELS" in the gold token colour. This removes the Lovable wordmark from any residual reference without touching IA-UX-E001 sizing.

## 6. Tests and scripts to add or update

Existing tests to update in the same PR:

- `src/test/buyerReadinessContracts.test.ts` — currently asserts `not production proof` and `Digital catalogue reference for` are present (lines 83, 108, 112). Flip these to assert the new phrases (`catalogue image` / `— catalogue image` alt suffix) and keep the negative assertion against "newly built".
- `scripts/finalize-image-seo.mjs` and `scripts/verify-built-image-seo.mjs` — grep the built HTML for `Digital catalogue reference`; update the expected alt phrase to the new suffix so the release guard does not flag the new copy.
- `src/lib/outreachAutomation.test.ts` — already asserts admin drafts never contain "newly built" for buyer-facing emails; keep unchanged.

New tests to add:

- `src/test/iaContentE001Wording.test.ts` — snapshot-free regex test that scans `src/pages/**` and `src/components/**` (excluding `src/components/admin/**`, `src/pages/AdminLiveChatPro.tsx` internal quick replies, and `src/pages/TermsOfService.tsx`) and fails on `newly built`, `Digital reference`, `Digital catalogue reference`, `not production proof`, `Design direction · not production proof`, `Coming soon`, `Media pending`, `AI (generated|image|concept)` and `placeholder\.svg`.
- Extend the existing sanitizer coverage: add one Vitest case that imports `scripts/sanitize-unsupported-trust-copy.mjs`'s `forbiddenPatterns` and asserts the new phrases are also listed, so future drift is caught at build time.

Scripts (do not add new build-time steps beyond the above; sanitizer already runs in `production-smoke.yml` and `quality.yml`).

## 7. Risks

- **Alt-text SEO regression:** shortening product alt from `Digital catalogue reference for <name> made-to-order manufacturing` to `<name> — catalogue image` reduces keyword length. Mitigation: keep `made-to-order` in the surrounding `<figcaption>` / product H1 which are already indexed; the finalizer script and JSON-LD are unaffected.
- **JSON-LD parity:** `src/lib/imageSeo.ts` line 100 short-circuits when alt starts with `Digital catalogue reference`. Update the regex to match the new prefix or drop the short-circuit; otherwise finalized image alts will be double-prefixed.
- **Test snapshots:** `buyerReadinessContracts` and any downstream route-parity shells generated by `scripts/generate-static-redirect-shells.ts` / `scripts/finalize-taxonomy-static-shells.ts` embed the current phrases into HTML — a rebuild is required, but no route changes.
- **Locale coverage completeness:** DE/FR/NL wording lives only inside `marketPages.ts` string literals. There is no fallback translation layer; missing a variant means the English string leaks. Recommend a full-file `rg -n "newly built|neu aufgebaut|récemment|recent gebouwde"` pass at change time to catch every instance before merge.
- **Placeholder swap:** replacing `public/placeholder.svg` body while keeping the file path avoids any consumer breakage, but the file's original viewBox is `0 0 150 39` (wordmark aspect). The three current call sites use it as a square-ish image fallback; the new neutral SVG should render at any aspect via `preserveAspectRatio="xMidYMid meet"` and callers should be migrated to `CONTROLLED_IMAGE_FALLBACK` in the same PR to fully eliminate the aspect mismatch.
- **IA-UX-E002 mappings:** no changes are needed in `categoryMediaRegistry.ts`; every media entry is preserved. Verified by search.

## 8. Out of scope (per request, not modified)

Taxonomy, SEO route parity, `_redirects`, fabric / logistics / NDA / sustainability / company-story / compliance content, Supabase, GitHub Actions, deployment, and any admin surface.
