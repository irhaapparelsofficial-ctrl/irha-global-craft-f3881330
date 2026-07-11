from __future__ import annotations

import json
from pathlib import Path


def drive_item(file_id: str, filename: str) -> dict[str, str]:
    return {
        "source": f"https://drive.google.com/uc?export=download&id={file_id}",
        "fallback": f"https://drive.google.com/thumbnail?id={file_id}&sz=w1600",
        "file": filename,
    }


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def insert_media(items: list[dict], item: dict, index: int) -> list[dict]:
    source = item["source"]
    filename = item["file"]
    cleaned = [entry for entry in items if entry.get("source") != source and entry.get("file") != filename]
    cleaned.insert(min(index, len(cleaned)), item)
    return cleaned


def replace_once(path: Path, old: str, new: str, marker: str | None = None) -> None:
    content = path.read_text(encoding="utf-8")
    if marker and marker in content:
        return
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one replacement target in {path}; found {count}")
    path.write_text(content.replace(old, new, 1), encoding="utf-8")


base_manifest_path = Path("scripts/product-media-manifest.json")
base_manifest = json.loads(base_manifest_path.read_text(encoding="utf-8"))
base_products = base_manifest["products"]

# Correct an earlier cross-product mix: image 57 belongs to the new floral suspender family,
# not Antique Brown Scroll-Embroidered Short Lederhosen.
base_products["antique-brown-scroll-embroidered-short-lederhosen"] = [
    item
    for item in base_products["antique-brown-scroll-embroidered-short-lederhosen"]
    if "1KvU7mlfmln0FiCCJzkpSVLjI91XyfFE-" not in item.get("source", "")
]

base_products["dark-brown-ivory-embroidered-short-lederhosen"] = insert_media(
    base_products["dark-brown-ivory-embroidered-short-lederhosen"],
    drive_item("15mb4kCvCZStbOBt0N_wL1ATkg3F1AkDM", "03-angle-back.webp"),
    1,
)
base_products["light-tan-ornamental-embroidered-short-lederhosen"] = insert_media(
    base_products["light-tan-ornamental-embroidered-short-lederhosen"],
    drive_item("1zLJJ2pX8yzSHobuLnrugl8_hxKdX5q8T", "03-angle-back.webp"),
    1,
)
write_json(base_manifest_path, base_manifest)

batch02_path = Path("scripts/product-media-batch-02.json")
batch02 = json.loads(batch02_path.read_text(encoding="utf-8"))
batch02_products = batch02["products"]
batch02_products["dark-brown-minimal-side-embroidered-short-lederhosen"] = insert_media(
    batch02_products["dark-brown-minimal-side-embroidered-short-lederhosen"],
    drive_item("1zsEC27VyLcUu_KdcY7sSrPLiAIJqhkDu", "03-angle-back.webp"),
    1,
)
write_json(batch02_path, batch02)

batch03 = {
    "products": {
        "vintage-brown-minimal-side-embroidered-short-lederhosen": [
            drive_item("1fzaFzv8wlniJcv9XB6DyI3N0csBUKSUY", "01-hero-front.webp"),
            drive_item("1GCDtySy20BYFqRd2MSdXBAACyKAtWsnQ", "03-angle-back.webp"),
            drive_item("1E7IYdmAXSz6fy5Qz-3HA9vawoWTanVYu", "04-detail-waist-construction.webp"),
            drive_item("1IH9TdCTuBipFzSL9gKfmp8vfSXvNT6Sd", "05-detail-side-embroidery.webp"),
        ],
        "dark-brown-eagle-embroidered-suspender-short-lederhosen": [
            drive_item("1BjAuaZ-b55mVWHS0eUg40_soPID6OtnI", "01-hero-front-with-suspenders.webp"),
            drive_item("1CH1nrkJ__h4cF19CtPSKQwPGwPdSXAF6", "03-angle-back.webp"),
            drive_item("1NeBMeG0SDiA3IO-cG31lTOwaFSb1FYpi", "04-detail-eagle-embroidery.webp"),
        ],
        "dark-brown-floral-ornamental-suspender-short-lederhosen": [
            drive_item("1pqi3Dml4xltVx0YjHkiWmTSEK_lOIUlM", "01-hero-front-with-suspenders.webp"),
            drive_item("1PCGG6_oaIUg7K4OggWNGqCGPrck68XRb", "03-angle-back-with-suspenders.webp"),
            drive_item("1i-1YtT85RprJRENPTn8DGIfqXic_FbBp", "04-front-embroidery-detail.webp"),
            drive_item("1XaFIZiDHuC1j5cXPQvvLKXhdy-UCvjUJ", "05-detail-suspender-panel.webp"),
            drive_item("1KvU7mlfmln0FiCCJzkpSVLjI91XyfFE-", "06-front-without-suspender-panel.webp"),
        ],
    }
}
write_json(Path("scripts/product-media-batch-03.json"), batch03)

