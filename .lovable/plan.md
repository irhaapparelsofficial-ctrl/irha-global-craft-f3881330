# Catalog Rebuild — Decisions Locked

You confirmed: **no regen cap**, **CDN hosting**, **delete everything and replace**. Here is what I will execute next, in one continuous run.

## Scope confirmed
- 559 source images extracted from your 6 ZIPs (~849 MB)
- 6 categories: Bavarian, Leatherwear, Sportswear, Streetwear, Leisurewear, Nightwear
- Filenames encode product + view angle (front / back / side / three-quarter / folded / macro detail)
- Existing DB has hardcoded arrays in `src/lib/categories.ts`, `catalog.ts`, `featuredProducts.ts` + populated `categories` / `products` tables → all gets wiped.

## Pipeline (automated, end-to-end)

```text
1. PARSE        559 filenames → {category, product, view} JSON manifest
2. GROUP        collapse to ~120-160 unique products, each with 1-4 views + macro
3. UPLOAD       every keeper image → Lovable CDN via lovable-assets CLI
                → produces 559 .asset.json pointers, zero binaries in repo
4. BACKUP       snapshot current categories + products to *_backup_2026_06 tables
5. WIPE         TRUNCATE products, categories (cascade)
6. SEED         INSERT new categories (6) + sub-categories + products with CDN URLs
7. REFACTOR     replace hardcoded src/lib/categories.ts + catalog.ts + featuredProducts.ts
                with DB-driven loaders (useCategories hook already exists)
8. SEO          regenerate sitemap.xml from new DB rows
9. QA           build, smoke-test category pages, verify no broken images
```

## Time estimate
- Upload phase is the bottleneck: 559 sequential CLI calls ≈ 25-40 min wall clock.
- Parsing + DB seed + refactor ≈ 10 min.
- I will stream progress as it goes; if a step fails I stop and surface it, no silent skips.

## What will be deleted (irreversible from chat — only revertable via History tab)
- All rows in `public.categories`
- All rows in `public.products`
- Hardcoded product/category arrays in `src/lib/*.ts`
- Local image binaries in `src/assets/cat-*.jpg` and product galleries (replaced by CDN pointers)

## What stays untouched
- Homepage, hero, About, Contact, FAQ, Blog, Studio, Admin panel structure
- Supabase schema (only data is wiped, no column changes)
- Auth, leads, social, mailing, PI generator features
- 6 category catalog flipbooks in `/public/catalogs/` (separate PDF artifacts)

## One technical note (non-blocking)
Your `categories` table already has the right shape (`slug`, `name`, `image_url`, `details[]`, etc.) and `products` already has `gallery[]`, `specs[]`, `details` jsonb. Zero schema changes needed — only data + frontend refactor.

---

**Reply "go" and I start the pipeline immediately. It will run for ~40 min with progress updates. Reply with any changes to scope first if you want to adjust.**
