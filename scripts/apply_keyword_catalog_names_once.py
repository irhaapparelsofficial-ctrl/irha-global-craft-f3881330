#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"{path}: expected exactly one match, found {count}: {old[:120]!r}"
        )
    path.write_text(text.replace(old, new, 1))


public_catalog = ROOT / "src/hooks/usePublicCatalog.ts"
replace_once(
    public_catalog,
    'import { PRODUCT_SEO_OVERRIDES } from "@/lib/productSeoOverrides";\n',
    'import { PRODUCT_SEO_OVERRIDES } from "@/lib/productSeoOverrides";\n'
    'import {\n'
    '  keywordLedProductName,\n'
    '  keywordLedSubcategoryName,\n'
    '  keywordLedTopCategoryName,\n'
    '} from "@/lib/catalogSearchNames";\n',
)

replace_once(
    public_catalog,
    '''const TOP_CONFIG = [
  { slug: "bavarian-trachten-wear", name: "Bavarian Trachten Wear", short: "Lederhosen, Dirndls & Trachten", sources: ["bavarian"] },
  { slug: "premium-leather-apparel", name: "Premium Leather Apparel", short: "Custom Leather Garments", sources: ["leatherwear"] },
  { slug: "sportswear", name: "Sportswear", short: "Custom Teamwear & Performance Apparel", sources: ["sportswear"] },
  { slug: "streetwear-activewear", name: "Streetwear & Activewear", short: "Private-Label Urban & Performance Apparel", sources: ["streetwear"] },
  { slug: "leisure-nightwear", name: "Leisurewear & Nightwear", short: "Casual, Lounge & Sleepwear Programs", sources: ["leisurewear", "nightwear"] },
] as const;
''',
    '''const TOP_CONFIG = [
  {
    slug: "bavarian-trachten-wear",
    name: "Bavarian & Trachten Wear",
    short: "Lederhosen, Dirndl & Trachten Manufacturer",
    sources: ["bavarian"],
  },
  {
    slug: "premium-leather-apparel",
    name: "Premium Leather Apparel",
    short: "Custom Leather Jackets, Garments & Accessories",
    sources: ["leatherwear"],
  },
  {
    slug: "sportswear",
    name: "Custom Sportswear & Teamwear",
    short: "Custom Team Uniforms, Jerseys & Performance Wear",
    sources: ["sportswear"],
  },
  {
    slug: "streetwear-activewear",
    name: "Streetwear & Activewear",
    short: "Private Label Hoodies, T-Shirts, Joggers & Activewear",
    sources: ["streetwear"],
  },
  {
    slug: "leisure-nightwear",
    name: "Leisurewear & Nightwear",
    short: "Private Label Casualwear, Loungewear & Sleepwear",
    sources: ["leisurewear", "nightwear"],
  },
] as const;
''',
)

replace_once(
    public_catalog,
    '''function sanitizePublicProduct(product: DbProduct): DbProduct {
  const details = (Array.isArray(product.details) ? product.details : []).filter(
''',
    '''function sanitizePublicProduct(product: DbProduct): DbProduct {
  const name = keywordLedProductName(product.slug, product.name);
  const details = (Array.isArray(product.details) ? product.details : []).filter(
''',
)
replace_once(
    public_catalog,
    '''  return {
    ...product,
    image_url: product.image_url ?? gallery[0] ?? null,
''',
    '''  return {
    ...product,
    name,
    image_url: product.image_url ?? gallery[0] ?? null,
''',
)

replace_once(
    public_catalog,
    '''function legacyProductToDb(product: LegacyProduct, categoryId: string, sortOrder: number): DbProduct {
  const productSlug = slugify(product.name);
  const gallery = uniqueStrings([product.image, ...(product.gallery ?? [])].filter(Boolean));
''',
    '''function legacyProductToDb(product: LegacyProduct, categoryId: string, sortOrder: number): DbProduct {
  const productSlug = slugify(product.name);
  const productName = keywordLedProductName(productSlug, product.name);
  const gallery = uniqueStrings([product.image, ...(product.gallery ?? [])].filter(Boolean));
''',
)
replace_once(public_catalog, '    name: product.name,\n', '    name: productName,\n')
replace_once(
    public_catalog,
    '    seo_title: override?.seoTitle ?? `${product.name} Manufacturer | Irha Apparels`,\n',
    '    seo_title: override?.seoTitle ?? `${productName} Manufacturer | Irha Apparels`,\n',
)
replace_once(
    public_catalog,
    '      `${product.name} for wholesale, OEM and private-label buyer programs from Irha Apparels, an experienced B2B garment manufacturer in Sialkot, Pakistan.`,\n',
    '      `${productName} for wholesale, OEM and private-label buyer programs from Irha Apparels, an experienced B2B garment manufacturer in Sialkot, Pakistan.`,\n',
)

