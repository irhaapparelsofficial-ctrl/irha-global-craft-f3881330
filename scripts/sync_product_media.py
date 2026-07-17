import io
import json
import time
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image, ImageOps

MANIFEST_ROOT = Path("scripts")
BASE_MANIFEST = MANIFEST_ROOT / "product-media-manifest.json"
BATCH_MANIFEST_GLOB = "product-media-batch-*.json"
OUTPUT_ROOT = Path("public/product-media")
DEFAULT_MIN_SOURCE_BYTES = 10_000
DEFAULT_MIN_OPTIMIZED_BYTES = 8_000
DEFAULT_FETCH_ATTEMPTS = 3


def fetch_image_once(url: str, min_source_bytes: int = DEFAULT_MIN_SOURCE_BYTES) -> bytes:
    request = Request(
        url,
        headers={
            "User-Agent": "Irha-Apparels-Media-Sync/2.0",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
    )
    with urlopen(request, timeout=60) as response:
        content_type = response.headers.get_content_type()
        payload = response.read()
    if not content_type.startswith("image/"):
        raise RuntimeError(f"Expected image, received {content_type} from {url}")
    if len(payload) < min_source_bytes:
        raise RuntimeError(
            f"Image payload too small ({len(payload)} bytes; minimum {min_source_bytes}) from {url}"
        )
    return payload


def fetch_image(
    url: str,
    min_source_bytes: int = DEFAULT_MIN_SOURCE_BYTES,
    attempts: int = DEFAULT_FETCH_ATTEMPTS,
) -> bytes:
    last_error = None
    for attempt in range(1, attempts + 1):
        try:
            return fetch_image_once(url, min_source_bytes)
        except Exception as error:
            last_error = error
            if attempt < attempts:
                delay = min(8, attempt * 2)
                print(f"Retrying media fetch in {delay}s ({attempt}/{attempts}): {url} · {error}")
                time.sleep(delay)
    raise RuntimeError(f"Unable to fetch image after {attempts} attempts from {url}: {last_error}")


def load_products() -> dict[str, list[dict]]:
    manifest_paths = [BASE_MANIFEST, *sorted(MANIFEST_ROOT.glob(BATCH_MANIFEST_GLOB))]
    products: dict[str, list[dict]] = {}

    for path in manifest_paths:
        manifest = json.loads(path.read_text(encoding="utf-8"))
        for slug, items in manifest.get("products", {}).items():
            if slug in products:
                raise RuntimeError(f"Duplicate product slug {slug!r} found in {path}")
            if not isinstance(items, list) or not items:
                raise RuntimeError(f"Product {slug!r} in {path} has no media items")
            products[slug] = items

    if not products:
        raise RuntimeError("No product media entries were found in repository manifests")
    return products


def output_path_for(slug: str, item: dict) -> Path:
    file_name = str(item.get("file") or "").strip()
    if not file_name or Path(file_name).name != file_name:
        raise RuntimeError(f"Unsafe or missing media filename for {slug}: {file_name!r}")
    return OUTPUT_ROOT / slug / file_name


def sync_item(slug: str, item: dict) -> None:
    output_path = output_path_for(slug, item)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    min_source_bytes = int(item.get("min_source_bytes", DEFAULT_MIN_SOURCE_BYTES))
    min_optimized_bytes = int(item.get("min_optimized_bytes", DEFAULT_MIN_OPTIMIZED_BYTES))

    if min_source_bytes < 1 or min_optimized_bytes < 1:
        raise RuntimeError(f"Invalid media thresholds for {slug}/{item.get('file')}")

    if output_path.exists() and output_path.stat().st_size >= min_optimized_bytes and not item.get("refresh"):
        print(f"Kept existing {slug}/{item['file']} ({output_path.stat().st_size} bytes)")
        return

    payload = None
    source_errors: list[str] = []
    for url in (item.get("source"), item.get("fallback")):
        if not url:
            continue
        try:
            payload = fetch_image(str(url), min_source_bytes)
            break
        except Exception as error:
            source_errors.append(str(error))
    if payload is None:
        raise RuntimeError(
            f"Unable to fetch {slug}/{item['file']} from all registered sources: {' | '.join(source_errors)}"
        )

    try:
        with Image.open(io.BytesIO(payload)) as image:
            image = ImageOps.exif_transpose(image)
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGB")
            image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
            image.save(output_path, "WEBP", quality=82, method=5)
    except Exception:
        output_path.unlink(missing_ok=True)
        raise

    size = output_path.stat().st_size
    if size < min_optimized_bytes:
        output_path.unlink(missing_ok=True)
        raise RuntimeError(
            f"Optimized file too small: {output_path} ({size} bytes; minimum {min_optimized_bytes})"
        )
    print(f"Synced {slug}/{item['file']} ({size} bytes)")


def verify_outputs(products: dict[str, list[dict]]) -> tuple[int, int]:
    product_count = len(products)
    file_count = 0
    failures: list[str] = []

    for slug, items in products.items():
        for item in items:
            file_count += 1
            output_path = output_path_for(slug, item)
            min_optimized_bytes = int(item.get("min_optimized_bytes", DEFAULT_MIN_OPTIMIZED_BYTES))
            if not output_path.exists():
                failures.append(f"missing: {output_path}")
                continue
            size = output_path.stat().st_size
            if size < min_optimized_bytes:
                failures.append(
                    f"undersized: {output_path} ({size} bytes; minimum {min_optimized_bytes})"
                )
                continue
            try:
                with Image.open(output_path) as image:
                    image.verify()
            except Exception as error:
                failures.append(f"invalid image: {output_path} ({error})")

    if failures:
        preview = "\n".join(f"- {failure}" for failure in failures[:50])
        remainder = len(failures) - min(len(failures), 50)
        suffix = f"\n- …and {remainder} more" if remainder > 0 else ""
        raise RuntimeError(
            f"Product media completeness verification failed ({len(failures)} files):\n{preview}{suffix}"
        )

    print(f"Verified complete product media: products={product_count} files={file_count}")
    return product_count, file_count


def main() -> None:
    products = load_products()
    for slug, items in products.items():
        for item in items:
            sync_item(slug, item)
    verify_outputs(products)


if __name__ == "__main__":
    main()
