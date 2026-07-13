#!/usr/bin/env python3
"""Merge completed Drive batches into an organized, reviewable media library."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageOps

import import_bavarian_drive_media as core

REENCODE_QUALITIES = (76, 70, 64, 58)
MATERIAL_OVERHEAD_RATIO = 1.10
MATERIAL_OVERHEAD_BYTES = 32 * 1024


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def public_file(repo: Path, public_url: str) -> Path:
    return repo / "public" / public_url.lstrip("/")


def materially_oversized(record: core.MediaRecord) -> bool:
    limit = max(
        int(record.original_bytes * MATERIAL_OVERHEAD_RATIO),
        record.original_bytes + MATERIAL_OVERHEAD_BYTES,
    )
    return record.optimized_bytes > limit


def safe_product_slug(record: core.MediaRecord) -> str | None:
    """Prevent broad folder names from being attached to the wrong product."""
    slug = record.product_slug
    text = record.source_path.lower()

    if not slug:
        return None
    if any(token in text for token in ("banner", "size chart", "sizing", "leather process")):
        return None
    if "children" in text and slug not in {"children-s-lederhosen", "children-s-dirndl"}:
        return None
    if ("women" in text or "children" in text) and slug == "bavarian-men-s-checkered-shirt":
        return None
    if "janker" in text:
        return None
    if slug == "classic-biker-leather-jacket" and not any(
        token in text for token in ("biker", "leather")
    ):
        return None
    return slug


def destination_for(repo: Path, record: core.MediaRecord, current: Path) -> Path:
    parts = record.output_path.strip("/").split("/")
    try:
        assets_index = parts.index("assets")
        batch_slug = parts[assets_index + 1]
    except (ValueError, IndexError) as exc:
        raise RuntimeError(f"Unexpected media output path: {record.output_path}") from exc

    folder = record.product_slug or "review-only"
    target_dir = repo / "public/media/bavarian-drive/assets" / batch_slug / folder
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / current.name

    if target != current and target.exists():
        target = target.with_name(
            f"{target.stem}-{record.pixel_sha256[:8]}{target.suffix}"
        )
    return target


def reencode_if_needed(path: Path, original_bytes: int) -> tuple[int, bool]:
    """Shrink material regressions while keeping a useful WebP master."""
    current_size = path.stat().st_size
    if current_size <= original_bytes:
        return current_size, False

    best_bytes = path.read_bytes()
    best_size = len(best_bytes)
    attempted = False

    with Image.open(path) as opened:
        image = ImageOps.exif_transpose(opened)
        if getattr(image, "is_animated", False):
            image.seek(0)
        image = image.convert("RGB")

        for quality in REENCODE_QUALITIES:
            attempted = True
            candidate = path.with_name(f".{path.stem}-q{quality}.webp")
            image.save(candidate, "WEBP", quality=quality, method=6, optimize=True)
            candidate_bytes = candidate.read_bytes()
            candidate.unlink(missing_ok=True)
            if len(candidate_bytes) < best_size:
                best_bytes = candidate_bytes
                best_size = len(candidate_bytes)
            if best_size <= original_bytes:
                break

    if best_size < current_size:
        path.write_bytes(best_bytes)
    return path.stat().st_size, attempted


def normalize_record(repo: Path, record: core.MediaRecord) -> tuple[core.MediaRecord | None, bool]:
    current = public_file(repo, record.output_path)
    if not current.is_file():
        return None, False

    record.product_slug = safe_product_slug(record)
    target = destination_for(repo, record, current)
    if target != current:
        current.replace(target)
        current = target

    record.output_path = "/" + current.relative_to(repo / "public").as_posix()
    record.optimized_bytes, reencoded = reencode_if_needed(
        current, record.original_bytes
    )
    return record, reencoded


def remove_empty_directories(root: Path) -> None:
    if not root.exists():
        return
    for path in sorted(root.rglob("*"), key=lambda item: len(item.parts), reverse=True):
        if path.is_dir() and not any(path.iterdir()):
            path.rmdir()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--expected-count", type=int, required=True)
    parser.add_argument(
        "--sql-output",
        default="supabase/manual/20260713_bavarian_drive_media_import.sql",
    )
    args = parser.parse_args()

    repo = Path.cwd()
    media_root = repo / "public/media/bavarian-drive"
    batch_dir = media_root / "batches"
    manifests = sorted(batch_dir.glob("*.json"))
    if len(manifests) != args.expected_count:
        raise RuntimeError(
            f"Expected {args.expected_count} completed batches, found {len(manifests)}"
        )

    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    all_records: list[core.MediaRecord] = []
    all_rejected: list[core.RejectedRecord] = []
    download_failures: list[dict] = []
    manifest_payloads: dict[Path, dict] = {}
    inventory_count = 0
    downloaded_count = 0
    image_candidate_count = 0
    reencoded_count = 0
    missing_asset_count = 0

    for manifest_path in manifests:
        payload = load_json(manifest_path)
        if payload.get("complete") is not True:
            raise RuntimeError(f"Incomplete batch manifest: {manifest_path}")

        inventory_count += int(payload.get("inventory_count", 0))
        downloaded_count += int(payload.get("downloaded_count", 0))
        image_candidate_count += int(payload.get("image_candidate_count", 0))
        download_failures.extend(payload.get("download_failures", []))
        all_rejected.extend(
            core.RejectedRecord(**item) for item in payload.get("rejected", [])
        )

        normalized_records: list[core.MediaRecord] = []
        for item in payload.get("records", []):
            record = core.MediaRecord(**item)
            normalized, reencoded = normalize_record(repo, record)
            if normalized is None:
                missing_asset_count += 1
                all_rejected.append(
                    core.RejectedRecord(
                        source_path=record.source_path,
                        reason="generated asset missing before finalization",
                    )
                )
                continue
            normalized_records.append(normalized)
            reencoded_count += int(reencoded)

        payload["records"] = [asdict(record) for record in normalized_records]
        payload["finalized_record_count"] = len(normalized_records)
        manifest_payloads[manifest_path] = payload
        all_records.extend(normalized_records)

    by_hash: dict[str, list[core.MediaRecord]] = defaultdict(list)
    for record in all_records:
        by_hash[record.pixel_sha256].append(record)

    accepted: list[core.MediaRecord] = []
    cross_batch_duplicates: list[core.RejectedRecord] = []
    for duplicates in by_hash.values():
        ranked = sorted(
            duplicates,
            key=lambda item: (-item.quality_score, -item.original_bytes, item.source_path),
        )
        winner = ranked[0]
        accepted.append(winner)
        for duplicate in ranked[1:]:
            duplicate_path = public_file(repo, duplicate.output_path)
            if duplicate_path.exists():
                duplicate_path.unlink()
            cross_batch_duplicates.append(
                core.RejectedRecord(
                    source_path=duplicate.source_path,
                    reason="exact pixel duplicate across Drive batches",
                    duplicate_of=winner.source_path,
                )
            )

    all_rejected.extend(cross_batch_duplicates)
    accepted.sort(key=lambda item: (item.group.lower(), item.source_path.lower()))
    all_rejected.sort(key=lambda item: item.source_path.lower())
    download_failures.sort(
        key=lambda item: (str(item.get("source_path")), str(item.get("file_id")))
    )

    accepted_paths = {record.output_path for record in accepted}
    batch_summaries: list[dict] = []
    for manifest_path, payload in manifest_payloads.items():
        payload["records"] = [
            item for item in payload.get("records", [])
            if item.get("output_path") in accepted_paths
        ]
        payload["finalized_record_count"] = len(payload["records"])
        core.json_dump(manifest_path, payload)
        batch_summaries.append(
            {
                key: payload.get(key)
                for key in (
                    "batch_slug",
                    "label",
                    "inventory_count",
                    "downloaded_count",
                    "download_failure_count",
                    "image_candidate_count",
                    "accepted_count",
                    "rejected_count",
                    "finalized_record_count",
                )
            }
        )

    remove_empty_directories(media_root / "assets")

    uncategorized_path_count = sum(
        "/uncategorized/" in record.output_path for record in accepted
    )
    review_only_count = sum(
        "/review-only/" in record.output_path for record in accepted
    )
    larger_than_source_count = sum(
        record.optimized_bytes > record.original_bytes for record in accepted
    )
    materially_oversized_count = sum(
        materially_oversized(record) for record in accepted
    )
    final_missing_asset_count = sum(
        not public_file(repo, record.output_path).is_file() for record in accepted
    )
    mapped_product_count = len(
        {record.product_slug for record in accepted if record.product_slug}
    )

    manifest = {
        "generated_at": generated_at,
        "drive_url": "https://drive.google.com/drive/folders/10pBXyaJyJgdt3nLe-opOcXW58ZE9ryug",
        "batch_count": len(manifests),
        "inventory_count": inventory_count,
        "downloaded_count": downloaded_count,
        "download_failure_count": len(download_failures),
        "image_candidate_count": image_candidate_count,
        "accepted_count": len(accepted),
        "rejected_count": len(all_rejected),
        "records": [asdict(record) for record in accepted],
    }
    report = {
        "generated_at": generated_at,
        "batch_count": len(manifests),
        "inventory_count": inventory_count,
        "downloaded_count": downloaded_count,
        "download_failure_count": len(download_failures),
        "image_candidate_count": image_candidate_count,
        "accepted_count": len(accepted),
        "rejected_count": len(all_rejected),
        "cross_batch_duplicate_count": len(cross_batch_duplicates),
        "reencoded_count": reencoded_count,
        "missing_asset_count": missing_asset_count + final_missing_asset_count,
        "uncategorized_path_count": uncategorized_path_count,
        "review_only_count": review_only_count,
        "larger_than_source_count": larger_than_source_count,
        "materially_oversized_count": materially_oversized_count,
        "mapped_product_count": mapped_product_count,
        "accepted_by_group": dict(sorted(Counter(item.group for item in accepted).items())),
        "mapped_by_product": dict(
            sorted(Counter(item.product_slug for item in accepted if item.product_slug).items())
        ),
        "batches": sorted(batch_summaries, key=lambda item: str(item.get("batch_slug"))),
        "rejected": [asdict(item) for item in all_rejected],
    }

    core.json_dump(media_root / "manifest.json", manifest)
    core.json_dump(media_root / "scan-report.json", report)
    core.json_dump(
        repo / "docs/import-evidence/bavarian-drive-download-failures.json",
        {
            "generated_at": generated_at,
            "inventory_count": inventory_count,
            "downloaded_count": downloaded_count,
            "failure_count": len(download_failures),
            "failures": download_failures,
        },
    )
    (media_root / "index.html").write_text(
        core.build_index(accepted, all_rejected, generated_at),
        encoding="utf-8",
    )
    core.write_readme(
        media_root,
        accepted,
        all_rejected,
        image_candidate_count,
        generated_at,
    )

    sql_path = repo / args.sql_output
    sql_path.parent.mkdir(parents=True, exist_ok=True)
    sql_path.write_text(core.build_sql(accepted, generated_at), encoding="utf-8")

    print(
        json.dumps(
            {
                "batches": len(manifests),
                "inventory": inventory_count,
                "downloaded": downloaded_count,
                "download_failures": len(download_failures),
                "accepted_unique": len(accepted),
                "rejected": len(all_rejected),
                "cross_batch_duplicates": len(cross_batch_duplicates),
                "reencoded": reencoded_count,
                "review_only": review_only_count,
                "materially_oversized": materially_oversized_count,
                "mapped_products": mapped_product_count,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