replace_once(
    public_catalog,
    '''  const slug = canonicalSubSlug(group.slug, sub.slug, mergedTop);
  const id = `local-category-${top.slug}-${slug}`;
  const name = mergedTop ? `${group.name}: ${sub.name}` : sub.name;
''',
    '''  const slug = canonicalSubSlug(group.slug, sub.slug, mergedTop);
  const id = `local-category-${top.slug}-${slug}`;
  const sourceName = mergedTop ? `${group.name}: ${sub.name}` : sub.name;
  const name = keywordLedSubcategoryName(top.slug, slug, sourceName);
''',
)

replace_once(
    public_catalog,
    '''      const topReleasedSubs = releasedSubs.filter((category) => category.parent_slug === top.slug);
''',
    '''      top.name = keywordLedTopCategoryName(top.slug, top.name);

      const topReleasedSubs = releasedSubs.filter((category) => category.parent_slug === top.slug);
''',
)

replace_once(
    public_catalog,
    '''        top.subs.push({
          ...localSub,
          ...(releasedSub || {}),
          parent_id: top.id,
          products,
        });
''',
    '''        const mergedSub: PublicSubCategory = {
          ...localSub,
          ...(releasedSub || {}),
          parent_id: top.id,
          products,
        };
        mergedSub.name = keywordLedSubcategoryName(top.slug, categorySlug, mergedSub.name);
        top.subs.push(mergedSub);
''',
)

replace_once(
    public_catalog,
    '''        top.subs.push({ ...releasedSub, parent_id: top.id, products });
''',
    '''        top.subs.push({
          ...releasedSub,
          parent_id: top.id,
          name: keywordLedSubcategoryName(top.slug, releasedSub.slug, releasedSub.name),
          products,
        });
''',
)

public_category_data = ROOT / "src/hooks/usePublicCategoryData.ts"
replace_once(
    public_category_data,
    'import { thumbnailUrl } from "@/lib/imageThumbnails";\n',
    'import { thumbnailUrl } from "@/lib/imageThumbnails";\n'
    'import { keywordLedProductName } from "@/lib/catalogSearchNames";\n',
)
replace_once(
    public_category_data,
    '''  const isAutoGeneratedLegacyProduct = p.id.startsWith("local-product-");

  return {
''',
    '''  const isAutoGeneratedLegacyProduct = p.id.startsWith("local-product-");
  const productName = keywordLedProductName(p.slug, p.name);

  return {
''',
)
replace_once(public_category_data, '    name: p.name,\n', '    name: productName,\n')
replace_once(
    public_category_data,
    '''    description: isAutoGeneratedLegacyProduct
      ? safeLegacyDescription(p.name)
      : p.description ?? safeLegacyDescription(p.name),
''',
    '''    description: isAutoGeneratedLegacyProduct
      ? safeLegacyDescription(productName)
      : p.description ?? safeLegacyDescription(productName),
''',
)
replace_once(
    public_category_data,
    '''function legacyAdaptProduct(product: LegacyProduct): NormalizedProduct {
  const slug = slugify(product.name);
  const baseGallery = product.gallery?.length ? product.gallery : product.image ? [product.image] : [];
''',
    '''function legacyAdaptProduct(product: LegacyProduct): NormalizedProduct {
  const slug = slugify(product.name);
  const productName = keywordLedProductName(slug, product.name);
  const baseGallery = product.gallery?.length ? product.gallery : product.image ? [product.image] : [];
''',
)
replace_once(
    public_category_data,
    '''    ...product,
    slug,
    image: thumbnailUrl(heroImage),
''',
    '''    ...product,
    slug,
    name: productName,
    image: thumbnailUrl(heroImage),
''',
)
replace_once(
    public_category_data,
    '    description: safeLegacyDescription(product.name),\n',
    '    description: safeLegacyDescription(productName),\n',
)

print("Applied keyword-led catalog names with stable canonical slugs.")
