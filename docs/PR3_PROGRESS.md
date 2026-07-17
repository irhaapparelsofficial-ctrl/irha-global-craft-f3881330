# PR #3 — Public routing gate, admin taxonomy review, SEO foundation, legacy redirect registry

**Depends on:** PR #2 catalogue foundation (accepted at commit f6dce3238a082125793259af787f4c65a8e44a3c).

**Non-goals:** does not publish any draft slot; does not generate final product media; does not apply destructive database changes.

## Files changed

| Path | Purpose |
|---|---|
| `src/lib/plannedCatalogRouting.ts` | Pure resolver: URL → manifest node → `approved-*` / `planned-*` / `not-in-manifest`. `enumerateApprovedRoutes()` for sitemap + tests. |
| `src/lib/plannedCatalogRouting.test.ts` | 8 assertions covering segment extraction, gates, sitemap enumeration. |
| `src/lib/seoStructuredData.ts` | BreadcrumbList / Organization / CollectionPage / Product JSON-LD helpers, apex-only URLs, no fabricated fields. |
| `src/lib/seoStructuredData.test.ts` | 6 assertions including "Product schema returns null unless approved + media approved". |
| `src/components/catalog/PlannedCatalogGate.tsx` | Thin wrapper that renders `NotFound` + `<meta robots noindex,nofollow>` when the URL resolves to a `planned-family` or `planned-slot`. Falls through for all other paths. |
| `src/lib/legacyRedirects.ts` | Static rule set with `resolveStaticRedirect` and `hasLoopOrSelfRedirect`; every rule marked `auto` confidence. |
| `src/lib/legacyRedirects.test.ts` | Loop detection, uniqueness, no self-redirects. |
| `src/pages/AdminTaxonomyReview.tsx` | Admin queue: filter by main / audience / review state / missing media; approve / reject / reopen; posts to `product_taxonomy_assignments`. |
| `src/App.tsx` | Wire `/admin/taxonomy-review` and wrap the public `<Route path="*">` tree with `PlannedCatalogGate`. |
| `supabase/migrations/20260719000000_legacy_route_redirects_registry.sql` | New `legacy_route_redirects` table, RLS, admin queue view for uncertain rules. Non-destructive: idempotent, no product/taxonomy row mutations. |
| `scripts/generate-sitemap.ts` | Audited — draft slots never enter `entries` because they never leave the manifest as `approved`. `enumerateApprovedRoutes()` from the new resolver is available for future family/slot batches to opt in. |

## Public-routing gate contract

`resolveManifestPath(pathname)` returns one of:

| status | Public HTTP | robots | Notes |
|---|---|---|---|
| `not-in-manifest` | pass-through | inherited | existing catalog pages keep rendering |
| `approved-main` / `approved-audience` / `approved-family` / `approved-slot` | 200 | index,follow | requires every ancestor `draftStatus === "approved"` and `isSlotPublishable(slot)` for slots |
| `planned-family` / `planned-slot` | 404 shell | **noindex, nofollow** | draft, missing media, or unapproved slots never leak |

Manifest currently ships spine-only (5 mains, 0 audiences, 0 families, 0 slots). `enumerateApprovedRoutes()` returns exactly `/products/<main>` for the 5 approved mains — no draft placeholders.

## SEO foundation

- Canonical + og:url self-reference the apex origin (`https://irhaapparels.com`); no `www`.
- Breadcrumb JSON-LD uses `BreadcrumbList` with 1-indexed `ListItem`s.
- Organization JSON-LD carries legal name + apex URL + logo; no invented awards or metrics.
- Product JSON-LD is emitted **only** when the slot is owner-approved, published, media-approved, AND an approved image URL is supplied. Never emits `offers`, `price`, `availability`, `aggregateRating`, `review`, `gtin*`, `mpn`.
- CollectionPage JSON-LD for approved main / audience / family pages, no counts.

## Legacy redirect system

Non-destructive migration adds `public.legacy_route_redirects (id, from_path unique, to_path, confidence in ('auto','review'), reason, created_by, approved_by, approved_at, created_at, updated_at)` plus RLS (admin write, public read of approved-only) and a read-only admin queue view `admin_legacy_redirect_queue` listing every rule with `confidence = 'review'`.

Auto-seeded content: the 30 static rules already in `src/lib/legacyRedirects.ts` (mirrors the working `LEGACY_REDIRECTS` in `src/App.tsx`). Nothing speculative is auto-mapped.

## Test / build results

```
$ bunx vitest run src/lib/plannedCatalogRouting src/lib/seoStructuredData src/lib/legacyRedirects
Test Files  3 passed (3)
     Tests  22 passed (22)
```

Typecheck (`tsgo --noEmit`) on the added files: clean.

Route smoke test (bare Vite dev boot check):

```
$ bun run typecheck && bun run build
```

## Known blockers / deferred items

- **Not blocking:** manifest is currently spine-only. Family + slot rows land through reviewed release batches, not this PR.
- **Deferred to owner:** applying `20260719000000_legacy_route_redirects_registry.sql` on `pvzjiozismyxqrzmtfbi` via `supabase-owner-release.yml` with `APPLY_SUPABASE_RELEASE`.
- **Deferred to owner:** rotating any redirect rule from `confidence='review'` to `confidence='auto'` once verified.

## PR #4 scope

1. Admin catalogue completion workflow: per-slot draft editor (working title → owner-approved name, factual description, taxonomy re-assign, media attach, publish gate). Reads/writes `products`, `catalog_taxonomy_nodes`, `product_taxonomy_assignments`, `media_assets`.
2. Media-production pipeline preparation: brief/spec table (`media_generation_briefs`), queue view (`admin_media_generation_queue`), owner-approval hooks. **No final image generation yet.**
3. Content completion audit dashboard: shows which of the 206 planned slots are blocked on which of {media, description, specs, taxonomy approval, owner sign-off}.
4. Route publish helper: `publishSlot(id)` server function that only succeeds when every gate returns green.
