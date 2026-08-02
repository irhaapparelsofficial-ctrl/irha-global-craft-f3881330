# IA-BRAND-MASTER-E001 — Official brand master evidence

Goal lock: `IRHA-OFFICIAL-BRAND-MASTER-01`

## Authoritative owner upload

The current official Irha Apparels logo is the exact circular navy-and-gold crest supplied by the owner in the IA-BRAND-MASTER-E001 execution chat. It contains `IRHA APPARELS` and `MANUFACTURING SPECIALISTS` around the detailed central shield.

- Repository master: `public/brand/irha-apparels-official-master.png`
- SHA-256: `32eee79bc7038c53cff36bab46193c77e78702d7eef7883e8f94b145999a1b87`
- MIME: `image/png`
- Dimensions: `1024 × 1024`
- File size: `1,023,183 bytes`
- Source: exact owner-uploaded file from the execution chat

The repository master is preserved byte-for-byte. It is not redrawn, regenerated, approximated or replaced by AI-generated artwork.

## Historical classification retired

PR #825 and the IA-BRAND-VISUAL-E001 history classified the then-existing square/historical icon lineage, including `public/icon-192x192.png` and `public/icon-512x512.png`, as the owner crest. The owner subsequently confirmed that artwork was not the actual official company logo.

That historical classification is **superseded and is not authoritative**. Historical source evidence may remain for audit history, but the historical artwork must not be used as the active header, footer, fallback, favicon, Apple or PWA brand source.

## Corrected source-of-truth contract

- `src/lib/brandAssets.ts` exposes the immutable official master identity and routes header, footer and controlled fallback through `/brand/irha-apparels-official-runtime-512.png`.
- `scripts/generate-official-brand-assets.mjs` generates the runtime, favicon, Apple-touch and PWA derivatives from the exact locked master using `sharp`, `fit: contain`, Lanczos3 resizing, no crop and no stretch.
- `public/brand/brand-master.json` records generation provenance and derivative hashes.
- `src/test/brandMasterContract.test.ts` locks the exact master SHA-256, file size, successful PNG decode, dimensions, derivative pixel lineage, Navbar, Footer, controlled fallback, favicon/PWA metadata and production verification contract.
- The brand cache version is `ia-brand-master-e001-20260802-32eee79b`, so normal runtime requests do not reuse the previous brand cache key.
- The Organization/public identity logo URL points to the official runtime derivative rather than the historical compatibility asset.

## Scope safety

This execution does not authorize product-media changes, Supabase database/Storage mutation, taxonomy/category changes, homepage redesign, SEO-copy changes, localization changes, pricing/MOQ changes or Cloudflare security weakening.
