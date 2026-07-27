#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import requests
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
PROCESSOR = ROOT / "scripts/image-ai/process_image.py"
GATEWAY_URL = os.environ.get("IMAGE_GATEWAY_URL", "").strip()
FALLBACK_OIDC_TOKEN = os.environ.get("IRHA_GITHUB_OIDC_TOKEN", "").strip()
OIDC_REQUEST_URL = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL", "").strip()
OIDC_REQUEST_TOKEN = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN", "").strip()
OIDC_AUDIENCE = "irha-image-pipeline"
RUN_ID = os.environ.get("GITHUB_RUN_ID", "local")
WORKER = os.environ.get("IRHA_IMAGE_WORKER", "1").strip() or "1"
MODEL = Path(os.environ.get("IRHA_EDSR_MODEL", str(ROOT / "models/EDSR_x2.pb")))
REMBG_MODEL = os.environ.get("IRHA_REMBG_MODEL", "isnet-general-use")
FALLBACK_REMBG_MODEL = os.environ.get("IRHA_IMAGE_FALLBACK_REMBG_MODEL", "u2netp").strip() or "u2netp"
LIMIT = max(1, min(3, int(os.environ.get("IRHA_IMAGE_BATCH_LIMIT", "2"))))
MAX_JOBS = max(LIMIT, min(12, int(os.environ.get("IRHA_IMAGE_MAX_JOBS", str(LIMIT)))))
PRIMARY_TIMEOUT = max(120, min(1200, int(os.environ.get("IRHA_IMAGE_PRIMARY_TIMEOUT", "900"))))
FALLBACK_TIMEOUT = max(120, min(900, int(os.environ.get("IRHA_IMAGE_FALLBACK_TIMEOUT", "480"))))
FALLBACK_MAX_EDGE = max(640, min(1200, int(os.environ.get("IRHA_IMAGE_FALLBACK_MAX_EDGE", "960"))))


def oidc_request_url() -> str:
    if not OIDC_REQUEST_URL:
        return ""
    parts = urlsplit(OIDC_REQUEST_URL)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query["audience"] = OIDC_AUDIENCE
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def fresh_oidc_token() -> str:
    """Get a new short-lived token for every protected gateway request.

    Background removal and super-resolution can exceed the lifetime of a token
    obtained at the beginning of the job. Refreshing here keeps claim, complete,
    and failure reports independently authenticated without storing a secret.
    """
    request_url = oidc_request_url()
    if request_url and OIDC_REQUEST_TOKEN:
        response = requests.get(
            request_url,
            headers={"authorization": f"bearer {OIDC_REQUEST_TOKEN}"},
            timeout=30,
        )
        response.raise_for_status()
        token = str(response.json().get("value") or "").strip()
        if not token:
            raise RuntimeError("GitHub OIDC endpoint returned an empty token")
        return token
    if FALLBACK_OIDC_TOKEN:
        return FALLBACK_OIDC_TOKEN
    raise RuntimeError("GitHub OIDC request environment is missing")


def headers() -> dict[str, str]:
    return {"authorization": f"Bearer {fresh_oidc_token()}"}


def gateway_json(payload: dict) -> dict:
    response = requests.post(
        GATEWAY_URL,
        headers={**headers(), "content-type": "application/json"},
        json=payload,
        timeout=90,
    )
    data = response.json() if response.content else {}
    if not response.ok:
        raise RuntimeError(f"Gateway HTTP {response.status_code}: {data}")
    return data


def report_failure(job: dict, message: str, review_required: bool = False) -> None:
    try:
        gateway_json({
            "action": "fail",
            "id": job["id"],
            "lock_token": job["lock_token"],
            "message": message[:1800],
            "review_required": review_required,
        })
    except Exception as error:
        print(f"Could not report failure for {job.get('id')}: {error}", file=sys.stderr)


def processor_command(source: Path, output: Path, rembg_model: str) -> list[str]:
    return [
        sys.executable,
        str(PROCESSOR),
        "--input", str(source),
        "--output-dir", str(output),
        "--edsr-model", str(MODEL),
        "--rembg-model", rembg_model,
    ]


def prepare_fast_source(source: Path, target: Path) -> None:
    """Create a bounded temporary retry source without modifying the original."""
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened)
        image.load()
        has_alpha = image.mode in {"RGBA", "LA"} or "transparency" in image.info
        converted = image.convert("RGBA" if has_alpha else "RGB")

    max_edge = max(converted.size)
    if max_edge > FALLBACK_MAX_EDGE:
        scale = FALLBACK_MAX_EDGE / max_edge
        resized = converted.resize(
            (max(1, round(converted.width * scale)), max(1, round(converted.height * scale))),
            Image.Resampling.LANCZOS,
        )
        converted.close()
        converted = resized

    target.parent.mkdir(parents=True, exist_ok=True)
    converted.save(target, format="PNG", optimize=True)
    converted.close()


def run_processor(command: list[str], timeout_seconds: int) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=timeout_seconds,
    )


