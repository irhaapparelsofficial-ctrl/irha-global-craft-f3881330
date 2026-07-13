#!/usr/bin/env python3
"""Resilient runner for the Bavarian Drive importer.

The shared Drive contains more than 1,500 files and anonymous bulk downloads can
be throttled. The runner points the importer's temporary download directory at a
persistent Actions cache, resumes completed files, downloads sequentially with
cookies, cools down after a refusal burst, and defers the untouched remainder
instead of discarding progress.
"""

from __future__ import annotations

import json
import os
import shutil
import sys
import time
from pathlib import Path
from typing import Any

import gdown

import import_bavarian_drive_media as importer

COOLDOWN_AFTER_FAILURES = int(os.getenv("IRHA_DRIVE_COOLDOWN_AFTER_FAILURES", "10"))
COOLDOWN_SECONDS = int(os.getenv("IRHA_DRIVE_COOLDOWN_SECONDS", "90"))
MAX_CONSECUTIVE_FAILURES = int(os.getenv("IRHA_DRIVE_MAX_CONSECUTIVE_FAILURES", "50"))
REQUEST_PAUSE_SECONDS = float(os.getenv("IRHA_DRIVE_REQUEST_PAUSE_SECONDS", "0.35"))
CACHE_ENV = "IRHA_BAVARIAN_DOWNLOAD_CACHE"


def _prepare_download_root(destination: Path) -> Path:
    """Point the temporary importer path at the persistent workflow cache."""
    configured_cache = os.getenv(CACHE_ENV)
    if not configured_cache:
        destination.mkdir(parents=True, exist_ok=True)
        return destination

    cache_root = Path(configured_cache).expanduser().resolve()
    cache_root.mkdir(parents=True, exist_ok=True)
    destination.parent.mkdir(parents=True, exist_ok=True)

    if destination.is_symlink():
        destination.unlink()
    elif destination.exists():
        if destination.is_dir():
            shutil.rmtree(destination)
        else:
            destination.unlink()

    destination.symlink_to(cache_root, target_is_directory=True)
    return cache_root


def _item_fields(item: Any) -> tuple[str | None, str | None, str | None]:
    return (
        getattr(item, "id", None),
        getattr(item, "path", None),
        getattr(item, "local_path", None),
    )


def _download_one(item: Any) -> tuple[str | None, dict[str, Any] | None, bool]:
    file_id, source_path, local_path = _item_fields(item)
    if not file_id or not local_path:
        return None, {
            "file_id": file_id,
            "source_path": source_path,
            "reason": "folder inventory returned an incomplete file record",
        }, False

    target = Path(local_path)
    if target.is_file() and target.stat().st_size > 0:
        return str(target), None, True

    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        result = gdown.download(
            id=file_id,
            output=str(target),
            quiet=True,
            use_cookies=True,
            resume=True,
        )
        if result and Path(result).is_file() and Path(result).stat().st_size > 0:
            return str(result), None, False
        return None, {
            "file_id": file_id,
            "source_path": source_path,
            "reason": "download returned no non-empty local file",
        }, False
    except Exception as exc:  # gdown raises network, quota, and permission errors
        return None, {
            "file_id": file_id,
            "source_path": source_path,
            "reason": f"{exc.__class__.__name__}: {exc}",
        }, False


def _deferred_record(item: Any) -> dict[str, Any]:
    file_id, source_path, _ = _item_fields(item)
    return {
        "file_id": file_id,
        "source_path": source_path,
        "reason": "deferred after sustained Google Drive throttling; retry on the next workflow run",
    }


