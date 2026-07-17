# Irha Apparels — Master Audit & 8-PR Roadmap (Plan Mode)

## 0. Build blocker status
`scripts/generate-static-route-shells.ts` no longer emits `/studio`, so `enforce-public-index-policy.mjs build` passes. All subsequent PRs proceed on a green build. **Verify with a fresh `npm run build` as the first act of PR #1.**

---

## 1. Verified current-state audit (evidence-based)

| Fact | Evidence | Value |
|---|---|---|
| Lovable project | build.json | `da72a40a-7df3-44c3-a72d-f180d9ffcd25` |
| GitHub repo | build.json | `irhaapparelsofficial-ctrl/irha-global-craft-f3881330` |
| Frontend runtime Supabase (`.env`) | `.env` VITE_SUPABASE_URL | **`mlefxgyaqoisvdmoiapq`** (archive) |
| build.json declared owner Supabase | build.json | `pvzjiozismyxqrzmtfbi` |
| Lovable chat connector Supabase | `supabase--read_query` succeeded on same DB as `.env` | `mlefxgyaqoisvdmoiapq` |
| Products (DB, connected project) | live query | **64** (all `is_published=true`) |
| Categories | live query | **26** |
| Media assets | live query | **0** |
| Media verified | live query | **0** |
| Inquiries | live query | **0** |
| B2B leads | live query | **0** |
| Blog posts | live query | **0** |
| Sitemap URLs | `grep -c <loc> public/sitemap.xml` | **694** |
| Repository migrations | `ls supabase/migrations` | **167 files** |
| Edge Functions | `ls supabase/functions` | **45 functions** |
| Frontend pages | `ls src/pages` | **65** |
| Admin components | `ls src/components/admin` | **97** |
| Storage buckets | connector | 6 (`inquiry-uploads`, `mockup-uploads`, `social-uploads`, `mockup-cache`, `site-media`, `database_export_12_07_26`) |

### CRITICAL FINDING — Split-brain backend identity
`.env` + Lovable chat connector both resolve to the **archive** project `mlefxgyaqoisvdmoiapq`, while `build.json` / project knowledge assert the runtime should be `pvzjiozismyxqrzmtfbi`. Every count above is from the archive DB. Until this is reconciled, "production" data is ambiguous: media/inquiries/leads may exist on the owner project but are invisible to this Lovable session.

### Other confirmed gaps
- **Media pipeline empty** on the connected project (0 rows in `media_assets`); product galleries are file-system only, not attached to DB records.
- **Product taxonomy shortfall**: 64 products vs 206 target (142 missing), 26 categories vs the 5 main + 16 audience + 103 family = **124-node** target (98 missing nodes).
- **Inquiries table empty** — either archive/no traffic or split-brain.
- **Blog posts = 0** — SEO authority infrastructure not populated.
- **694 sitemap URLs** greatly exceeds real page count (65 pages + products); high risk of shell/URL bloat and thin-content flags.

---

## 2. Gap classification

**Critical (blocks correctness):**
1. Split-brain Supabase identity (owner cutover required).
2. `media_assets` = 0 → no source of truth for product imagery.
3. 142 products + 98 taxonomy nodes missing.

**High:**
4. No verified media workflow gate (media auto-publish risk).
5. No German (de-DE) localized routes with correct hreflang beyond shells.
6. Sitemap bloat (694 URLs) vs actual indexable public routes.
7. Admin lead pipeline present but 0 rows — needs end-to-end smoke.

**Medium:**
8. Blog / OEM authority content = 0.
9. Trust/certifications CMS surfaces exist but unpopulated (must remain Pending until verified).
10. Image-sitemap + responsive variants incomplete without media_assets rows.

**Low:**
11. Cleanup of legacy `/studio`, `/de/bavarian-wear`, and other retired shells (partially done).
12. Chunk-size / LCP polish on non-home routes.

---

## 3. The 8-PR Roadmap (sequenced, reviewable, no direct-to-main)

