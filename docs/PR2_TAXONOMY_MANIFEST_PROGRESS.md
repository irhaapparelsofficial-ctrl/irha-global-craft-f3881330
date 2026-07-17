# PR #2 — Catalog Taxonomy Manifest Progress

Scope: Main Category → Audience Group → Product Type → Product.

Target capacity (locked in `src/lib/catalogTaxonomyManifest.ts`):

- 5 main categories
- 103 product families (Product Type nodes)
- 206 planned product records / slots

## Foundation status

| Item | State | Evidence |
|---|---|---|
| `public.catalog_taxonomy_nodes` table | Migration committed | `supabase/migrations/20260717230000_explicit_catalog_taxonomy_foundation.sql` |
| `public.product_taxonomy_assignments` | Migration committed | same file |
| Leaf-guard, RLS optimization, owner release, review/approval, verified publication | Committed | `supabase/migrations/2026071723{0500,4000,5000,5100,5200}_*.sql` |
| 5 main categories | Verified against `public.categories` (parent_id IS NULL) | Slugs: `bavarian-trachten-wear`, `premium-leather-apparel`, `sportswear`, `streetwear-activewear`, `leisure-nightwear` |
| Manifest contract | Committed | `src/lib/catalogTaxonomyManifest.ts` |
| Draft / review / publish states | Enforced in manifest types + `catalog_taxonomy_nodes.publish_state` CHECK | — |
| Reference code format | `IRHA-<MAIN>-<AUDIENCE>-<TYPE>-<NNN>` (regex enforced) | manifest |
| Canonical URL builder | Apex-only, no www | manifest |
| Breadcrumbs builder | Derived from `fullSlugPath` | manifest |
| Missing-media queue | Computable from `mediaStatus` per slot | manifest |
| No fake public content | Slots default to `draft` + `unpublished` + `missing` | manifest |
| Auto-publish blocked on incomplete slots | `isSlotPublishable()` requires all four green | manifest |

## Owner-input required (non-fabricated)

To respect the "never invent" rule, the following data does not exist in
the repository and must be supplied by the owner in reviewed batches.
Each batch lands as a SQL seed migration through
`supabase-owner-release.yml`, never as a chat-side fabrication.

Per main category, the owner supplies:

1. The audience groups actually offered under that main.
2. The product-type (family) slugs and display names for that audience —
   summing to 103 families across all mains.
3. The individual product slot list — summing to 206 slots — with the
   working title, slug, and IRHA reference code per slot.
4. Any legacy URLs that must 301 to the new canonical path.

## Deferred verification checkpoints (from R2 runbook)

These do not block PR #2. See
`docs/BACKEND_CUTOVER_2026_07_17_R2.md` §3 for the owner-side list.

## PR #2 acceptance checklist

- [x] Manifest contract + types committed
- [x] 5 main categories verified against DB
- [x] Draft / review / publish states enforced end-to-end
- [x] Reference code format enforced
- [x] Canonical URL + breadcrumb helpers
- [x] Missing-media queue derivable per slot
- [ ] 103 family rows seeded (awaits owner batches)
- [ ] 206 product slot rows seeded (awaits owner batches)
- [ ] Admin taxonomy-assignment UI wired to `product_taxonomy_assignments`
- [ ] Redirect table entries for legacy URLs (awaits owner list)
