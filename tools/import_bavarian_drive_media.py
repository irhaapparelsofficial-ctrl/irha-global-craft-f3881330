#!/usr/bin/env python3
"""Import the shared Bavarian media Drive into production-safe static assets.

The importer:
- downloads the complete shared Drive folder recursively;
- opens every supported image and records unreadable/tiny files;
- removes exact pixel duplicates while preserving alternate angles;
- converts accepted images to optimized WebP;
- publishes an organized, searchable static media library;
- generates a reviewable SQL file that adds the strongest matches to existing
  Supabase product galleries without deleting their current images.

No database write is performed by this script itself.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import math
import os
import re
import shutil
import sys
import tempfile
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import gdown
from PIL import Image, ImageFilter, ImageOps, ImageStat, UnidentifiedImageError

SUPPORTED_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff"}
MIN_SIDE = 240
MAX_SIDE = 1600
WEBP_QUALITY = 82
PRODUCT_GALLERY_LIMIT = 12

PRODUCT_LABELS = {
    "traditional-lederhosen": "Traditional Lederhosen",
    "bavarian-men-s-checkered-shirt": "Bavarian Men's Checkered Shirt",
    "bavarian-embroidered-vest": "Bavarian Embroidered Vest",
    "traditional-dirndl-dress": "Traditional Dirndl Dress",
    "dirndl-blouse": "Dirndl Blouse",
    "children-s-lederhosen": "Children's Lederhosen",
    "children-s-dirndl": "Children's Dirndl",
    "haferl-leather-shoes": "Haferl Leather Shoes",
    "knee-high-bavarian-socks": "Knee-High Bavarian Socks",
    "bavarian-leather-belt": "Bavarian Leather Belt",
    "classic-biker-leather-jacket": "Classic Biker Leather Jacket",
    "bomber-leather-jacket": "Bomber Leather Jacket",
    "leather-vest-waistcoat": "Leather Vest / Waistcoat",
    "leather-trousers": "Leather Trousers",
    "full-grain-leather-belt": "Full-Grain Leather Belt",
    "leather-gloves": "Leather Gloves",
    "premium-leather-bag": "Premium Leather Bag",
}


@dataclass
class MediaRecord:
    source_path: str
    output_path: str
    group: str
    width: int
    height: int
    original_bytes: int
    optimized_bytes: int
    quality_score: float
    pixel_sha256: str
    product_slug: str | None


@dataclass
class RejectedRecord:
    source_path: str
    reason: str
    duplicate_of: str | None = None


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "image"


def normalized_text(path: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", path.lower()).strip()


def infer_product_slug(source_path: str) -> str | None:
    """Conservatively map only clear folder/file names to existing products."""
    text = normalized_text(source_path)
    parts = [part.lower() for part in Path(source_path).parts]
    top = parts[0] if parts else ""

    if top in {"banners", "size chart", "sizing", "leather"}:
        return None

    is_child = "children" in text or "child" in text or "kids" in text
    if is_child and "lederhosen" in text:
        return "children-s-lederhosen"
    if is_child and ("dirndl" in text or "drindl" in text):
        return "children-s-dirndl"

    if "dirndl blouse" in text or "dirndl blouses" in text:
        return "dirndl-blouse"
    if "dirndl" in text or "drindl" in text:
        return "traditional-dirndl-dress"
    if "lederhosen" in text:
        return "traditional-lederhosen"

    if "bomber" in text:
        return "bomber-leather-jacket"
    if "leather pants" in text or "leather trousers" in text or "leather pents" in text:
        return "leather-trousers"
    if "waistcoat" in text or "waiscoat" in text or "janker" in text:
        if top == "jackets" or "leather" in text:
            return "leather-vest-waistcoat"
        return "bavarian-embroidered-vest"
    if "jacket" in text:
        return "classic-biker-leather-jacket"

    if "shirt" in text and "t shirt" not in text and "tshirt" not in text:
        return "bavarian-men-s-checkered-shirt"
    if "shoe" in text:
        return "haferl-leather-shoes"
    if "sock" in text:
        return "knee-high-bavarian-socks"
    if "belt" in text:
        return "bavarian-leather-belt" if top != "leather" else "full-grain-leather-belt"
    if "glove" in text:
        return "leather-gloves"
    if "bag" in text:
        return "premium-leather-bag"

    return None


def image_quality_score(image: Image.Image, original_bytes: int) -> float:
    """Rank image usefulness without pretending to judge garment quality."""
    width, height = image.size
    megapixels = (width * height) / 1_000_000
    short_side = min(width, height)
    grayscale = image.convert("L").resize((min(width, 700), min(height, 700)))
    edges = grayscale.filter(ImageFilter.FIND_EDGES)
    edge_stat = ImageStat.Stat(edges)
    sharpness = edge_stat.var[0] if edge_stat.var else 0.0
    return round(
        min(megapixels, 8.0) * 2.5
        + min(short_side / 500, 4.0)
        + min(math.log10(max(original_bytes, 1)) / 3, 2.0)
        + min(sharpness / 900, 2.0),
        4,
    )


def iter_images(root: Path) -> Iterable[Path]:
    for path in sorted(root.rglob("*")):
        if path.is_file() and path.suffix.lower() in SUPPORTED_SUFFIXES:
            yield path


def download_drive_folder(drive_url: str, destination: Path) -> list[str]:
    destination.mkdir(parents=True, exist_ok=True)
    result = gdown.download_folder(
        url=drive_url,
        output=str(destination),
        quiet=False,
        use_cookies=False,
        remaining_ok=True,
    )
    return [str(item) for item in (result or [])]


def unique_output_path(output_root: Path, relative_source: Path, used: set[str]) -> tuple[Path, str]:
    parent_parts = [slugify(part) for part in relative_source.parent.parts if part not in {".", ""}]
    stem = slugify(relative_source.stem)
    parent = Path(*parent_parts) if parent_parts else Path("uncategorized")
    candidate = parent / f"{stem}.webp"
    counter = 2
    while candidate.as_posix() in used:
        candidate = parent / f"{stem}-{counter}.webp"
        counter += 1
    used.add(candidate.as_posix())
    return output_root / candidate, candidate.as_posix()


def process_images(raw_root: Path, output_root: Path) -> tuple[list[MediaRecord], list[RejectedRecord]]:
    records: list[MediaRecord] = []
    rejected: list[RejectedRecord] = []
    seen_pixels: dict[str, str] = {}
    used_outputs: set[str] = set()

    for source in iter_images(raw_root):
        relative = source.relative_to(raw_root)
        source_path = relative.as_posix()
        try:
            with Image.open(source) as opened:
                image = ImageOps.exif_transpose(opened)
                if getattr(image, "is_animated", False):
                    image.seek(0)
                image = image.convert("RGB")
        except (UnidentifiedImageError, OSError, ValueError) as exc:
            rejected.append(RejectedRecord(source_path, f"unreadable: {exc.__class__.__name__}"))
            continue

        width, height = image.size
        if min(width, height) < MIN_SIDE:
            rejected.append(RejectedRecord(source_path, f"too small: {width}x{height}"))
            continue

        pixel_hash = hashlib.sha256(
            f"{width}x{height}:RGB:".encode("utf-8") + image.tobytes()
        ).hexdigest()
        duplicate_of = seen_pixels.get(pixel_hash)
        if duplicate_of:
            rejected.append(RejectedRecord(source_path, "exact pixel duplicate", duplicate_of))
            continue
        seen_pixels[pixel_hash] = source_path

        original_bytes = source.stat().st_size
        score = image_quality_score(image, original_bytes)
        if max(width, height) > MAX_SIDE:
            scale = MAX_SIDE / max(width, height)
            resized = (
                max(1, round(width * scale)),
                max(1, round(height * scale)),
            )
            image = image.resize(resized, Image.Resampling.LANCZOS)

        absolute_output, relative_output = unique_output_path(output_root, relative, used_outputs)
        absolute_output.parent.mkdir(parents=True, exist_ok=True)
        image.save(
            absolute_output,
            "WEBP",
            quality=WEBP_QUALITY,
            method=6,
            optimize=True,
        )

        group = relative.parts[0] if relative.parts else "Uncategorized"
        records.append(
            MediaRecord(
                source_path=source_path,
                output_path=f"/media/bavarian-drive/assets/{relative_output}",
                group=group,
                width=width,
                height=height,
                original_bytes=original_bytes,
                optimized_bytes=absolute_output.stat().st_size,
                quality_score=score,
                pixel_sha256=pixel_hash,
                product_slug=infer_product_slug(source_path),
            )
        )

    return records, rejected


def json_dump(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def build_sql(records: list[MediaRecord], generated_at: str) -> str:
    mapped: dict[str, list[MediaRecord]] = defaultdict(list)
    for record in records:
        if record.product_slug:
            mapped[record.product_slug].append(record)

    value_rows: list[str] = []
    for slug in sorted(mapped):
        ranked = sorted(
            mapped[slug],
            key=lambda item: (-item.quality_score, -item.original_bytes, item.source_path),
        )[:PRODUCT_GALLERY_LIMIT]
        paths = ", ".join(sql_literal(item.output_path) for item in ranked)
        value_rows.append(f"    ({sql_literal(slug)}, ARRAY[{paths}]::text[])")

    if not value_rows:
        return "-- No conservative product mappings were generated.\n"

    return f"""-- Generated by tools/import_bavarian_drive_media.py at {generated_at}