Each PR: branch `feat/pr-N-<slug>`, opens PR against `main`, requires green CI (build + tests + Quality Gate + Supabase linter + production smoke on preview) before merge. Owner approval is a hard gate between PRs.

### PR #1 — Foundation & Backend Identity Cutover  *(owner-gated)*
- **Purpose:** Resolve split-brain; make `pvzjiozismyxqrzmtfbi` the single source of truth for Lovable connector, `.env`, edge functions, storage.
- **Owner manual step:** disconnect archive backend, connect `pvzjiozismyxqrzmtfbi` in the Lovable Backend UI.
- **Files:** `.env` (regenerated), `docs/BACKEND_CUTOVER_2026_07_17.md`, verification scripts under `scripts/verify-deployment-source.mjs`.
- **DB:** no schema change; run `supabase--linter` + snapshot counts on target.
- **Tests:** `production-smoke-v2.mjs`, `verify-secret-safety`, `verify-migration-order`.
- **Risk:** live data mismatch. **Rollback:** re-point `.env` to archive; connector back to archive.
- **DoD:** `supabase--project_info` returns `pvzjiozismyxqrzmtfbi`; owner-project counts documented; smoke green.

### PR #2 — Schema Consolidation & Media Pipeline Hardening
- **Purpose:** Ensure `products.status` alignment, `media_assets` grants/RLS, `product_media` link table if missing, `review_required` default enforced.
- **Migrations:** additive columns/indexes only; verify triggers `media_assets_before_write` remain intact; add `product_media (product_id, media_asset_id, role, sort_order)` with RLS + grants.
- **Files:** new migration in `supabase/migrations/`, updates in `src/hooks/usePublicCatalog.ts`, admin media review panel.
- **Risk:** breaking existing frontend queries. **Rollback:** `DROP TABLE product_media` migration; revert hook.
- **DoD:** admin can attach a media_asset to a product; public API only returns verified attached media.

### PR #3 — Taxonomy Rebuild (5 → 16 → 103)
- **Purpose:** Insert missing categories/audience groups/product families to reach 124 nodes; back-map existing 64 products to correct nodes.
- **Data changes:** `INSERT` via insert-tool batches into `categories` (kind: main/audience/family); mapping table `category_migration_map` for audit.
- **Files:** `src/lib/globalCategoryTaxonomy.ts` (source of truth), `scripts/reconcile-repository-migrations.mjs`, taxonomy tests.
- **Redirects:** every renamed URL added to `_redirects` / worker route table.
- **Risk:** 404s. **Rollback:** restore prior taxonomy snapshot from PR #1 export.
- **DoD:** navigating current 64 products still resolves; taxonomy tree = 5/16/103; sitemap regenerated < 700 URLs.

### PR #4 — Product Catalogue Fill-out to 206 (Draft-first)
- **Purpose:** Create 142 missing products as **Draft/Review Required**; owner-approved batches promote to Published.
- **Batches:** Bavarian, Sportswear, Leatherwear, Streetwear/Activewear, Sleepwear/Loungewear (report per batch: created, attached, pending, failures).
- **Files:** batch JSON under `scripts/product-media-batch-*.json`, admin product duplicate/publish flow.
- **DoD:** 206 rows in `products`; only verified rows visible publicly.

### PR #5 — Media Generation, Review, Attachment
- **Purpose:** Produce 6-view sets per product using genuine media first, AI fill only where missing; every render `review_required`.
- **Rules encoded:** consistent garment identity across angles, watermark = uploaded official crest, alt text + width/height + responsive variants + image sitemap.
- **Files:** `scripts/generate_*.py`, `scripts/sync_product_media.py`, admin `MediaReviewQueue`, storage policies on `site-media`.
- **DoD:** per-batch approval report; no auto-publish; image sitemap regenerates on approval.

### PR #6 — SEO, German Localization, International Architecture
- **Purpose:** Localized routes `/de/*`, hreflang, localized structured data, buyer-intent titles (manufacturer/OEM/ODM/private label/wholesale). Editorial review gate for machine German.
- **Files:** `scripts/generate-sitemap.ts`, `src/pages/LocalizedSeoPage.tsx`, `seo_localized_pages` DB rows via insert-tool, `functions/_middleware.js` hreflang.
- **DoD:** Lighthouse SEO ≥95 on 10 sampled routes; hreflang symmetric; German pages behind `noindex` until editorial approval flips flag.