product_media_path = Path("src/lib/productRealMedia.ts")
product_media = product_media_path.read_text(encoding="utf-8")
product_media = product_media.replace(
    '      "/product-media/antique-brown-scroll-embroidered-short-lederhosen/05-detail-front-construction.webp",\n',
    "",
)
product_media_path.write_text(product_media, encoding="utf-8")
replace_once(
    product_media_path,
    '      "/product-media/dark-brown-ivory-embroidered-short-lederhosen/01-hero-front-with-suspenders.webp",\n'
    '      "/product-media/dark-brown-ivory-embroidered-short-lederhosen/04-detail-suspender-embroidery.webp",',
    '      "/product-media/dark-brown-ivory-embroidered-short-lederhosen/01-hero-front-with-suspenders.webp",\n'
    '      "/product-media/dark-brown-ivory-embroidered-short-lederhosen/03-angle-back.webp",\n'
    '      "/product-media/dark-brown-ivory-embroidered-short-lederhosen/04-detail-suspender-embroidery.webp",',
    '/product-media/dark-brown-ivory-embroidered-short-lederhosen/03-angle-back.webp',
)
replace_once(
    product_media_path,
    '      "/product-media/light-tan-ornamental-embroidered-short-lederhosen/01-hero-front.webp",\n'
    '      "/product-media/light-tan-ornamental-embroidered-short-lederhosen/04-detail-front-flap.webp",',
    '      "/product-media/light-tan-ornamental-embroidered-short-lederhosen/01-hero-front.webp",\n'
    '      "/product-media/light-tan-ornamental-embroidered-short-lederhosen/03-angle-back.webp",\n'
    '      "/product-media/light-tan-ornamental-embroidered-short-lederhosen/04-detail-front-flap.webp",',
    '/product-media/light-tan-ornamental-embroidered-short-lederhosen/03-angle-back.webp',
)

batch02_catalog_path = Path("src/lib/supplementalCatalogBatch02.ts")
replace_once(
    batch02_catalog_path,
    '      "/product-media/dark-brown-minimal-side-embroidered-short-lederhosen/01-hero-front.webp",\n'
    '      "/product-media/dark-brown-minimal-side-embroidered-short-lederhosen/04-detail-upper-construction.webp",',
    '      "/product-media/dark-brown-minimal-side-embroidered-short-lederhosen/01-hero-front.webp",\n'
    '      "/product-media/dark-brown-minimal-side-embroidered-short-lederhosen/03-angle-back.webp",\n'
    '      "/product-media/dark-brown-minimal-side-embroidered-short-lederhosen/04-detail-upper-construction.webp",',
    '/product-media/dark-brown-minimal-side-embroidered-short-lederhosen/03-angle-back.webp',
)

