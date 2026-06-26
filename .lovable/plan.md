# B2B Custom Lab — /studio rebuild

Replace the existing FOB calculator + sketch pad with a real-product, 4-click custom-lab flow. Keep the route `/studio` so the homepage "Launch AI Mockup Studio" button keeps working.

## 1. Data layer

- **No products schema change.** Read all 64 products from the existing `products` table joined to `categories`.
- **New helper `src/lib/customLab.ts`:**
  - `HUBS` map: `bavarian` → category slugs `[lederhosen-trachten, bundhosen, bavarian-shirts, vests, leather-jackets]`; `textile` → `[sportswear, leisurewear, activewear, nightwear, hoodies, tees]`. (Final slugs resolved against DB on first read — log + skip any that don't exist instead of crashing.)
  - `CATEGORY_COLORS`: fixed 6-color palette per category (Black `#0a0a0a`, Charcoal `#2b2b2b`, Navy `#1b2a4a`, Olive `#4b5320`, Burgundy `#5e1a1a`, Natural `#d9c9a8`). Leather categories swap Natural → Cognac `#7a4a23`.
  - `EMBROIDERY_PRESETS`: 5 presets per hub (e.g. Bavarian: Edelweiss, Oak Leaf, Alpine Crest, Monogram Block, Heritage Script; Textile: Sport Block, Athletic Script, Minimal Mark, Circle Crest, Bold Outline). Stored as `{ id, label, description }`.
  - `PLACEMENTS`: `left-chest`, `center-back`, `right-sleeve`.

## 2. Server-side mockup generation

- **New edge function `supabase/functions/generate-mockup/index.ts`:**
  - Input: `{ productId, color, placement, presetId, logoBase64? }`.
  - Loads product image URL from DB. Computes deterministic cache key: `sha256(productId|color|placement|presetId|logoHash|view)`.
  - **Cache:** new public storage bucket `mockup-cache`. On hit, return signed/public URL immediately.
  - On miss: call Lovable AI Gateway `google/gemini-3.1-flash-image` with the product image as input + a prompt describing the recolor, embroidery preset, and placement. Generates front view; second call with prompt "show back view of the same garment with logo at center back" produces back view.
  - Uploads both PNGs to `mockup-cache`, returns `{ frontUrl, backUrl }`.
  - CORS open; no JWT required.
- **New storage bucket** via `storage_create_bucket` (public). Service-role write from edge function.

## 3. UI rebuild — `src/pages/Studio.tsx`

Dark theme, mobile-first. Remove `StudioPricingPanel`, `MockupSketchPad`, `ProductConfigurator` from the page (leave files in place but unimported — safer than deleting).

Layout (single column on mobile, 2-col on lg):

1. **Hub toggle** — sticky top: `[ BAVARIAN HERITAGE ] [ TEXTILE & ACTIVE ]`.
2. **Step rail** showing 1·Product → 2·Color → 3·Logo → 4·Pattern → Generate.
3. **Step 1 — Product grid:** filtered by hub. Real CDN thumbnails, category chips above to narrow further. Click selects.
4. **Step 2 — Color swatches:** 6 swatches sourced from `CATEGORY_COLORS[product.category]`.
5. **Step 3 — Logo upload + placement:** file input (PNG/SVG, max 2MB, read as base64 in browser). Three placement buttons.
6. **Step 4 — Pattern preset:** 5 cards per hub.
7. **Generate** button → calls edge function → renders Front + Back side-by-side with skeleton shimmer.
8. **Result actions:**
   - `Download PNG` — fetches each URL, triggers download via existing `forceDownload`.
   - `Send to WhatsApp` — opens `https://wa.me/923204110066?text=` with prefilled body: `Custom Design: <Product> | Color: <Color> | Logo: <placement> | Pattern: <preset> | Qty: 50+ | Please send FOB Sialkot quote.`
9. **MOQ badge** rendered persistently: `MOQ 50 — Request FOB Quote`. No prices anywhere.

## 4. Homepage button safety

`LederhosenHome.tsx` "Launch AI Mockup Studio" already links to `/studio`. Verify the href is intact post-edit — no other change needed.

## 5. Verification

- `bun run build` must pass.
- Manual smoke via Playwright: load `/studio`, switch hubs, walk one flow, assert Generate POSTs to edge function and renders two images.
- Publish.

## Out of scope / explicitly removed

- FOB pricing (`StudioPricingPanel`, `fobCalculator`, master FOB) — unimported from `/studio`. Other pages that use them stay untouched.
- Drag-drop logo positioning. Placement is preset.
- Login / auth. Public route.