### PR #7 — Lead / RFQ / Inquiry / Admin CRM End-to-End
- **Purpose:** Verify inquiry wizard → `inquiries` insert → validation trigger → `inquiry-uploads` signed URLs → admin CRM panel → assignee/priority/status → email queue (drafts only until provider verified).
- **Files:** `src/pages/Inquiry.tsx`, `src/components/admin/LeadsPanel.tsx`, edge function `public-lead-gateway`, rate-limit RPC.
- **DoD:** synthetic RFQ round-trips end-to-end on preview; owner-approval gates remain on outbound.

### PR #8 — Production Verification, Rollback Drills, Publish
- **Purpose:** Full production smoke, backup snapshot, rollback rehearsal, IndexNow ping, Cloudflare cache purge, publish.
- **Files:** `.github/workflows/production-smoke.yml`, `scripts/production-smoke-v2.mjs`, `scripts/ping-search-engines.mjs`.
- **DoD:** green smoke on `irhaapparels.com`; recorded backup ID; rollback runbook attached; owner clicks Publish.

---

## 4. Product/taxonomy migration & mapping strategy
- Build `category_migration_map(old_slug, new_slug, node_kind, notes)` and populate before renaming any category.
- All URL changes emit 301 in `functions/_middleware.js` and `_redirects`.
- Products keep stable `id` + `sku`; only `category_id` and slug change, recorded in audit.

## 5. Media strategy
Genuine-first → AI-fill → owner-approve → attach → publish. Every generated file lands in `site-media/review/<batch>/` with `verification_status='pending'`; only owner promotion flips to `verified` + attaches to product gallery. Watermark uses the exact uploaded crest asset; no substitutions.

## 6. SEO / German rollout
- Wave A: EN canonical + schema + sitemap sanitation (PR #6a inside PR #6).
- Wave B: `/de/*` shells `noindex,follow` until native-speaker review row in `seo_localized_pages.review_status='approved'` — worker flips to `index,follow` automatically.

## 7. Backup & rollback
- Before PR #2 migration: `Cloud → Advanced → Export data` snapshot + record ID in `docs/BACKUPS.md`.
- Every PR migration ships a paired down-migration or additive-only change.
- Frontend rollback: Lovable version history + `main` revert commit.

## 8. Deployment & live verification
- CI on every PR: typecheck, unit tests, `npm run build`, `enforce-public-index-policy`, `verify-migration-order`, `production-smoke-v2 --preview`.
- Post-merge to `main`: Cloudflare Pages auto-deploy → wait-for-release → production smoke → IndexNow ping.

## 9. Definition of Done
- **Frontend:** all routes 200, Core Web Vitals pass on 4G, no console errors, no template metadata.
- **Backend:** owner project = source of truth, RLS + GRANTs verified, linter clean of critical.
- **Admin:** product CRUD, media review, lead pipeline, taxonomy assignment all functional against owner project.
- **Media:** every published product has ≥4 verified images + alt text + dimensions; image sitemap covers them.
- **SEO:** hreflang symmetric, sitemap = real indexable URLs, JSON-LD valid, no fabricated trust claims.
- **Production:** smoke green, rollback rehearsed, owner-approved publish.

## 10. Blockers requiring owner action (before PR #1 can complete)
1. **Backend cutover** in Lovable Backend UI to `pvzjiozismyxqrzmtfbi` (only owner can OAuth).
2. **Upload official Irha Apparels navy-and-gold crest** in this chat.
3. Confirm provider readiness (Gmail send, Meta, WhatsApp, LinkedIn) or accept Drafts-only mode.
4. Approve `ai_business_rules` JSON before automation is enabled.
5. Explicit approval to run schema migrations against owner project.

---

**Awaiting explicit approval to begin PR #1.** Do not proceed to PR #2+ without a separate approval per phase.