def process_job(job: dict) -> dict:
    with tempfile.TemporaryDirectory(prefix="irha-image-") as temp:
        temp_dir = Path(temp)
        source = temp_dir / "source-image"
        fast_source = temp_dir / "source-fast.png"
        output = temp_dir / "output"

        download = requests.get(job["public_url"], timeout=120)
        download.raise_for_status()
        if len(download.content) < 24:
            raise RuntimeError("Downloaded original is empty")
        source.write_bytes(download.content)

        fallback_used = False
        primary_command = processor_command(source, output, REMBG_MODEL) + [
            "--asset-id", str(job["id"]),
            "--file-name", str(job.get("file_name") or ""),
        ]

        try:
            result = run_processor(primary_command, PRIMARY_TIMEOUT)
        except subprocess.TimeoutExpired as primary_error:
            fallback_used = True
            print(
                json.dumps({
                    "id": job.get("id"),
                    "status": "primary_timeout",
                    "timeout_seconds": PRIMARY_TIMEOUT,
                    "fallback_max_edge": FALLBACK_MAX_EDGE,
                    "fallback_model": FALLBACK_REMBG_MODEL,
                }, separators=(",", ":")),
                file=sys.stderr,
            )
            shutil.rmtree(output, ignore_errors=True)
            prepare_fast_source(source, fast_source)
            fallback_command = processor_command(fast_source, output, FALLBACK_REMBG_MODEL) + [
                "--asset-id", str(job["id"]),
                "--file-name", str(job.get("file_name") or ""),
            ]
            try:
                result = run_processor(fallback_command, FALLBACK_TIMEOUT)
            except subprocess.TimeoutExpired as fallback_error:
                raise RuntimeError(
                    f"Primary processor timed out after {PRIMARY_TIMEOUT}s and bounded fallback timed out after {FALLBACK_TIMEOUT}s"
                ) from fallback_error
            if result.returncode != 0:
                detail = (result.stderr or result.stdout or "Image processor fallback failed")[-1800:]
                raise RuntimeError(f"Primary processor timed out; bounded fallback failed: {detail}") from primary_error

        if result.returncode != 0:
            raise RuntimeError((result.stderr or result.stdout or "Image processor failed")[-1800:])

        manifest_path = output / "manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if fallback_used:
            existing_reason = str(manifest.get("reviewReason") or "").strip()
            fallback_reason = (
                f"Bounded {FALLBACK_MAX_EDGE}px fast fallback used after primary processor exceeded {PRIMARY_TIMEOUT}s"
            )
            manifest["status"] = "review_required"
            manifest["reviewReason"] = "; ".join(
                reason for reason in (existing_reason, fallback_reason) if reason
            )
            manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

        file_handles = []
        files: dict[str, tuple[str, object, str]] = {}
        try:
            for key, filename in {
                "master": "master.webp",
                "variant_360": "360.webp",
                "variant_720": "720.webp",
                "variant_1200": "1200.webp",
                "variant_1600": "1600.webp",
            }.items():
                handle = (output / filename).open("rb")
                file_handles.append(handle)
                files[key] = (filename, handle, "image/webp")

            response = requests.post(
                GATEWAY_URL,
                headers=headers(),
                data={
                    "action": "complete",
                    "id": job["id"],
                    "lock_token": job["lock_token"],
                    "bucket": job.get("bucket") or "site-media",
                    "object_path": job["object_path"],
                    "manifest": json.dumps(manifest, separators=(",", ":")),
                },
                files=files,
                timeout=300,
            )
            data = response.json() if response.content else {}
            if not response.ok:
                raise RuntimeError(f"Completion HTTP {response.status_code}: {data}")
            return data
        finally:
            for handle in file_handles:
                handle.close()


def main() -> int:
    if not GATEWAY_URL:
        raise RuntimeError("IMAGE_GATEWAY_URL is missing")

    failed = 0
    review = 0
    ready = 0
    claimed_total = 0
    claim_rounds = 0

    while claimed_total < MAX_JOBS:
        remaining = MAX_JOBS - claimed_total
        claim_limit = min(LIMIT, remaining)
        claimed = gateway_json({
            "action": "claim",
            "limit": claim_limit,
            "run_id": f"{RUN_ID}:worker-{WORKER}",
        })
        jobs = claimed.get("jobs") or []
        claim_rounds += 1
        print(f"Worker {WORKER}: claim round {claim_rounds} returned {len(jobs)} image job(s)")
        if not jobs:
            break

        claimed_total += len(jobs)
        for job in jobs:
            try:
                result = process_job(job)
                status = result.get("status")
                if status == "ready":
                    ready += 1
                elif status == "review_required":
                    review += 1
                print(json.dumps({"id": job["id"], "result": result}, separators=(",", ":")))
            except Exception as error:
                failed += 1
                message = str(error)
                report_failure(job, message)
                print(json.dumps({"id": job.get("id"), "status": "failed", "error": message}), file=sys.stderr)

    summary = {
        "worker": WORKER,
        "claim_rounds": claim_rounds,
        "claimed": claimed_total,
        "ready": ready,
        "review_required": review,
        "failed": failed,
        "max_jobs": MAX_JOBS,
    }
    print(json.dumps(summary, separators=(",", ":")))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
