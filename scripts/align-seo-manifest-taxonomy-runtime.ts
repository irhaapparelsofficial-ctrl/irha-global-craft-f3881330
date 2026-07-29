import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { BuyerReadyCatalogRoute } from "./generate-buyer-ready-catalog-manifest";
import type { SeoRouteEntry } from "./finalize-seo-route-manifest";
import {
  localizedAudienceName,
  localizedCollectionName,
  localizedTaxonomySeo,
  localizedTopName,
} from "../src/lib/taxonomyI18n";

const CATALOG_PATH = resolve("public/catalog-route-manifest.json");
const SEO_PATH = resolve("public/seo-route-manifest.json");

type CatalogManifest = {
  schemaVersion: number;
  productCount: number;
  products: BuyerReadyCatalogRoute[];
};

type SeoManifest = {
  schemaVersion: number;
  routeCount: number;
  sitemapCount: number;
  productCount: number;
  taxonomyCount: number;
  routes: SeoRouteEntry[];
};

type TaxonomyIdentity = {
  categorySlug: string;
  categoryName: string;
  audienceSlug?: string;
  audienceName?: string;
  productTypeSlug?: string;
  productTypeName?: string;
};

function taxonomyIdentity(products: BuyerReadyCatalogRoute[]): Map<string, TaxonomyIdentity> {
  const identities = new Map<string, TaxonomyIdentity>();
  for (const product of products) {
    const categoryPath = `/products/${product.main_category_slug}`;
    const audiencePath = `${categoryPath}/${product.audience_slug}`;
    const productTypePath = `${audiencePath}/${product.product_type_slug}`;
    identities.set(categoryPath, {
      categorySlug: product.main_category_slug,
      categoryName: product.main_category_name,
    });
    identities.set(audiencePath, {
      categorySlug: product.main_category_slug,
      categoryName: product.main_category_name,
      audienceSlug: product.audience_slug,
      audienceName: product.audience_name,
    });
    identities.set(productTypePath, {
      categorySlug: product.main_category_slug,
      categoryName: product.main_category_name,
      audienceSlug: product.audience_slug,
      audienceName: product.audience_name,
      productTypeSlug: product.product_type_slug,
      productTypeName: product.product_type_name,
    });
  }
  return identities;
}

function main() {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as CatalogManifest;
  const seo = JSON.parse(readFileSync(SEO_PATH, "utf8")) as SeoManifest;
  if (catalog.schemaVersion !== 1 || catalog.productCount !== 254 || catalog.products.length !== 254) {
    throw new Error("Taxonomy SEO alignment requires the complete 254-product catalogue manifest");
  }
  if (seo.schemaVersion !== 1 || !Array.isArray(seo.routes)) {
    throw new Error("Taxonomy SEO alignment requires the authoritative SEO manifest");
  }

  const identities = taxonomyIdentity(catalog.products);
  let aligned = 0;
  const routes = seo.routes.map((route) => {
    if (!["main-division", "audience-group", "product-type"].includes(route.routeType) || route.path === "/products") {
      return route;
    }
    const identity = identities.get(route.path);
    if (!identity) throw new Error(`Taxonomy route is absent from the catalogue hierarchy: ${route.path}`);
    const topName = localizedTopName("en", identity.categorySlug, identity.categoryName);
    const audienceName = identity.audienceSlug
      ? localizedAudienceName("en", identity.audienceSlug, identity.audienceName || identity.audienceSlug)
      : undefined;
    const collectionName = identity.productTypeSlug
      ? localizedCollectionName("en", identity.productTypeSlug, identity.productTypeName || identity.productTypeSlug)
      : undefined;
    const metadata = localizedTaxonomySeo({ locale: "en", topName, audienceName, collectionName });
    aligned += 1;
    return {
      ...route,
      title: metadata.title,
      description: metadata.description,
      h1: metadata.h1,
    };
  });

  if (aligned !== seo.taxonomyCount) {
    throw new Error(`Expected to align ${seo.taxonomyCount} taxonomy routes, aligned ${aligned}`);
  }
  const next: SeoManifest = { ...seo, routes };
  writeFileSync(SEO_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(`Aligned ${aligned} taxonomy routes with the shared client metadata contract`);
}

main();
