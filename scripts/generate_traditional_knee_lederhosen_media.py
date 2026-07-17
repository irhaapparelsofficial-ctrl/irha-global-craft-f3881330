from __future__ import annotations

import hashlib
import io
import json
import urllib.request
from pathlib import Path

from PIL import Image

PRODUCT_SLUG = "traditional-knee-length-lederhosen"
PRODUCT_NAME = "Traditional Knee-Length Lederhosen"
LOGO_URL = (
    "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/"
    "site-media/brand/irha-apparels-official-locked-logo-256.png"
)
SOURCES = {
    "front": "https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:1f82b743-4e04-4c8d-be29-71855e2bd3fd",
    "three-quarter": "https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:28b07db0-bd4d-4ca8-a53d-651b83d4a374",
    "side": "https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:36781800-d164-463b-a59a-a6d582a68f51",
    "back": "https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:e91d3d01-7d90-44cb-8645-d72d521cef04",
}


def download(url: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Irha-Apparels-Media-Pipeline/3.0"},
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        if response.status != 200:
            raise RuntimeError(f"Download failed: {response.status} {url}")
        content_type = response.headers.get("content-type", "")
        if not content_type.startswith("image/"):
            raise RuntimeError(f"Non-image response: {content_type} {url}")
        data = response.read()
        if len(data) > 20_000_000:
            raise RuntimeError(f"Image exceeds 20 MB: {url}")
        return data


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    base_dir = Path("public/product-media") / PRODUCT_SLUG
    clean_dir = base_dir / "clean"
    branded_dir = base_dir / "branded"
    web_dir = base_dir / "web"
    for directory in (clean_dir, branded_dir, web_dir):
        directory.mkdir(parents=True, exist_ok=True)

    logo_bytes = download(LOGO_URL)
    logo_master = Image.open(io.BytesIO(logo_bytes)).convert("RGBA")
    if min(logo_master.size) < 200:
        raise RuntimeError(f"Official logo unexpectedly small: {logo_master.size}")

    manifest: dict[str, object] = {
        "product": PRODUCT_NAME,
        "slug": PRODUCT_SLUG,
        "design": "01",
        "logo_source": LOGO_URL,
        "logo_sha256": sha256(logo_bytes),
        "logo_rule": "Exact official raster overlay only; no generative redraw",
        "views": [],
    }

    for view, source_url in SOURCES.items():
        source_bytes = download(source_url)
        source = Image.open(io.BytesIO(source_bytes)).convert("RGBA")
        if source.width != source.height or min(source.size) < 1200:
            raise RuntimeError(f"Unusable dimensions for {view}: {source.size}")

        clean = source if source.size == (2048, 2048) else source.resize(
            (2048, 2048), Image.Resampling.LANCZOS
        )
        clean_path = clean_dir / f"{PRODUCT_SLUG}-design-01-{view}-clean-2048.png"
        clean.save(clean_path, format="PNG", compress_level=6)

        logo = logo_master.copy()
        logo_width = 220
        logo_height = round(logo.height * logo_width / logo.width)
        logo = logo.resize((logo_width, logo_height), Image.Resampling.LANCZOS)
        alpha = logo.getchannel("A").point(lambda value: round(value * 0.72))
        logo.putalpha(alpha)
        x = clean.width - logo.width - 72
        y = 72

        branded = clean.copy()
        branded.alpha_composite(logo, (x, y))
        branded_path = branded_dir / f"{PRODUCT_SLUG}-design-01-{view}-branded-2048.png"
        branded.save(branded_path, format="PNG", compress_level=6)

        web = branded.convert("RGB")
        web.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        web_path = web_dir / f"{PRODUCT_SLUG}-design-01-{view}-web-1600.webp"
        web.save(web_path, format="WEBP", quality=86, method=6)

        manifest["views"].append(
            {
                "view": view,
                "source_url": source_url,
                "source_dimensions": list(source.size),
                "master_dimensions": list(branded.size),
                "web_dimensions": list(web.size),
                "logo_box": [x, y, logo.width, logo.height],
                "clean_path": str(clean_path),
                "branded_path": str(branded_path),
                "web_path": str(web_path),
                "clean_sha256": sha256(clean_path.read_bytes()),
                "branded_sha256": sha256(branded_path.read_bytes()),
                "web_sha256": sha256(web_path.read_bytes()),
            }
        )

    (base_dir / "media-manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
