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
WEBP_METHOD = 4
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
            method=WEBP_METHOD,
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
    for product_slug, product_records in sorted(mapped.items()):
        selected = sorted(
            product_records,
            key=lambda record: (-record.quality_score, -record.original_bytes, record.source_path),
        )[:PRODUCT_GALLERY_LIMIT]
        paths = [record.output_path for record in selected]
        array_sql = "ARRAY[" + ", ".join(sql_literal(path) for path in paths) + "]::text[]"
        value_rows.append(f"    ({sql_literal(product_slug)}, {array_sql})")

    if not value_rows:
        return "-- No conservative product mappings were produced.\n"

    return f"""-- Generated from the Bavarian Images Drive scan at {generated_at}.
-- Review before applying. Existing gallery images are retained after imported images.
WITH imported(product_slug, imported_gallery) AS (
  VALUES
{',\n'.join(value_rows)}
), merged AS (
  SELECT
    p.id,
    i.imported_gallery,
    ARRAY(
      SELECT DISTINCT image
      FROM unnest(i.imported_gallery || COALESCE(p.gallery, ARRAY[]::text[])) AS image
      WHERE image IS NOT NULL AND btrim(image) <> ''
    ) AS merged_gallery
  FROM public.products p
  JOIN imported i ON i.product_slug = p.slug
)
UPDATE public.products AS p
SET
  gallery = merged.merged_gallery,
  image_url = COALESCE(merged.imported_gallery[1], p.image_url),
  updated_at = now()
FROM merged
WHERE p.id = merged.id;
"""


def build_index(records: list[MediaRecord], rejected: list[RejectedRecord], generated_at: str) -> str:
    grouped: dict[str, list[MediaRecord]] = defaultdict(list)
    for record in records:
        grouped[record.group].append(record)

    sections: list[str] = []
    for group, group_records in sorted(grouped.items()):
        cards = []
        for record in sorted(group_records, key=lambda item: item.source_path.lower()):
            product = PRODUCT_LABELS.get(record.product_slug or "", "Media library only")
            cards.append(
                f"""<article class="card" data-search="{html.escape(record.source_path.lower())} {html.escape(product.lower())}">
<img loading="lazy" src="{html.escape(record.output_path)}" alt="{html.escape(record.source_path)}">
<div><strong>{html.escape(Path(record.source_path).name)}</strong><small>{record.width}×{record.height} · {html.escape(product)}</small></div>
</article>"""
            )
        sections.append(
            f"<section><h2>{html.escape(group)} <span>{len(group_records)}</span></h2><div class=\"grid\">{''.join(cards)}</div></section>"
        )

    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Irha Bavarian Media Library</title><style>body{{font-family:system-ui;background:#101010;color:#eee;margin:0;padding:28px}}header{{position:sticky;top:0;background:#101010eF;padding:12px 0;z-index:2}}input{{width:min(680px,100%);padding:14px;background:#1b1b1b;border:1px solid #555;color:#fff}}h2{{margin-top:34px}}h2 span,small{{color:#aaa;font-weight:400}}.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}}.card{{background:#1a1a1a;border:1px solid #333}}.card img{{width:100%;aspect-ratio:1/1;object-fit:cover;display:block}}.card div{{padding:10px}}strong,small{{display:block;word-break:break-word}}small{{margin-top:6px;font-size:12px}}</style></head><body><header><h1>Irha Bavarian Media Library</h1><p>{len(records)} accepted · {len(rejected)} excluded · generated {html.escape(generated_at)}</p><input id="q" placeholder="Search filename, folder or mapped product"></header>{''.join(sections)}<script>const q=document.querySelector('#q');q.addEventListener('input',()=>{{const v=q.value.toLowerCase();document.querySelectorAll('.card').forEach(c=>c.hidden=!c.dataset.search.includes(v))}})</script></body></html>"""


def write_readme(output_root: Path, records: list[MediaRecord], rejected: list[RejectedRecord], candidate_count: int, generated_at: str) -> None:
    mapped = Counter(record.product_slug for record in records if record.product_slug)
    lines = [
        "# Bavarian Drive Media Import",
        "",
        f"Generated: {generated_at}",
        f"Image candidates scanned: {candidate_count}",
        f"Accepted unique images: {len(records)}",
        f"Excluded images: {len(rejected)}",
        "",
        "## Product mappings",
    ]
    for slug, count in sorted(mapped.items()):
        lines.append(f"- {PRODUCT_LABELS.get(slug, slug)}: {count} accepted candidates")
    lines.extend([
        "",
        "The buyer-facing product SQL selects no more than 12 strongest images per product and retains existing gallery images.",
        "Banners, sizing references, process photos and unclear files remain searchable in the media library but are not automatically attached to products.",
    ])
    (output_root / "README.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--drive-url", required=True)
    parser.add_argument("--output", default="public/media/bavarian-drive")
    parser.add_argument("--sql-output", default="supabase/manual/20260713_bavarian_drive_media_import.sql")
    args = parser.parse_args()

    repo = Path.cwd()
    output_root = repo / args.output
    sql_path = repo / args.sql_output
    raw_parent = Path(tempfile.mkdtemp(prefix="irha-bavarian-drive-"))
    raw_root = raw_parent / "raw"

    try:
        downloaded = download_drive_folder(args.drive_url, raw_root)
        if not downloaded:
            raise RuntimeError("Google Drive returned no downloadable files")
        if output_root.exists():
            shutil.rmtree(output_root)
        output_root.mkdir(parents=True, exist_ok=True)
        candidates = list(iter_images(raw_root))
        records, rejected = process_images(raw_root, output_root / "assets")
        generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
        json_dump(output_root / "manifest.json", {
            "generated_at": generated_at,
            "drive_url": args.drive_url,
            "image_candidate_count": len(candidates),
            "accepted_count": len(records),
            "rejected_count": len(rejected),
            "records": [asdict(record) for record in records],
        })
        json_dump(output_root / "scan-report.json", {
            "generated_at": generated_at,
            "image_candidate_count": len(candidates),
            "accepted_count": len(records),
            "rejected_count": len(rejected),
            "accepted_by_group": dict(sorted(Counter(record.group for record in records).items())),
            "mapped_by_product": dict(sorted(Counter(record.product_slug for record in records if record.product_slug).items())),
            "rejected": [asdict(record) for record in rejected],
        })
        (output_root / "index.html").write_text(build_index(records, rejected, generated_at), encoding="utf-8")
        write_readme(output_root, records, rejected, len(candidates), generated_at)
        sql_path.parent.mkdir(parents=True, exist_ok=True)
        sql_path.write_text(build_sql(records, generated_at), encoding="utf-8")
        print(json.dumps({"candidates": len(candidates), "accepted": len(records), "rejected": len(rejected), "sql": str(sql_path)}, indent=2))
        return 0
    finally:
        shutil.rmtree(raw_parent, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
