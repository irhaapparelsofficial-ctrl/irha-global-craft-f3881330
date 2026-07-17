from __future__ import annotations

import hashlib
import io
import json
import urllib.request
from pathlib import Path

from PIL import Image

SUPABASE = "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media"
LOGO_URL = f"{SUPABASE}/brand/irha-apparels-official-locked-logo-256.png"

PRODUCTS = {
    "traditional-knee-length-lederhosen": {
        "name": "Traditional Knee-Length Lederhosen",
        "sources": {
            "front": f"{SUPABASE}/catalog-remediation/traditional-knee-length-lederhosen/traditional-knee-length-lederhosen-design-01-front-clean-2048.png",
            "three-quarter": f"{SUPABASE}/catalog-remediation/traditional-knee-length-lederhosen/traditional-knee-length-lederhosen-design-01-three-quarter-clean-2048.png",
            "side": f"{SUPABASE}/catalog-remediation/traditional-knee-length-lederhosen/traditional-knee-length-lederhosen-design-01-side-clean-2048.png",
            "back": f"{SUPABASE}/catalog-remediation/traditional-knee-length-lederhosen/traditional-knee-length-lederhosen-design-01-back-clean-2048.png",
        },
    },
    "premium-embroidered-lederhosen": {
        "name": "Premium Embroidered Lederhosen",
        "sources": {
            "front": "https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:25897a22-4b8f-4629-aa0c-ad3d6b917445",
            "three-quarter": "https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:4f50611d-1f10-4578-afa6-6ac68e39e49b",
            "side": "https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:a32141b7-9bf5-43d2-98ed-71bd297ee86b",
            "back": "https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:22adbb10-6d7f-46c6-acc8-f5a1c4659db1",
        },
    },
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


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    logo_bytes = download(LOGO_URL)
    logo_master = Image.open(io.BytesIO(logo_bytes)).convert("RGBA")
    if min(logo_master.size) < 200:
        raise RuntimeError(f"Official logo unexpectedly small: {logo_master.size}")

    project_manifest = {
        "batch": "B2 Lederhosen Media",
        "logo_source": LOGO_URL,
        "logo_sha256": hashlib.sha256(logo_bytes).hexdigest(),
        "logo_rule": "Exact official raster overlay only; no generative redraw",
        "products": [],
    }

    for slug, product in PRODUCTS.items():
        base_dir = Path("public/product-media") / slug
        clean_dir = base_dir / "clean"
        branded_dir = base_dir / "branded"
        web_dir = base_dir / "web"
        for directory in (clean_dir, branded_dir, web_dir):
            directory.mkdir(parents=True, exist_ok=True)

        product_manifest = {
            "slug": slug,
            "product": product["name"],
            "design": "01",
            "views": [],
        }

        for view, source_url in product["sources"].items():
            print(f"Processing {slug}/{view}", flush=True)
            source_bytes = download(source_url)
            source_image = Image.open(io.BytesIO(source_bytes)).convert("RGBA")
            original_size = source_image.size
            if source_image.width != source_image.height or min(source_image.size) < 1200:
                raise RuntimeError(f"Unusable dimensions for {slug}/{view}: {source_image.size}")

            clean = source_image if source_image.size == (2048, 2048) else source_image.resize(
                (2048, 2048), Image.Resampling.LANCZOS
            )
            clean_path = clean_dir / f"{slug}-design-01-{view}-clean-2048.png"
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
            branded_path = branded_dir / f"{slug}-design-01-{view}-branded-2048.png"
            branded.save(branded_path, format="PNG", compress_level=6)

            web = branded.convert("RGB")
            web.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
            web_path = web_dir / f"{slug}-design-01-{view}-web-1600.webp"
            web.save(web_path, format="WEBP", quality=86, method=6)

            product_manifest["views"].append(
                {
                    "view": view,
                    "source_url": source_url,
                    "source_dimensions": list(original_size),
                    "master_dimensions": list(branded.size),
                    "web_dimensions": list(web.size),
                    "logo_box": [x, y, logo.width, logo.height],
                    "clean_path": str(clean_path),
                    "branded_path": str(branded_path),
                    "web_path": str(web_path),
                    "clean_sha256": sha256_file(clean_path),
                    "branded_sha256": sha256_file(branded_path),
                    "web_sha256": sha256_file(web_path),
                }
            )

        (base_dir / "media-manifest.json").write_text(
            json.dumps(product_manifest, indent=2) + "\n",
            encoding="utf-8",
        )
        project_manifest["products"].append(product_manifest)

    manifest_path = Path("public/product-media/b2-lederhosen-media-manifest.json")
    manifest_path.write_text(
        json.dumps(project_manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(project_manifest, indent=2))


if __name__ == "__main__":
    main()