def _write_evidence(
    *,
    inventory_count: int,
    downloaded: list[str],
    existing_count: int,
    failures: list[dict[str, Any]],
    deferred: list[dict[str, Any]],
    cache_root: Path,
) -> None:
    evidence = Path("docs/import-evidence")
    evidence.mkdir(parents=True, exist_ok=True)
    payload = {
        "inventory_count": inventory_count,
        "downloaded_count": len(downloaded),
        "existing_cache_count": existing_count,
        "new_downloaded_count": len(downloaded) - existing_count,
        "failure_count": len(failures),
        "deferred_count": len(deferred),
        "complete": len(downloaded) == inventory_count,
        "cache_root": str(cache_root),
        "cookie_session_enabled": True,
        "sequential_downloads": True,
        "failures": failures,
        "deferred": deferred,
    }
    (evidence / "bavarian-drive-download-failures.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def resilient_download_drive_folder(drive_url: str, destination: Path) -> list[str]:
    cache_root = _prepare_download_root(destination)
    inventory = gdown.download_folder(
        url=drive_url,
        output=str(destination),
        quiet=False,
        use_cookies=True,
        skip_download=True,
        resume=True,
    )

    items = list(inventory or [])
    downloaded: list[str] = []
    failures: list[dict[str, Any]] = []
    deferred: list[dict[str, Any]] = []
    existing_count = 0
    consecutive_failures = 0
    cooldown_used = False

    for index, item in enumerate(items):
        local_path, failure, from_cache = _download_one(item)
        if local_path:
            downloaded.append(local_path)
            existing_count += int(from_cache)
            consecutive_failures = 0
        else:
            assert failure is not None
            failures.append(failure)
            consecutive_failures += 1
            print(
                "IRHA_DRIVE_FILE_SKIPPED "
                f"id={failure.get('file_id')} path={failure.get('source_path')!r} "
                f"reason={str(failure.get('reason', '')).split(':', 1)[0]}",
                file=sys.stderr,
                flush=True,
            )

            if consecutive_failures >= COOLDOWN_AFTER_FAILURES and not cooldown_used:
                cooldown_used = True
                print(
                    f"IRHA_DRIVE_THROTTLE_COOLDOWN seconds={COOLDOWN_SECONDS}",
                    file=sys.stderr,
                    flush=True,
                )
                time.sleep(COOLDOWN_SECONDS)

            if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                deferred.extend(_deferred_record(remaining) for remaining in items[index + 1 :])
                print(
                    "IRHA_DRIVE_THROTTLED "
                    f"consecutive_failures={consecutive_failures} deferred={len(deferred)}",
                    file=sys.stderr,
                    flush=True,
                )
                break

        completed = index + 1
        if completed % 100 == 0 or completed == len(items):
            print(
                f"IRHA_DRIVE_PROGRESS completed={completed}/{len(items)} "
                f"available={len(downloaded)} failed={len(failures)}",
                flush=True,
            )
        if not from_cache and REQUEST_PAUSE_SECONDS > 0:
            time.sleep(REQUEST_PAUSE_SECONDS)

    downloaded = sorted(set(downloaded))
    failures.sort(key=lambda item: (str(item.get("source_path")), str(item.get("file_id"))))
    deferred.sort(key=lambda item: (str(item.get("source_path")), str(item.get("file_id"))))
    _write_evidence(
        inventory_count=len(items),
        downloaded=downloaded,
        existing_count=existing_count,
        failures=failures,
        deferred=deferred,
        cache_root=cache_root,
    )

    if not downloaded:
        raise RuntimeError(
            "Google Drive is currently throttling anonymous downloads and the persistent cache is empty"
        )

    print(
        json.dumps(
            {
                "drive_inventory_count": len(items),
                "drive_available_count": len(downloaded),
                "drive_existing_cache_count": existing_count,
                "drive_new_downloaded_count": len(downloaded) - existing_count,
                "drive_failure_count": len(failures),
                "drive_deferred_count": len(deferred),
                "drive_import_complete": len(downloaded) == len(items),
            },
            indent=2,
        )
    )
    return downloaded


importer.download_drive_folder = resilient_download_drive_folder

if __name__ == "__main__":
    raise SystemExit(importer.main())