batch03_catalog = '''import type { DbProduct } from "@/hooks/useCatalog";

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

type BatchProduct = {
  idSuffix: number;
  slug: string;
  name: string;
  description: string;
  specs: string[];
  shortDescription: string;
  sortOrder: number;
  gallery: string[];
};

const PRODUCTS: BatchProduct[] = [
  {
    idSuffix: 86,
    slug: "vintage-brown-minimal-side-embroidered-short-lederhosen",
    name: "Vintage Brown Minimal Side-Embroidered Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a vintage-brown colourway with clean front construction, subtle side embroidery and adjustable rear-waist lacing, prepared for wholesale and private-label buyer programs.",
    specs: ["Vintage-brown visual finish", "Subtle side embroidery", "Clean front construction", "Adjustable rear-waist lacing", "Private-label customization available"],
    shortDescription: "Vintage brown minimal side-embroidered short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1020,
    gallery: [
      "/product-media/vintage-brown-minimal-side-embroidered-short-lederhosen/01-hero-front.webp",
      "/product-media/vintage-brown-minimal-side-embroidered-short-lederhosen/03-angle-back.webp",
      "/product-media/vintage-brown-minimal-side-embroidered-short-lederhosen/04-detail-waist-construction.webp",
      "/product-media/vintage-brown-minimal-side-embroidered-short-lederhosen/05-detail-side-embroidery.webp",
    ],
  },
  {
    idSuffix: 87,
    slug: "dark-brown-eagle-embroidered-suspender-short-lederhosen",
    name: "Dark Brown Eagle-Embroidered Suspender Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a dark-brown colourway with statement eagle embroidery, ornamental front-panel detailing, matching suspenders and adjustable side ties, prepared for wholesale and private-label buyer programs.",
    specs: ["Statement eagle embroidery", "Dark-brown visual finish", "Ornamental front-panel detailing", "Matching suspenders", "Private-label customization available"],
    shortDescription: "Dark brown eagle-embroidered suspender short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1021,
    gallery: [
      "/product-media/dark-brown-eagle-embroidered-suspender-short-lederhosen/01-hero-front-with-suspenders.webp",
      "/product-media/dark-brown-eagle-embroidered-suspender-short-lederhosen/03-angle-back.webp",
      "/product-media/dark-brown-eagle-embroidered-suspender-short-lederhosen/04-detail-eagle-embroidery.webp",
    ],
  },
  {
    idSuffix: 88,
    slug: "dark-brown-floral-ornamental-suspender-short-lederhosen",
    name: "Dark Brown Floral-Ornamental Suspender Short Lederhosen",
    description: "Short-cut Bavarian-style Lederhosen in a dark-brown colourway with floral-ornamental embroidery, decorative front-panel construction and matching suspenders, prepared for wholesale and private-label buyer programs.",
    specs: ["Floral-ornamental embroidery", "Dark-brown visual finish", "Decorative front-panel construction", "Matching suspenders", "Private-label customization available"],
    shortDescription: "Dark brown floral-ornamental suspender short Lederhosen for wholesale, OEM, ODM and private-label programs.",
    sortOrder: 1022,
    gallery: [
      "/product-media/dark-brown-floral-ornamental-suspender-short-lederhosen/01-hero-front-with-suspenders.webp",
      "/product-media/dark-brown-floral-ornamental-suspender-short-lederhosen/03-angle-back-with-suspenders.webp",
      "/product-media/dark-brown-floral-ornamental-suspender-short-lederhosen/04-front-embroidery-detail.webp",
      "/product-media/dark-brown-floral-ornamental-suspender-short-lederhosen/05-detail-suspender-panel.webp",
      "/product-media/dark-brown-floral-ornamental-suspender-short-lederhosen/06-front-without-suspender-panel.webp",
    ],
  },
];

function createProduct(product: BatchProduct, categoryId: string): DbProduct {
  return {
    id: `00000000-0000-0000-0000-${String(product.idSuffix).padStart(12, "0")}`,
    category_id: categoryId,
    slug: product.slug,
    name: product.name,
    description: product.description,
    image_url: product.gallery[0] ?? null,
    gallery: product.gallery,
    specs: product.specs,
    details: [],
    material_specifications: null,
    seo_title: `${product.name} Manufacturer | Irha Apparels`,
    seo_description: `${product.name} for wholesale and private-label programs from Irha Apparels, a B2B apparel manufacturer in Sialkot, Pakistan.`,
    sort_order: product.sortOrder,
    is_published: true,
    sku: null,
    is_featured: false,
    short_description: product.shortDescription,
    moq_display: null,
    moq_min: null,
    sample_available: null,
    sample_timeline: null,
    production_timeline: null,
    country_of_origin: null,
    primary_material: null,
    fabric_composition: null,
    gsm: null,
    available_sizes: [],
    size_notes: null,
    available_colors: [],
    custom_colors: null,
    customization: {},
    packaging_standard: null,
    packaging_custom: null,
    related_product_ids: [],
  };
}

export function createSupplementalBatch03ProductsForSubcategory(
  topCategorySlug: string,
  subSlug: string,
  subName: string,
  categoryId: string,
): DbProduct[] {
  const isMensTrachten =
    topCategorySlug === "bavarian-trachten-wear" &&
    (subSlug === "men" || normalize(subName) === "menstrachten");

  return isMensTrachten ? PRODUCTS.map((product) => createProduct(product, categoryId)) : [];
}
'''
Path("src/lib/supplementalCatalogBatch03.ts").write_text(batch03_catalog, encoding="utf-8")

public_catalog_path = Path("src/hooks/usePublicCatalog.ts")
replace_once(
    public_catalog_path,
    'import { createSupplementalBatch02ProductsForSubcategory } from "@/lib/supplementalCatalogBatch02";\n',
    'import { createSupplementalBatch02ProductsForSubcategory } from "@/lib/supplementalCatalogBatch02";\n'
    'import { createSupplementalBatch03ProductsForSubcategory } from "@/lib/supplementalCatalogBatch03";\n',
    'createSupplementalBatch03ProductsForSubcategory',
)
replace_once(
    public_catalog_path,
    '    ...createSupplementalBatch02ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),\n',
    '    ...createSupplementalBatch02ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),\n'
    '    ...createSupplementalBatch03ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),\n',
    '...createSupplementalBatch03ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id)',
)

print("Short Lederhosen final batch and gallery corrections prepared.")
