#!/usr/bin/env python3
from __future__ import annotations

import io
import json
import os
import sys
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import requests
from PIL import Image, ImageOps

GATEWAY_URL = os.environ.get("IMAGE_GATEWAY_URL", "").strip()
COMPLETE_GATEWAY_URL = os.environ.get("CATALOG_COMPLETE_GATEWAY_URL", "").strip()
FALLBACK_OIDC_TOKEN = os.environ.get("IRHA_GITHUB_OIDC_TOKEN", "").strip()
OIDC_REQUEST_URL = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL", "").strip()
OIDC_REQUEST_TOKEN = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN", "").strip()
OIDC_AUDIENCE = "irha-image-pipeline"
RUN_ID = os.environ.get("GITHUB_RUN_ID", "local")
WORKER = os.environ.get("IRHA_IMAGE_WORKER", "1").strip() or "1"
LIMIT = max(1, min(5, int(os.environ.get("IRHA_IMAGE_BATCH_LIMIT", "5"))))
MAX_JOBS = max(LIMIT, min(150, int(os.environ.get("IRHA_IMAGE_MAX_JOBS", "100"))))
DOWNLOAD_TIMEOUT = max(30, min(300, int(os.environ.get("IRHA_CATALOG_DOWNLOAD_TIMEOUT", "120"))))
UPLOAD_TIMEOUT = max(60, min(600, int(os.environ.get("IRHA_CATALOG_UPLOAD_TIMEOUT", "300"))))
MASTER_MAX_EDGE = max(1200, min(4000, int(os.environ.get("IRHA_CATALOG_MASTER_MAX_EDGE", "2400"))))
WEBP_QUALITY = max(75, min(95, int(os.environ.get("IRHA_CATALOG_WEBP_QUALITY", "88"))))
WIDTHS = (360, 720, 1200, 1600, 2400)


def oidc_request_url() -> str:
    if not OIDC_REQUEST_URL:
        return ""
    parts = urlsplit(OIDC_REQUEST_URL)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query["audience"] = OIDC_AUDIENCE
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def fresh_oidc_token() -> str:
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


def auth_headers() -> dict[str, str]:
    return {"authorization": f"Bearer {fresh_oidc_token()}"}


def gateway_json(payload: dict) -> dict:
    response = requests.post(
        GATEWAY_URL,
        headers={**auth_headers(), "content-type": "application/json"},
        json=payload,
        timeout=90,
    )
    data = response.json() if response.content else {}
    if not response.ok:
        raise RuntimeError(f"Gateway HTTP {response.status_code}: {data}")
    return data


def report_failure(job: dict, message: str) -> None:
    try:
        gateway_json({
            "action": "fail",
            "id": job["id"],
            "lock_token": job["lock_token"],
            "message": message[:1800],
            "review_required": False,
        })
    except Exception as error:
        print(f"Could not report failure for {job.get('id')}: {error}", file=sys.stderr)


def load_source(content: bytes) -> tuple[Image.Image, int, int]:
    with Image.open(io.BytesIO(content)) as opened:
        image = ImageOps.exif_transpose(opened)
        image.load()
        source_width, source_height = image.size
        has_alpha = image.mode in {"RGBA", "LA"} or "transparency" in image.info
        converted = image.convert("RGBA" if has_alpha else "RGB")
    return converted, source_width, source_height


def bounded_master(image: Image.Image) -> Image.Image:
    max_edge = max(image.size)
    if max_edge <= MASTER_MAX_EDGE:
        return image.copy()
    scale = MASTER_MAX_EDGE / max_edge
    return image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.Resampling.LANCZOS,
    )


def resized_variant(master: Image.Image, requested_width: int) -> Image.Image:
    target_width = min(requested_width, master.width)
    if target_width == master.width:
        return master.copy()
    target_height = max(1, round(master.height * (target_width / master.width)))
    return master.resize((target_width, target_height), Image.Resampling.LANCZOS)


def webp_bytes(image: Image.Image) -> bytes:
    output = io.BytesIO()
    image.save(output, format="WEBP", quality=WEBP_QUALITY, method=6, exact=True)
    value = output.getvalue()
    if len(value) < 24 or value[:4] != b"RIFF" or value[8:12] != b"WEBP":
        raise RuntimeError("Generated WebP failed signature validation")
    return value


def process_job(job: dict) -> dict:
    response = requests.get(job["public_url"], timeout=DOWNLOAD_TIMEOUT)
    response.raise_for_status()
    if len(response.content) < 24:
        raise RuntimeError("Downloaded catalogue source is empty")

    source, source_width, source_height = load_source(response.content)
    try:
        master = bounded_master(source)
    finally:
        source.close()

    try:
        master_payload = webp_bytes(master)
        variants: dict[int, bytes] = {}
        for width in WIDTHS:
            variant = resized_variant(master, width)
            try:
                variants[width] = webp_bytes(variant)
            finally:
                variant.close()

        manifest = {
            "status": "ready",
            "qualityScore": 95,
            "sourceWidth": source_width,
            "sourceHeight": source_height,
            "masterWidth": master.width,
            "masterHeight": master.height,
        }
    finally:
        master.close()

    files: dict[str, tuple[str, bytes, str]] = {
        "master": ("master.webp", master_payload, "image/webp"),
    }
    for width, payload in variants.items():
        files[f"variant_{width}"] = (f"{width}.webp", payload, "image/webp")

    upload = requests.post(
        COMPLETE_GATEWAY_URL,
        headers=auth_headers(),
        data={
            "action": "catalog_complete",
            "id": job["id"],
            "lock_token": job["lock_token"],
            "manifest": json.dumps(manifest, separators=(",", ":")),
        },
        files=files,
        timeout=UPLOAD_TIMEOUT,
    )
    data = upload.json() if upload.content else {}
    if not upload.ok:
        raise RuntimeError(f"Completion HTTP {upload.status_code}: {data}")
    return data


def main() -> int:
    if not GATEWAY_URL:
        raise RuntimeError("IMAGE_GATEWAY_URL is missing")
    if not COMPLETE_GATEWAY_URL:
        raise RuntimeError("CATALOG_COMPLETE_GATEWAY_URL is missing")

    failed = 0
    ready = 0
    claimed_total = 0
    claim_rounds = 0

    while claimed_total < MAX_JOBS:
        remaining = MAX_JOBS - claimed_total
        claimed = gateway_json({
            "action": "claim",
            "limit": min(LIMIT, remaining),
            "run_id": f"{RUN_ID}:catalog-worker-{WORKER}",
        })
        jobs = claimed.get("jobs") or []
        claim_rounds += 1
        print(f"Catalog worker {WORKER}: claim round {claim_rounds} returned {len(jobs)} job(s)")
        if not jobs:
            break

        claimed_total += len(jobs)
        for job in jobs:
            try:
                result = process_job(job)
                ready += 1 if result.get("status") == "ready" else 0
                print(json.dumps({"id": job["id"], "result": result}, separators=(",", ":")))
            except Exception as error:
                failed += 1
                message = str(error)
                report_failure(job, message)
                print(json.dumps({"id": job.get("id"), "status": "failed", "error": message}), file=sys.stderr)

    summary = {
        "worker": WORKER,
        "mode": "catalog-webp",
        "claim_rounds": claim_rounds,
        "claimed": claimed_total,
        "ready": ready,
        "failed": failed,
        "max_jobs": MAX_JOBS,
    }
    print(json.dumps(summary, separators=(",", ":")))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
