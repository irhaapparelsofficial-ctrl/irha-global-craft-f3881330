#!/usr/bin/env python3
"""Import one bounded Google Drive media folder into a resumable web batch."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import gdown

import import_bavarian_drive_media as core

MAX_DOWNLOAD_WORKERS = 12
DOWNLOAD_TIMEOUT_SECONDS = 45


def download_one(item: Any) -> tuple[str | None, dict[str, Any] | None]:
    file_id = getattr(item, "id", None)
    source_path = getattr(item, "path", None)
    local_path = getattr(item, "local_path", None)
    if not file_id or not local_path:
        return None, {
            "file_id": file_id,
            "source_path": source_path,
            "reason": "folder inventory returned an incomplete file record",
        }

    target = Path(local_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    code = (
        "import gdown,sys; "
        "result=gdown.download(id=sys.argv[1],output=sys.argv[2],quiet=True,use_cookies=False); "
        "raise SystemExit(0 if result else 2)"
    )
    try:
        completed = subprocess.run(
            [sys.executable, "-c", code, str(file_id), str(target)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=DOWNLOAD_TIMEOUT_SECONDS,
            check=False,
        )
        if completed.returncode == 0 and target.is_file():
            return str(target), None
        reason = (completed.stderr or completed.stdout or "download returned no local file").strip()
        return None, {
            "file_id": file_id,
            "source_path": source_path,
            "reason": reason[-1200:],
        }
    except subprocess.TimeoutExpired:
        if target.exists():
            target.unlink(missing_ok=True)
        return None, {
            "file_id": file_id,
            "source_path": source_path,
            "reason": f"download timeout after {DOWNLOAD_TIMEOUT_SECONDS}s",
        }
    except Exception as exc:
        return None, {
            "file_id": file_id,
            "source_path": source_path,
            "reason": f"{exc.__class__.__name__}: {exc}",
        }


def download_batch(folder_url: str, destination: Path) -> tuple[list[str], list[dict[str, Any]], int]:
    inventory = gdown.download_folder(
        url=folder_url,
        output=str(destination),
        quiet=True,
        use_cookies=False,
        skip_download=True,
    )
    items = list(inventory or [])
    downloaded: list[str] = []
    failures: list[dict[str, Any]] = []

    with ThreadPoolExecutor(max_workers=MAX_DOWNLOAD_WORKERS) as pool:
        futures = [pool.submit(download_one, item) for item in items]
        for completed_count, future in enumerate(as_completed(futures), start=1):
            local_path, failure = future.result()
            if local_path:
                downloaded.append(local_path)
            if failure:
                failures.append(failure)
                print(
                    "IRHA_DRIVE_FILE_SKIPPED "
                    f"id={failure.get('file_id')} path={failure.get('source_path')!r}",
                    file=sys.stderr,
                )
            if completed_count % 25 == 0 or completed_count == len(items):
                print(
                    f"IRHA_BATCH_PROGRESS completed={completed_count}/{len(items)} "
                    f"downloaded={len(downloaded)} failed={len(failures)}",
                    flush=True,
                )

    downloaded.sort()
    failures.sort(key=lambda item: (str(item.get("source_path")), str(item.get("file_id"))))
    return downloaded, failures, len(items)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", required=True)
    parser.add_argument("--label", required=True)
    parser.add_argument("--folder-url", required=True)
    parser.add_argument("--skip-existing", action="store_true")
    args = parser.parse_args()

    repo = Path.cwd()
    batch_slug = core.slugify(args.slug)
    batch_manifest = repo / "public/media/bavarian-drive/batches" / f"{batch_slug}.json"
    evidence_path = repo / "docs/import-evidence/bavarian-drive-batches" / f"{batch_slug}.json"
    assets_root = repo / "public/media/bavarian-drive/assets" / batch_slug

    if args.skip_existing and batch_manifest.exists():
        try:
            existing = json.loads(batch_manifest.read_text(encoding="utf-8"))
            complete = existing.get("complete") is True
            failure_count = int(existing.get("download_failure_count", 0))
            if complete and failure_count == 0:
                print(f"IRHA_BATCH_SKIP slug={batch_slug} accepted={existing.get('accepted_count', 0)}")
                return 0
            print(
                f"IRHA_BATCH_RETRY slug={batch_slug} previous_failures={failure_count}",
                flush=True,
            )
        except (OSError, json.JSONDecodeError, TypeError, ValueError):
            pass

    if assets_root.exists():
        shutil.rmtree(assets_root)
    assets_root.mkdir(parents=True, exist_ok=True)

    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    with tempfile.TemporaryDirectory(prefix=f"irha-drive-{batch_slug}-") as temp_dir:
        raw_root = Path(temp_dir) / "download"
        raw_root.mkdir(parents=True, exist_ok=True)
        downloaded, download_failures, inventory_count = download_batch(args.folder_url, raw_root)
        image_candidates = list(core.iter_images(raw_root))
        records, rejected = core.process_images(raw_root, assets_root)

    for record in records:
        original_relative = record.output_path.removeprefix("/media/bavarian-drive/assets/")
        record.output_path = f"/media/bavarian-drive/assets/{batch_slug}/{original_relative}"
        record.source_path = f"{args.label}/{record.source_path}"
        record.group = args.label.split("/", 1)[0]
        record.product_slug = core.infer_product_slug(record.source_path)

    for item in rejected:
        item.source_path = f"{args.label}/{item.source_path}"
        if item.duplicate_of:
            item.duplicate_of = f"{args.label}/{item.duplicate_of}"

    payload = {
        "complete": True,
        "generated_at": generated_at,
        "batch_slug": batch_slug,
        "label": args.label,
        "folder_url": args.folder_url,
        "inventory_count": inventory_count,
        "downloaded_count": len(downloaded),
        "download_failure_count": len(download_failures),
        "image_candidate_count": len(image_candidates),
        "accepted_count": len(records),
        "rejected_count": len(rejected),
        "records": [asdict(record) for record in records],
        "rejected": [asdict(item) for item in rejected],
        "download_failures": download_failures,
    }
    core.json_dump(batch_manifest, payload)
    core.json_dump(
        evidence_path,
        {
            key: value
            for key, value in payload.items()
            if key not in {"records", "rejected"}
        },
    )

    print(
        json.dumps(
            {
                "batch": batch_slug,
                "inventory": inventory_count,
                "downloaded": len(downloaded),
                "download_failures": len(download_failures),
                "image_candidates": len(image_candidates),
                "accepted": len(records),
                "rejected": len(rejected),
            },
            indent=2,
        )
    )

    if inventory_count > 0 and len(downloaded) == 0:
        print(
            "IRHA_BATCH_EVIDENCE_ONLY "
            f"slug={batch_slug} inventory={inventory_count} failed={len(download_failures)}",
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