-- Reviewable data-only import. Existing gallery images are preserved after the new Drive images.
-- Every accepted unique image remains available in /media/bavarian-drive/ even when it is not mapped here.

begin;

with incoming(product_slug, paths) as (
  values
{',\n'.join(value_rows)}
)
update public.products as product
set
  image_url = incoming.paths[1],
  gallery = (
    select array_agg(deduplicated.path order by deduplicated.first_position)
    from (
      select media_path as path, min(position) as first_position
      from unnest(incoming.paths || coalesce(product.gallery, '{{}}'::text[]))
        with ordinality as media(media_path, position)
      where media_path is not null and media_path <> ''
      group by media_path
    ) as deduplicated
  ),
  updated_at = now()
from incoming
where product.slug = incoming.product_slug;

commit;
"""


def build_index(records: list[MediaRecord], rejected: list[RejectedRecord], generated_at: str) -> str:
    groups = sorted(Counter(record.group for record in records).items())
    group_buttons = "".join(
        f'<button type="button" data-filter="{html.escape(group)}">{html.escape(group)} <span>{count}</span></button>'
        for group, count in groups
    )
    cards = []
    for record in sorted(records, key=lambda item: (item.group.lower(), item.source_path.lower())):
        product = PRODUCT_LABELS.get(record.product_slug or "", "Media library only")
        cards.append(
            "".join(
                [
                    f'<article class="card" data-group="{html.escape(record.group)}" data-search="{html.escape((record.source_path + " " + product).lower())}">',
                    f'<a href="{html.escape(record.output_path)}" target="_blank" rel="noreferrer">',
                    f'<img src="{html.escape(record.output_path)}" alt="{html.escape(product)} reference image" loading="lazy" decoding="async">',
                    "</a>",
                    '<div class="meta">',
                    f'<strong>{html.escape(product)}</strong>',
                    f'<small>{html.escape(record.source_path)}</small>',
                    f'<span>{record.width}×{record.height} · score {record.quality_score:.2f}</span>',
                    "</div></article>",
                ]
            )
        )

    accepted_bytes = sum(item.optimized_bytes for item in records)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Bavarian Media Library · Irha Apparels</title>
<style>
:root{{color-scheme:dark;--bg:#0b0d11;--card:#141820;--line:#29303a;--gold:#d4ad62;--muted:#9ca3af}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:#f8fafc;font:14px/1.5 Inter,system-ui,sans-serif}}
header{{position:sticky;top:0;z-index:5;background:rgba(11,13,17,.94);backdrop-filter:blur(14px);border-bottom:1px solid var(--line);padding:22px clamp(16px,4vw,56px)}}
h1{{font:500 clamp(28px,5vw,54px)/1.05 Georgia,serif;margin:0}}p{{color:var(--muted);max-width:900px}}.stats{{display:flex;gap:12px;flex-wrap:wrap;color:var(--gold)}}
.controls{{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}}button,input{{min-height:44px;border:1px solid var(--line);background:#10141a;color:#fff;padding:10px 14px}}button{{cursor:pointer}}button.active{{border-color:var(--gold);color:var(--gold)}}button span{{color:var(--muted);margin-left:4px}}input{{flex:1;min-width:240px}}
main{{padding:24px clamp(14px,3vw,42px) 64px}}.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}}.card{{background:var(--card);border:1px solid var(--line);overflow:hidden}}.card[hidden]{{display:none}}
.card a{{display:block;aspect-ratio:4/5;background:#0e1116}}.card img{{width:100%;height:100%;object-fit:cover;display:block}}.meta{{padding:12px;display:grid;gap:5px}}.meta strong{{color:var(--gold)}}.meta small{{color:var(--muted);word-break:break-word}}.meta span{{font-size:11px;color:#cbd5e1}}
footer{{padding:20px clamp(16px,4vw,56px);border-top:1px solid var(--line);color:var(--muted)}}
</style>
</head>
<body>
<header>
  <h1>Bavarian Media Library</h1>
  <p>Scanned source media organized for Irha Apparels. Exact pixel duplicates and unusable files are excluded; alternate product angles are retained.</p>
  <div class="stats"><span>{len(records)} accepted unique images</span><span>{len(rejected)} excluded files</span><span>{accepted_bytes / 1_048_576:.1f} MB optimized</span></div>
  <div class="controls"><input id="search" type="search" placeholder="Search folder, filename or mapped product" aria-label="Search media"><button class="active" type="button" data-filter="all">All <span>{len(records)}</span></button>{group_buttons}</div>
</header>
<main><div class="grid">{''.join(cards)}</div></main>
<footer>Generated {html.escape(generated_at)} · This operational library is intentionally not indexed by search engines.</footer>
<script>
const buttons=[...document.querySelectorAll('[data-filter]')];const cards=[...document.querySelectorAll('.card')];const search=document.querySelector('#search');let group='all';
function apply(){{const q=search.value.trim().toLowerCase();for(const card of cards){{card.hidden=!((group==='all'||card.dataset.group===group)&&(!q||card.dataset.search.includes(q)))}}}}
for(const button of buttons)button.addEventListener('click',()=>{{group=button.dataset.filter;buttons.forEach(x=>x.classList.toggle('active',x===button));apply()}});search.addEventListener('input',apply);
</script>
</body>
</html>
"""


