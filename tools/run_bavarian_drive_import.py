#!/usr/bin/env python3
"""Resilient runner for the Bavarian Drive importer.

Google Drive can expose a shared folder tree while one inherited child file has
stricter permissions. gdown's folder helper stops at the first such file. This
runner inventories the complete recursive tree, then downloads each file with a
cookie-enabled Google session so one restricted item cannot hide all later
media.

The current gdown implementation stores confirmation cookies in one shared
cache file. Downloads are therefore intentionally sequential: parallel workers
can race while reading/writing that cookie jar and make every otherwise-public
file fail with FileURLRetrievalError.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Any

import gdown

import import_bavarian_drive_media as importer

DOWNLOAD_ATTEMPTS = 2
FAIL_FAST_SAMPLE = 12


def _download_one(item: Any) -> tuple[str | None, dict[str, Any] | None]:
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
    last_error = "download returned no local file"

    for attempt in range(1, DOWNLOAD_ATTEMPTS + 1):
        try:
            result = gdown.download(
                id=file_id,
                output=str(target),
                quiet=True,
                use_cookies=True,
                resume=True,
            )
            if result and Path(result).is_file() and Path(result).stat().st_size > 0:
                return str(result), None
            last_error = "download returned no non-empty local file"
        except Exception as exc:  # gdown raises several network/permission error types
            last_error = f"{exc.__class__.__name__}: {exc}"

        if attempt < DOWNLOAD_ATTEMPTS:
            time.sleep(2 * attempt)

    return None, {
        "file_id": file_id,
        "source_path": source_path,
        "reason": last_error,
        "attempts": DOWNLOAD_ATTEMPTS,
    }


def resilient_download_drive_folder(drive_url: str, destination: Path) -> list[str]:
    destination.mkdir(parents=True, exist_ok=True)
    inventory = gdown.download_folder(
        url=drive_url,
        output=str(destination),
        quiet=False,
        use_cookies=True,
        skip_download=True,
    )

    downloaded: list[str] = []
    failures: list[dict[str, Any]] = []
    items = list(inventory or [])

    for completed, item in enumerate(items, start=1):
        local_path, failure = _download_one(item)
        if local_path:
            downloaded.append(local_path)
        if failure:
            failures.append(failure)
            print(
                "IRHA_DRIVE_FILE_SKIPPED "
                f"id={failure.get('file_id')} path={failure.get('source_path')!r} "
                f"reason={str(failure.get('reason', '')).split(':', 1)[0]}",
                file=sys.stderr,
                flush=True,
            )

        if completed % 25 == 0 or completed == len(items):
            print(
                f"IRHA_DRIVE_PROGRESS completed={completed}/{len(items)} "
                f"downloaded={len(downloaded)} failed={len(failures)}",
                flush=True,
            )

        # Do not spend the whole Actions timeout retrying hundreds of files when
        # Google is refusing every public download. Preserve evidence and fail
        # quickly so the permissions/session issue is immediately visible.
        if completed >= FAIL_FAST_SAMPLE and not downloaded:
            break

    downloaded.sort()
    failures.sort(key=lambda item: (str(item.get("source_path")), str(item.get("file_id"))))

    evidence = Path("docs/import-evidence")
    evidence.mkdir(parents=True, exist_ok=True)
    (evidence / "bavarian-drive-download-failures.json").write_text(
        json.dumps(
            {
                "inventory_count": len(items),
                "attempted_count": len(downloaded) + len(failures),
                "downloaded_count": len(downloaded),
                "failure_count": len(failures),
                "download_attempts_per_file": DOWNLOAD_ATTEMPTS,
                "cookie_session_enabled": True,
                "sequential_downloads": True,
                "fail_fast_sample": FAIL_FAST_SAMPLE,
                "fail_fast_triggered": bool(items and not downloaded),
                "failures": failures,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    if not downloaded:
        raise RuntimeError(
            "Google Drive inventory was found, but the first cookie-enabled "
            f"download sample ({min(len(items), FAIL_FAST_SAMPLE)} files) all failed"
        )

    print(
        json.dumps(
            {
                "drive_inventory_count": len(items),
                "drive_attempted_count": len(downloaded) + len(failures),
                "drive_downloaded_count": len(downloaded),
                "drive_download_failure_count": len(failures),
                "cookie_session_enabled": True,
                "sequential_downloads": True,
            },
            indent=2,
        )
    )
    return downloaded


importer.download_drive_folder = resilient_download_drive_folder

if __name__ == "__main__":
    raise SystemExit(importer.main())
