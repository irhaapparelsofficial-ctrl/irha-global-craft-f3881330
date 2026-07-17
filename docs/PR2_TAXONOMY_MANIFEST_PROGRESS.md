# PR #2 — Catalog Taxonomy Manifest + 206 Planned Slots

**Scope:** Main Category → Audience Group → Product Type (Family) → Product Slot.
**Ships:** manifest source-of-truth, deterministic seed migration, admin missing-media queue view, automated tests. Non-public planning records only.

## Locked capacity (all verified by tests)

| Metric | Value |
|---|---|
| Main categories | **5** |
| Product families | **103** |
| Planned product slots | **206** (2 per family: Design 01 / Design 02) |
| Slots ready for publication | **0** (correct — all draft/unpublished/missing media) |

## Family count by main category

| Main category | Families | Slots |
|---|---:|---:|
| Bavarian & Trachten Wear | 22 | 44 |
| Premium Leather Apparel | 20 | 40 |
| Sportswear | 22 | 44 |
| Streetwear & Activewear | 20 | 40 |
| Leisure & Nightwear | 19 | 38 |
| **Total** | **103** | **206** |

## Files changed

| Path | Purpose |
|---|---|
| `src/lib/catalogTaxonomyManifest.ts` | Manifest source of truth: 5 mains, 103 families, 206 typed slots, canonical/breadcrumb/reference-code helpers, `isSlotPublishable` gate. |
| `src/lib/catalogTaxonomyManifest.test.ts` | 10 vitest assertions: counts, uniqueness, ref-code pattern, no publishable slots, parent-child integrity, apex-only canonical URLs. |
| `scripts/emit-taxonomy-seed.ts` | Deterministic manifest → SQL emitter. Idempotent re-run supported. |
| `supabase/migrations/20260718000000_seed_planned_taxonomy_206_slots.sql` | 5 main-category nodes (idempotent w/ foundation) + 22 audience nodes + 103 product-type nodes + 206 product slots + 206 proposed taxonomy assignments + `admin_missing_media_queue` view. All `ON CONFLICT DO NOTHING`. |
| `docs/PR2_TAXONOMY_MANIFEST_PROGRESS.md` | This tracker. |

## Reference-code scheme

`IRHA-<MAIN>-<AUD>-F<NN>-<NNN>` (regex enforced).

- MAIN: `BAV`, `LEA`, `SPT`, `STR`, `LEI`
- AUD: `MEN`, `WMN`, `KDS`, `UNI`, `TEA`, `FAM`, `ACC`
- F<NN>: 1-based family position within its main (F01–F22)
- NNN: design index 001 / 002

Example: `IRHA-BAV-MEN-F01-001` → Men's Short Lederhosen — Design 01 (Planned).

## Non-fabrication guarantees

- Every slot ships `is_published=false`, `gallery='{}'`, `image_url=NULL`, `specs='{}'`, `details='{}'`. No invented material composition, MOQ, lead time, pricing, certification, buyer proof, capacity or stock status.
- Working titles use the pattern `"<Family Name> — Design NN (Planned)"` — explicitly marked as planning records.
- `product_taxonomy_assignments.review_state = 'proposed'` on every row; publication requires owner approval workflow already committed in migrations `20260717235100`–`20260717235200`.

## Admin missing-media queue

`public.admin_missing_media_queue` — read-only view. On seed apply, all 206 slots appear with `media_status='missing'`. As media is attached and reviewed, rows transition to `pending_review` → `approved` and drop off the queue.

## Test / build results

```
$ bunx vitest run src/lib/catalogTaxonomyManifest
Test Files  1 passed (1)
     Tests  10 passed (10)
```

## Deployment

The migration file is committed but NOT applied by this PR. Application on the owner project `pvzjiozismyxqrzmtfbi` is gated on `supabase-owner-release.yml` with the manual `APPLY_SUPABASE_RELEASE` input, per project rules.

## PR #3 — next foundation phase

Not started. Planned scope:

1. Public routing: React Router routes for `/main/audience/product-type` (family landing) and `/main/audience/product-type/slot` (slot detail). Family pages render when parent nodes are approved; slot pages remain 404 until `isSlotPublishable`.
2. Admin taxonomy assignment UI wired to `product_taxonomy_assignments` (approve / re-assign / reject).
3. Redirect table for legacy URLs — awaits owner list.
4. Canonical + hreflang + JSON-LD emission per family/slot.

Media generation (official crest, branded tags, cards, banners, woven labels) is explicitly deferred to a dedicated media PR after PR #3.
