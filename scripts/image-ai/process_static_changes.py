#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
PROCESSOR = ROOT / "scripts/image-ai/process_image.py"
SUPPORTED = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
EXCLUDED_PREFIXES = (
    "public/thumbnails/",
    "public/responsive/",
    "public/ai-master/",
    "public/ai-review/",
    "public/catalogs/thumbs/",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--before", default=os.getenv("GITHUB_EVENT_BEFORE", ""))
    parser.add_argument("--head", default=os.getenv("GITHUB_SHA", "HEAD"))
    parser.add_argument("--edsr-model", type=Path, default=ROOT / "models/EDSR_x2.pb")
    parser.add_argument("--rembg-model", default=os.getenv("IRHA_REMBG_MODEL", "isnet-general-use"))
    return parser.parse_args()


def changed_images(before: str, head: str) -> list[Path]:
    if not before or set(before) == {"0"}:
        command = ["git", "show", "--pretty=", "--name-only", "--diff-filter=AM", head]
    else:
        command = ["git", "diff", "--name-only", "--diff-filter=AM", before, head]
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, check=True)
    images: list[Path] = []
    for line in result.stdout.splitlines():
        normalized = line.strip().replace("\\", "/")
        if not normalized.startswith("public/") or normalized.startswith(EXCLUDED_PREFIXES):
            continue
        path = ROOT / normalized
        if path.is_file() and path.suffix.lower() in SUPPORTED:
            images.append(path)
    return sorted(set(images))


def output_paths(source: Path) -> tuple[Path, Path]:
    relative = source.relative_to(PUBLIC)
    master = PUBLIC / "ai-master" / Path(f"{relative.as_posix()}.webp")
    review = PUBLIC / "ai-review" / Path(f"{relative.as_posix()}.json")
    return master, review


def process_one(source: Path, args: argparse.Namespace) -> str:
    master_path, review_path = output_paths(source)
    with tempfile.TemporaryDirectory(prefix="irha-static-image-") as temp:
        output = Path(temp) / "output"
        command = [
            sys.executable,
            str(PROCESSOR),
            "--input", str(source),
            "--output-dir", str(output),
            "--edsr-model", str(args.edsr_model),
            "--rembg-model", args.rembg_model,
            "--file-name", source.name,
        ]
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=1200)
        if result.returncode != 0:
            raise RuntimeError((result.stderr or result.stdout or "Static image processing failed")[-1800:])
        manifest = json.loads((output / "manifest.json").read_text(encoding="utf-8"))

        if manifest.get("status") == "ready":
            master_path.parent.mkdir(parents=True, exist_ok=True)
            master_path.write_bytes((output / "master.webp").read_bytes())
            review_path.unlink(missing_ok=True)
            return "ready"

        review_path.parent.mkdir(parents=True, exist_ok=True)
        review_path.write_text(json.dumps({
            "source": f"/{source.relative_to(PUBLIC).as_posix()}",
            **manifest,
        }, indent=2) + "\n", encoding="utf-8")
        master_path.unlink(missing_ok=True)
        return "review_required"


def main() -> int:
    args = parse_args()
    images = changed_images(args.before, args.head)
    if not images:
        print("No new or changed public source images require AI processing.")
        return 0

    ready = 0
    review = 0
    failed: list[dict[str, str]] = []
    for source in images:
        try:
            status = process_one(source, args)
            ready += int(status == "ready")
            review += int(status == "review_required")
            print(json.dumps({"source": str(source.relative_to(ROOT)), "status": status}))
        except Exception as error:
            failed.append({"source": str(source.relative_to(ROOT)), "error": str(error)})
            print(json.dumps(failed[-1]), file=sys.stderr)

    print(json.dumps({"processed": len(images), "ready": ready, "review_required": review, "failed": len(failed)}))
    if failed:
        (ROOT / "image-ai-static-failures.json").write_text(json.dumps(failed, indent=2) + "\n", encoding="utf-8")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
