import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { BuyerReadyCatalogRoute } from "./generate-buyer-ready-catalog-manifest";
import {
  localizedAudienceName,
  localizedCollectionName,
  localizedTaxonomySeo,
  localizedTopName,
} from "../src/lib/taxonomyI18n";

const CATALOG_MANIFEST_PATH = resolve("public/catalog-route-manifest.json");
const SEO_MANIFEST_PATH = resolve("public/seo-route-manifest.json");
const EXPECTED_PRODUCTS = 254;
const EXPECTED_TAXONOMY = 105;

type CatalogManifest = {
  schemaVersion: number;
  productCount: number;
  products: BuyerReadyCatalogRoute[];
};

type SeoRoute = {
  path: string;
  locale: string;
  indexable: boolean;
  sitemap: boolean;
  routeType: string;
  title: string;
  description: string;
  h1: string;
};

type SeoManifest = {
  schemaVersion: number;
  routeCount: number;
  sitemapCount: number;
  productCount: number;
  routes: SeoRoute[];
};

type TaxonomySeoInput = {
  topName: string;
  audienceName?: string;
  collectionName?: string;
};

const catalog = JSON.parse(readFileSync(CATALOG_MANIFEST_PATH, "utf8")) as CatalogManifest;
const manifest = JSON.parse(readFileSync(SEO_MANIFEST_PATH, "utf8")) as SeoManifest;

if (
  catalog.schemaVersion !== 1
  || catalog.productCount !== EXPECTED_PRODUCTS
  || catalog.products.length !== EXPECTED_PRODUCTS
  || manifest.schemaVersion !== 1
  || manifest.productCount !== EXPECTED_PRODUCTS
  || manifest.routeCount !== manifest.routes.length
) {
  throw new Error("Taxonomy SEO alignment requires the complete authoritative 254-product manifests");
}

const taxonomy = new Map<string, TaxonomySeoInput>();
for (const product of catalog.products) {
  const topName = localizedTopName("en", product.main_category_slug, product.main_category_name);
  const audienceName = localizedAudienceName("en", product.audience_slug, product.audience_name);
  const collectionName = localizedCollectionName("en", product.product_type_slug, product.product_type_name);
  const rootPath = `/products/${product.main_category_slug}`;
  const audiencePath = `${rootPath}/${product.audience_slug}`;
  const collectionPath = `${audiencePath}/${product.product_type_slug}`;

  taxonomy.set(rootPath, { topName });
  taxonomy.set(audiencePath, { topName, audienceName });
  taxonomy.set(collectionPath, { topName, audienceName, collectionName });
}

if (taxonomy.size !== EXPECTED_TAXONOMY) {
  throw new Error(`Expected ${EXPECTED_TAXONOMY} taxonomy routes, found ${taxonomy.size}`);
}

let aligned = 0;
for (const route of manifest.routes) {
  const input = taxonomy.get(route.path);
  if (!input) continue;
  if (!route.indexable || !route.sitemap || route.locale !== "en") {
    throw new Error(`Canonical taxonomy route is not published as an English sitemap route: ${route.path}`);
  }
  if (!["main-division", "audience-group", "product-type"].includes(route.routeType)) {
    throw new Error(`Unexpected taxonomy route owner ${route.routeType}: ${route.path}`);
  }
  const seo = localizedTaxonomySeo({ locale: "en", ...input });
  route.title = seo.title;
  route.description = seo.description;
  route.h1 = seo.h1;
  aligned += 1;
}

if (aligned !== EXPECTED_TAXONOMY) {
  throw new Error(`Aligned ${aligned}/${EXPECTED_TAXONOMY} taxonomy routes`);
}

const titleOwners = new Map<string, string>();
const descriptionOwners = new Map<string, string>();
for (const route of manifest.routes.filter((candidate) => candidate.indexable && candidate.sitemap)) {
  const titleKey = `${route.locale}:${route.title.toLowerCase().replace(/\s+/g, " ").trim()}`;
  const descriptionKey = `${route.locale}:${route.description.toLowerCase().replace(/\s+/g, " ").trim()}`;
  const titleOwner = titleOwners.get(titleKey);
  const descriptionOwner = descriptionOwners.get(descriptionKey);
  if (titleOwner && titleOwner !== route.path) {
    throw new Error(`Taxonomy alignment created duplicate title: ${titleOwner} and ${route.path}`);
  }
  if (descriptionOwner && descriptionOwner !== route.path) {
    throw new Error(`Taxonomy alignment created duplicate description: ${descriptionOwner} and ${route.path}`);
  }
  titleOwners.set(titleKey, route.path);
  descriptionOwners.set(descriptionKey, route.path);
}

writeFileSync(SEO_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Aligned ${aligned} authoritative taxonomy routes with the shared React SEO source`);
