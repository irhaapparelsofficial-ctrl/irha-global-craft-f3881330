# Batch IA-HERO-001 — Homepage & Global Category Heroes

**Status:** `generated_pending_review` · Do **not** wire to any live page until each asset is reviewed and explicitly approved.

## Scope

This is a **media-only** batch. No website components, routes, database rows, migrations, CI workflows, product records or SEO code were modified. Files live exclusively under this folder:

```
public/media-master/01-homepage-global-heroes/
```

## Contents (12 assets × 3 image files = 36 raster images)

| ID | Dimensions | Category |
|---|---|---|
| IA-HERO-HOME-DESKTOP-001 | 2400×1350 | homepage/global |
| IA-HERO-HOME-MOBILE-001 | 1350×1800 | homepage/global |
| IA-HERO-BAVARIAN-DESKTOP-001 | 1920×1080 | categories/bavarian-trachten |
| IA-HERO-BAVARIAN-MOBILE-001 | 1080×1350 | categories/bavarian-trachten |
| IA-HERO-LEATHER-DESKTOP-001 | 1920×1080 | categories/leatherwear |
| IA-HERO-LEATHER-MOBILE-001 | 1080×1350 | categories/leatherwear |
| IA-HERO-SPORTS-DESKTOP-001 | 1920×1080 | categories/sportswear |
| IA-HERO-SPORTS-MOBILE-001 | 1080×1350 | categories/sportswear |
| IA-HERO-STREET-ACTIVE-DESKTOP-001 | 1920×1080 | categories/streetwear-activewear |
| IA-HERO-STREET-ACTIVE-MOBILE-001 | 1080×1350 | categories/streetwear-activewear |
| IA-HERO-NIGHT-LEISURE-DESKTOP-001 | 1920×1080 | categories/nightwear-leisure |
| IA-HERO-NIGHT-LEISURE-MOBILE-001 | 1080×1350 | categories/nightwear-leisure |

Each asset folder contains:

- `master-clean.png` — full-resolution clean master (no logo, no text)
- `web-clean.webp` — web-optimized clean derivative
- `web-branded.webp` — clean master + official Irha crest overlaid at top-right
- `prompt.txt` — exact positive and negative prompts used
- `metadata.json` — full manifest entry (dimensions, alt text, source paths, QA flags, timestamp)

## Official logo source

The circular navy-and-gold Irha Apparels crest was **never redrawn or regenerated**. It was taken verbatim from the existing repository logo:

- Primary asset pointer: `src/assets/irha-logo.png.asset.json` → CDN `/__l5e/assets-v1/c9265db3-9f5d-44d2-a18b-c8f909ae6da0/irha-logo.png` (1024×1024 PNG, RGBA).
- Fallback embed: the same crest is embedded (base64 WebP) inside `public/irha-brand-mark.svg`.

The image model produced the clean canvas with strict "no text, no logos, no brand names" negative prompts. The exact PNG was then **alpha-composited** onto each clean master with PIL at 11% of image width and a 3% safe margin at top-right.

## QA flags (surfaced for the review stage)

Some AI-generated masters violated one or more hard constraints. The full list per asset is recorded in each asset's `metadata.json` under `qa_flags`. Highlights:

- `IA-HERO-SPORTS-DESKTOP-001` / `IA-HERO-SPORTS-MOBILE-001` — the model hallucinated real-brand marks (Nike/Adidas/Under Armour/Puma-like) and gibberish text on jerseys. **Recommend reject → regenerate** with stricter no-text/no-brand negatives before any use.
- `IA-HERO-BAVARIAN-DESKTOP-001` / `IA-HERO-BAVARIAN-MOBILE-001` — visible mannequin torso/stand. **Recommend reject → regenerate** for full "garment shape, no mannequin" compliance.
- `IA-HERO-STREET-ACTIVE-DESKTOP-001` / `IA-HERO-STREET-ACTIVE-MOBILE-001` — the women's activewear rendered as an invisible-body form. **Recommend reject → regenerate.**

All other assets appear compliant on first inspection and are queued for owner visual QA against the brief.

## Manifest

`media-manifest.json` enumerates all 12 assets and all 36 image files. A validation pass at build time confirmed every expected file exists and is non-zero (`assets=12 expected_files=36 missing=0 zero_byte=0`).

## Do NOT

- Attach these images to any route, hero component, `siteMediaPlacementManifest`, `media_assets` row or SEO tag in this commit.
- Modify Supabase, migrations, product records, or CI workflows because of this batch.
- Redraw, regenerate or alter the official crest.

Next step is the owner review pass in a subsequent batch — accepted assets will be routed through the existing `AdminMediaApproval` workflow, and rejected ones will be regenerated with tightened prompts.
