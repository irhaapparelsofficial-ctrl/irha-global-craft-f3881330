import io
import json
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image, ImageOps

MANIFEST = Path("scripts/product-media-manifest.json")
OUTPUT_ROOT = Path("public/product-media")


def fetch_image(url: str) -> bytes:
    request = Request(url, headers={"User-Agent": "Irha-Apparels-Media-Sync/1.0"})
    with urlopen(request, timeout=45) as response:
        content_type = response.headers.get_content_type()
        payload = response.read()
    if not content_type.startswith("image/"):
        raise RuntimeError(f"Expected image, received {content_type} from {url}")
    if len(payload) < 10_000:
        raise RuntimeError(f"Image payload too small ({len(payload)} bytes) from {url}")
    return payload


def sync_item(slug: str, item: dict) -> None:
    payload = None
    last_error = None
    for url in (item.get("source"), item.get("fallback")):
        if not url:
            continue
        try:
            payload = fetch_image(url)
            break
        except Exception as error:
            last_error = error
    if payload is None:
        raise RuntimeError(f"Unable to fetch {slug}/{item['file']}: {last_error}")

    output_dir = OUTPUT_ROOT / slug
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / item["file"]

    with Image.open(io.BytesIO(payload)) as image:
        image = ImageOps.exif_transpose(image)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGB")
        image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        image.save(output_path, "WEBP", quality=82, method=5)

    size = output_path.stat().st_size
    if size < 8_000:
        raise RuntimeError(f"Optimized file too small: {output_path} ({size} bytes)")
    print(f"Synced {slug}/{item['file']} ({size} bytes)")


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    for slug, items in manifest.get("products", {}).items():
        for item in items:
            sync_item(slug, item)


if __name__ == "__main__":
    main()
