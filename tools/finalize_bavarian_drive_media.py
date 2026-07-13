#!/usr/bin/env python3
"""Merge completed Drive batches into the public media library and SQL mapping."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

import import_bavarian_drive_media as core


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def public_file(repo: Path, public_url: str) -> Path:
    return repo / "public" / public_url.lstrip("/")


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
    batch_summaries: list[dict] = []
    inventory_count = 0
    downloaded_count = 0
    image_candidate_count = 0

    for manifest_path in manifests:
        payload = load_json(manifest_path)
        if payload.get("complete") is not True:
            raise RuntimeError(f"Incomplete batch manifest: {manifest_path}")
        inventory_count += int(payload.get("inventory_count", 0))
        downloaded_count += int(payload.get("downloaded_count", 0))
        image_candidate_count += int(payload.get("image_candidate_count", 0))
        download_failures.extend(payload.get("download_failures", []))
        all_records.extend(core.MediaRecord(**item) for item in payload.get("records", []))
        all_rejected.extend(core.RejectedRecord(**item) for item in payload.get("rejected", []))
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
                )
            }
        )

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
        "accepted_by_group": dict(sorted(Counter(item.group for item in accepted).items())),
        "mapped_by_product": dict(
            sorted(Counter(item.product_slug for item in accepted if item.product_slug).items())
        ),
        "batches": batch_summaries,
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
                "mapped_products": len(
                    {item.product_slug for item in accepted if item.product_slug}
                ),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
