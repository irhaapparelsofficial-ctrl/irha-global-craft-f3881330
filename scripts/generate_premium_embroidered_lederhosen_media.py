from __future__ import annotations

import hashlib
import io
import json
import urllib.request
from pathlib import Path

from PIL import Image

SLUG = "premium-embroidered-lederhosen"
LOGO_URL = "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/brand/irha-apparels-official-locked-logo-256.png"
SOURCES = {
    "front": "https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:2e86fefb-f09c-408a-b188-db9a4693fd9d",
    "three-quarter": "https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:3affbcca-6b3e-434a-ba8e-d39286f23be1",
    "side": "https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:bfa6c83f-9987-40c5-9bd9-df795d76ce4f",
    "back": "https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:a0e1bd6c-7640-4d0d-a5ed-8329903b34e5",
}


def download(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "Irha-Apparels-Media-Pipeline/3.1"})
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


def main() -> None:
    base_dir = Path("public/product-media") / SLUG
    clean_dir = base_dir / "clean"
    branded_dir = base_dir / "branded"
    web_dir = base_dir / "web"
    for directory in (clean_dir, branded_dir, web_dir):
        directory.mkdir(parents=True, exist_ok=True)

    logo_bytes = download(LOGO_URL)
    logo_master = Image.open(io.BytesIO(logo_bytes)).convert("RGBA")
    if min(logo_master.size) < 200:
        raise RuntimeError(f"Official logo unexpectedly small: {logo_master.size}")

    manifest = {
        "product": "Premium Embroidered Lederhosen",
        "slug": SLUG,
        "design": "01",
        "category": "Bavarian & Trachten Wear / Men / Lederhosen",
        "logo_source": LOGO_URL,
        "logo_sha256": hashlib.sha256(logo_bytes).hexdigest(),
        "logo_rule": "Exact official raster overlay only; no generative redraw",
        "views": [],
    }

    for view, source_url in SOURCES.items():
        print(f"Processing {view}: {source_url}", flush=True)
        source_bytes = download(source_url)
        source_image = Image.open(io.BytesIO(source_bytes)).convert("RGBA")
        source_size = source_image.size
        if source_image.width != source_image.height or min(source_size) < 1200:
            raise RuntimeError(f"Unusable dimensions for {view}: {source_size}")

        clean = source_image if source_size == (2048, 2048) else source_image.resize((2048, 2048), Image.Resampling.LANCZOS)
        clean_path = clean_dir / f"{SLUG}-design-01-{view}-clean-2048.png"
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
        branded_path = branded_dir / f"{SLUG}-design-01-{view}-branded-2048.png"
        branded.save(branded_path, format="PNG", compress_level=6)

        web = branded.convert("RGB")
        web.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        web_path = web_dir / f"{SLUG}-design-01-{view}-web-1600.webp"
        web.save(web_path, format="WEBP", quality=86, method=6)

        manifest["views"].append({
            "view": view,
            "source_url": source_url,
            "source_dimensions": list(source_size),
            "clean_path": str(clean_path),
            "branded_path": str(branded_path),
            "web_path": str(web_path),
            "master_dimensions": list(branded.size),
            "web_dimensions": list(web.size),
            "logo_box": [x, y, logo.width, logo.height],
            "source_sha256": hashlib.sha256(source_bytes).hexdigest(),
            "clean_sha256": hashlib.sha256(clean_path.read_bytes()).hexdigest(),
            "branded_sha256": hashlib.sha256(branded_path.read_bytes()).hexdigest(),
            "web_sha256": hashlib.sha256(web_path.read_bytes()).hexdigest(),
        })

    (base_dir / "media-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
