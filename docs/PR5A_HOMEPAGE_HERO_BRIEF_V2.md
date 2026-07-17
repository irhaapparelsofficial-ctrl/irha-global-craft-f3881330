# PR #5A · Homepage Hero — Corrected Brief V2

**Status:** Draft brief · Not for public wiring · Awaiting admin-approved candidate

## Rejection ledger

| File | Rejected on | Reason |
|---|---|---|
| `src/assets/hero-b2b-manufacturer-desktop.jpg` | 2026-07-17 | Generic suit-only concept; does not represent multi-category B2B manufacturing |
| `src/assets/hero-b2b-manufacturer-mobile.jpg` | 2026-07-17 | Generic suit-only concept; does not represent multi-category B2B manufacturing |

Both files were deleted from `src/assets/`. The backdrop `<picture>` block was
removed from `src/components/HeroCarousel.tsx`. Placement rows in
`src/lib/siteMediaPlacementManifest.ts` were flipped to
`localAssetStatus: "unassigned"` with `reviewNote` capturing the rejection.

No hero image is currently wired to the homepage. The hero section keeps its
solid `bg-background` + gradient/grid overlays until an approved candidate
lands.

## Direction — priority order

1. **Reuse a verified real Irha factory/product composite** if one exists in
   `media_assets` with `verification_status = 'verified'` and
   `social_approved = true`. It must show a factual multi-category mix
   (Bavarian/Trachten, sportswear, leatherwear, streetwear/activewear,
   nightwear/private-label) and stitching/labels/tags/materials details.
2. **If no verified real composite exists**, commission one restrained
   premium studio composition per the spec below and route it through
   Admin → Media Approval before wiring.

## Composition spec

### Desktop (21:9, LCP eligible)

- Canvas: 2560×1097 (or 1920×822). Deliver a 16:9 fallback at 1920×1080.
- Background: deep charcoal / near-black premium studio; soft directional
  key light; no glare, no watermarks.
- Subject mass: right / lower-right third only. Left ~55% clear for
  headline (`B2B Apparel Manufacturer for Brands & Wholesalers`) and the
  `Request a Quote` CTA.
- Depth: shallow tabletop / flatlay perspective at ~25° — objects arranged
  as a curated buyer's tray, not a shop display.

### Mobile (4:5)

- Canvas: 1280×1600.
- Centered subject cluster with generous safe zones top (headline) and
  bottom (CTA). No text bleeds into the crop.

## Required visual signals (choose 3–5, all real, all Irha-representative)

- Bavarian / Trachten yoke detail with contrast piping or scalloped placket.
- Sportswear panel with sublimated seam or bonded tape (no logos of real
  clubs).
- Leatherwear swatch stack — nappa / suede / pigment-finished corners.
- Streetwear heavyweight fleece cuff + custom-woven main label.
- Nightwear satin bias-bound edge or piped robe cuff.
- Private-label evidence: blank woven neck label, hang tag with generic
  QR placeholder, poly bag corner, master carton edge.
- Trims tray: matte gunmetal snaps, YKK-style zip pull, custom rubber patch.

## Hard constraints

- **No models, no mannequins, no faces, no hands.**
- **No fabricated factory scenes**, no fake "certified" plaques, no ISO /
  Sedex / Oeko-Tex icons unless the owner supplies verified proof.
- **No retail styling**, price tags, or consumer packaging.
- **No single folded suit as the story.** A subtle blazer sleeve cuff is
  acceptable only as one of 3–5 items, never the focal mass.
- **No random brass props**, coins, cufflink boxes, whisky glasses, or
  luxury-magazine clichés.
- Tape measure allowed only as a thin, half-visible accent — never a
  hero prop.
- Irha crest (navy + gold circular) may appear once, small, bottom-right,
  <8% of frame width — never centered, never oversized.

## Copy safe zones

- Headline (desktop): left edge → 55% width, vertical center band.
- Sub-copy (desktop): directly below headline, same left column.
- CTA row (desktop): below sub-copy, left-aligned.
- Mobile: top 30% reserved for headline, bottom 22% reserved for CTA.

## Delivery + approval workflow

1. Generate candidate → upload to `media_assets` via the admin queue.
2. Admin → Media Approval sets `verification_status = 'verified'` and
   `social_approved = true` only after visual QA against this brief.
3. `site_media_placements` row is created for `page_type = 'home'`,
   `page_slug = '/'`, `role = 'hero_desktop'` / `hero_mobile`.
4. Frontend re-wires the `<picture>` block in `HeroCarousel.tsx` to read
   the approved asset via the placement API, not a hard-coded import.
5. Placement rows in `siteMediaPlacementManifest.ts` flip back to
   `localAssetStatus: "approved"` and `reviewNote` is cleared.

## Pipeline discipline

The GitHub release pipeline is currently red (see the migration-manifest
reconciler on PR #727). Do **not** merge visual changes into a red
pipeline. Land the reconciler fix first, get Quality Gate + Supabase PR
preflight green, then queue this brief's approved candidate as its own
small PR (`chore(hero): wire admin-approved homepage hero v2`).
