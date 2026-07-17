# Official Logo Intake — Plan

Register the uploaded `IMG_3122.jpeg` as the single, canonical Irha Apparels brand mark. This slots into PR #1 (Foundation) of the approved 8-PR roadmap — no visual redesign, no substitutions.

## Steps
1. **Ingest via Lovable Assets CDN** (immutable, no binary in repo):
   ```
   lovable-assets create --file /mnt/user-uploads/IMG_3122.jpeg \
     --filename irha-apparels-official-crest.jpeg \
     > src/assets/irha-apparels-official-crest.jpeg.asset.json
   ```
2. **Add a single source-of-truth module** `src/lib/brandAssets.ts` that re-exports the pointer as `OFFICIAL_LOGO_URL` and `OFFICIAL_LOGO_ALT = "Irha Apparels — Manufacturing Specialists"`. All watermarks, banners, cards, hang tags, woven-label mockups, neck labels, care labels, packaging, and OG assets import from here — no other logo path is permitted.
3. **Retire legacy marks**:
   - Deprecate references to `public/irha-brand-mark.svg` and `src/assets/irha-logo.png.asset.json` behind a re-export from `brandAssets.ts` (kept for one PR cycle to avoid broken imports, then removed in PR #2).
   - Add lint guard in `scripts/verify-secret-safety.mjs` (or new `scripts/verify-brand-mark.mjs`) that fails CI if any component imports a non-canonical logo path.
4. **Watermark pipeline** (used later in PR #5 media generation): store the same asset URL in a new row-less constant `WATERMARK_SOURCE_URL`; the Python renderer downloads once, caches under `scripts/image-ai/.cache/`, applies at fixed opacity/position across all 6-view product renders.
5. **Update head + PWA metadata** in `index.html` and `public/manifest.webmanifest` to reference the CDN URL (via a small build-time inline of the pointer's `.url`).
6. **Note in `docs/BACKEND_CUTOVER_2026_07_17.md`** that logo intake is complete; block PR #5 from starting until this file exists.

## What this plan does NOT do
- No auto-application to product images (that's PR #5, owner-approved per batch).
- No favicon change (default retained until you explicitly ask).
- No redesign, recolor, or vector redraw of the crest.

## Files changed
- `src/assets/irha-apparels-official-crest.jpeg.asset.json` (new pointer, ~400 bytes)
- `src/lib/brandAssets.ts` (new, ~15 lines)
- `scripts/verify-brand-mark.mjs` (new lint guard)
- `index.html`, `public/manifest.webmanifest` (metadata updates)
- `docs/BACKEND_CUTOVER_2026_07_17.md` (checklist tick)

## Rollback
Delete the asset pointer with `lovable-assets delete --file src/assets/irha-apparels-official-crest.jpeg.asset.json` and revert the three code files. No DB or storage impact.

## Definition of Done
- CDN pointer resolves in dev preview.
- `rg -n "irha-brand-mark\|irha-logo\.png" src/` returns only the new re-export shim.
- CI brand-mark guard passes.
- Owner sees the exact uploaded crest in header preview (no color shift, no crop).

Awaiting approval to execute.
