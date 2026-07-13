#!/usr/bin/env python3
"""Resilient runner for the Bavarian Drive importer.

Google Drive can expose a shared folder tree while one inherited child file has
stricter permissions. gdown's folder helper stops at the first such file. This
runner first inventories the complete recursive tree, then downloads each file
independently so one restricted item cannot hide all later media.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import gdown

import import_bavarian_drive_media as importer


def resilient_download_drive_folder(drive_url: str, destination: Path) -> list[str]:
    destination.mkdir(parents=True, exist_ok=True)
    inventory = gdown.download_folder(
        url=drive_url,
        output=str(destination),
        quiet=False,
        use_cookies=False,
        skip_download=True,
    )

    downloaded: list[str] = []
    failures: list[dict[str, Any]] = []

    for item in inventory or []:
        file_id = getattr(item, "id", None)
        source_path = getattr(item, "path", None)
        local_path = getattr(item, "local_path", None)
        if not file_id or not local_path:
            failures.append(
                {
                    "file_id": file_id,
                    "source_path": source_path,
                    "reason": "folder inventory returned an incomplete file record",
                }
            )
            continue

        target = Path(local_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        try:
            result = gdown.download(
                id=file_id,
                output=str(target),
                quiet=False,
                use_cookies=False,
                fuzzy=True,
            )
            if result and Path(result).is_file():
                downloaded.append(str(result))
            else:
                failures.append(
                    {
                        "file_id": file_id,
                        "source_path": source_path,
                        "reason": "download returned no local file",
                    }
                )
        except Exception as exc:  # gdown raises several network/permission error types
            failures.append(
                {
                    "file_id": file_id,
                    "source_path": source_path,
                    "reason": f"{exc.__class__.__name__}: {exc}",
                }
            )
            print(
                f"IRHA_DRIVE_FILE_SKIPPED id={file_id} path={source_path!r} reason={exc.__class__.__name__}",
                file=sys.stderr,
            )

    evidence = Path("docs/import-evidence")
    evidence.mkdir(parents=True, exist_ok=True)
    (evidence / "bavarian-drive-download-failures.json").write_text(
        json.dumps(
            {
                "inventory_count": len(inventory or []),
                "downloaded_count": len(downloaded),
                "failure_count": len(failures),
                "failures": failures,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    if not downloaded:
        raise RuntimeError("Google Drive inventory was found, but no files could be downloaded")

    print(
        json.dumps(
            {
                "drive_inventory_count": len(inventory or []),
                "drive_downloaded_count": len(downloaded),
                "drive_download_failure_count": len(failures),
            },
            indent=2,
        )
    )
    return downloaded


importer.download_drive_folder = resilient_download_drive_folder

if __name__ == "__main__":
    raise SystemExit(importer.main())