def write_readme(
    output_root: Path,
    records: list[MediaRecord],
    rejected: list[RejectedRecord],
    downloaded_count: int,
    generated_at: str,
) -> None:
    mapped = Counter(record.product_slug for record in records if record.product_slug)
    groups = Counter(record.group for record in records)
    lines = [
        "# Bavarian Drive media import",
        "",
        f"Generated: `{generated_at}`",
        f"Downloaded image candidates discovered: **{downloaded_count}**",
        f"Accepted unique web images: **{len(records)}**",
        f"Excluded unreadable, tiny, or exact-duplicate files: **{len(rejected)}**",
        "",
        "## Accepted images by source group",
        "",
    ]
    lines.extend(f"- {group}: {count}" for group, count in sorted(groups.items()))
    lines.extend(["", "## Conservative product gallery mappings", ""])
    if mapped:
        lines.extend(
            f"- {PRODUCT_LABELS.get(slug, slug)} (`{slug}`): {count} accepted candidates; top {min(count, PRODUCT_GALLERY_LIMIT)} included in SQL"
            for slug, count in sorted(mapped.items())
        )
    else:
        lines.append("- No clear mappings generated.")
    lines.extend(
        [
            "",
            "## Safety rules",
            "",
            "- Existing Supabase gallery images are preserved after imported paths.",
            "- Generic banners, sizing charts, material-process photos and ambiguous accessories stay in the media library and are not mislabeled as products.",
            "- Near-duplicate images are retained because they may be legitimate alternate angles; only exact pixel duplicates are removed.",
            "- The generated SQL is data-only and must be reviewed/applied separately.",
            "",
        ]
    )
    (output_root / "README.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--drive-url", required=True)
    parser.add_argument("--output", default="public/media/bavarian-drive")
    parser.add_argument("--sql-output", default="supabase/manual/20260713_bavarian_drive_media_import.sql")
    args = parser.parse_args()

    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    repository_root = Path.cwd()
    output_root = repository_root / args.output
    assets_root = output_root / "assets"
    sql_output = repository_root / args.sql_output

    if output_root.exists():
        shutil.rmtree(output_root)
    output_root.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="irha-bavarian-drive-") as temp_dir:
        raw_root = Path(temp_dir) / "download"
        downloaded = download_drive_folder(args.drive_url, raw_root)
        candidates = list(iter_images(raw_root))
        if not candidates:
            print("No image files were downloaded from the Drive folder.", file=sys.stderr)
            return 2
        records, rejected = process_images(raw_root, assets_root)

    if not records:
        print("The Drive download contained no usable images.", file=sys.stderr)
        return 3

    manifest = {
        "generated_at": generated_at,
        "drive_url": args.drive_url,
        "accepted_count": len(records),
        "rejected_count": len(rejected),
        "records": [asdict(record) for record in records],
    }
    report = {
        "generated_at": generated_at,
        "download_return_count": len(downloaded),
        "image_candidate_count": len(candidates),
        "accepted_count": len(records),
        "rejected_count": len(rejected),
        "rejected": [asdict(item) for item in rejected],
        "accepted_by_group": dict(sorted(Counter(item.group for item in records).items())),
        "mapped_by_product": dict(sorted(Counter(item.product_slug for item in records if item.product_slug).items())),
    }

    json_dump(output_root / "manifest.json", manifest)
    json_dump(output_root / "scan-report.json", report)
    (output_root / "index.html").write_text(build_index(records, rejected, generated_at), encoding="utf-8")
    write_readme(output_root, records, rejected, len(candidates), generated_at)

    sql_output.parent.mkdir(parents=True, exist_ok=True)
    sql_output.write_text(build_sql(records, generated_at), encoding="utf-8")

    print(
        json.dumps(
            {
                "downloaded_candidates": len(candidates),
                "accepted_unique": len(records),
                "rejected": len(rejected),
                "mapped_products": len({item.product_slug for item in records if item.product_slug}),
                "output": str(output_root),
                "sql": str(sql_output),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
