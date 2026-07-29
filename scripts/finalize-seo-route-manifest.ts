import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { BuyerReadyCatalogRoute } from "./generate-buyer-ready-catalog-manifest";
import { SEO_BUYER_INTENT_LANDING_PAGES } from "../src/lib/buyerIntentSeoPages";
import { MARKET_PAGES } from "../src/lib/marketPages";
import {
  LOCALIZED_ROUTE_REGISTRY,
  LOCALE_REGISTRY,
  normalizeRoutePath,
  type LocaleCode,
} from "../src/lib/i18nFoundation";
import {
  OWNER_SUPABASE_PUBLISHABLE_KEY,
  OWNER_SUPABASE_URL,
} from "../src/integrations/supabase/ownerRuntime";

const SITE_URL = "https://irhaapparels.com";
const CATALOG_MANIFEST_PATH = resolve("public/catalog-route-manifest.json");
const SEO_MANIFEST_PATH = resolve("public/seo-route-manifest.json");
const SITEMAP_PATH = resolve("public/sitemap.xml");

export type SeoRouteType =
  | "homepage"
  | "main-division"
  | "audience-group"
  | "product-type"
  | "individual-product"
  | "materials"
  | "buyer-information"
  | "about"
  | "manufacturing"
  | "inquiry-rfq"
  | "legal"
  | "localized-market"
  | "resource-index"
  | "resource-article"
  | "utility";

export type SeoRouteEntry = {
  id: string;
  routeType: SeoRouteType;
  path: string;
  canonicalUrl: string;
  locale: string;
  equivalentGroup: string | null;
  indexable: boolean;
  sitemap: boolean;
  title: string;
  description: string;
  h1: string;
  staticShellRenderer: string;
  clientComponent: string;
  structuredDataType: string;
  breadcrumbPaths: string[];
  parentPath: string | null;
  redirectPredecessors: string[];
  alternates: Array<{ hreflang: string; path: string; url: string }>;
  xDefault: string | null;
  lastmod: string | null;
  bodyText?: string;
  image?: string | null;
  productReference?: string;
};

type CatalogManifest = {
  schemaVersion: number;
  productCount: number;
  products: BuyerReadyCatalogRoute[];
};

type BlogPost = {
  slug: string;
  locale: string;
  title: string;
  excerpt: string | null;
  body_md: string | null;
  author: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  cover_image_url: string | null;
  og_image_url: string | null;
  published_at: string | null;
  updated_at: string;
};

type StaticRouteSeed = {
  path: string;
  routeType: SeoRouteType;
  title: string;
  description: string;
  h1: string;
  clientComponent: string;
  structuredDataType?: string;
  parentPath?: string | null;
  locale?: string;
  equivalentGroup?: string | null;
};

const STATIC_ROUTES: StaticRouteSeed[] = [
  {
    path: "/",
    routeType: "homepage",
    title: "Irha Apparels | B2B Apparel Manufacturer in Sialkot, Pakistan",
    description: "Custom OEM, ODM and private-label apparel manufacturing for global brands, wholesalers, importers, retailers, teams and sourcing buyers.",
    h1: "Irha Apparels — Custom Apparel Manufacturer for Global B2B Buyers",
    clientComponent: "Home",
    structuredDataType: "Organization+WebSite",
    equivalentGroup: "homepage",
  },
  {
    path: "/products",
    routeType: "main-division",
    title: "Custom Apparel Manufacturing Categories | Wholesale & Private Label | Irha Apparels",
    description: "Browse five apparel manufacturing divisions, relevant buyer groups, product types and individual styles for B2B quotation.",
    h1: "Main category to buyer-ready product.",
    clientComponent: "GlobalCollectionsPage",
    structuredDataType: "CollectionPage+ItemList+BreadcrumbList",
    parentPath: "/",
  },
  {
    path: "/about",
    routeType: "about",
    title: "About Irha Apparels | Sialkot Manufacturer",
    description: "Learn about Irha Apparels, an experienced custom apparel manufacturer in Sialkot serving global B2B buyers.",
    h1: "About Irha Apparels",
    clientComponent: "About",
    structuredDataType: "AboutPage+Organization+BreadcrumbList",
    parentPath: "/",
  },
  {
    path: "/manufacturing",
    routeType: "manufacturing",
    title: "Custom Apparel Manufacturing Process | Irha Apparels",
    description: "Review the requirement, sampling, customization, production, quality, packing and shipping-review workflow for B2B apparel programs.",
    h1: "Custom Apparel Manufacturing",
    clientComponent: "Manufacturing",
    structuredDataType: "WebPage+BreadcrumbList",
    parentPath: "/",
  },
  {
    path: "/materials",
    routeType: "materials",
    title: "Fabric and Material Library for Custom Apparel | Irha Apparels",
    description: "Review material directions for custom apparel programs. Final composition, weight, finish and availability are confirmed against the buyer brief.",
    h1: "Fabric and Material Library",
    clientComponent: "BuyerConfidence",
    structuredDataType: "CollectionPage+BreadcrumbList",
    parentPath: "/",
    equivalentGroup: "buyer-material-library",
  },
  {
    path: "/buyer-information",
    routeType: "buyer-information",
    title: "Buyer Information | Logistics, NDA and Order Planning | Irha Apparels",
    description: "Buyer guidance for quotation inputs, Incoterms, destination-dependent delivery, confidentiality, sustainability options and compliance readiness.",
    h1: "Buyer Information",
    clientComponent: "BuyerConfidence",
    structuredDataType: "WebPage+BreadcrumbList",
    parentPath: "/",
    equivalentGroup: "buyer-business-information",
  },
  {
    path: "/buyer-trust",
    routeType: "buyer-information",
    title: "Buyer Trust Center | Irha Apparels",
    description: "Review factory visibility, documentation, communication and buyer-safety practices before starting a manufacturing program.",
    h1: "Buyer Trust Center",
    clientComponent: "BuyerTrust",
    structuredDataType: "WebPage+BreadcrumbList",
    parentPath: "/",
  },
  {
    path: "/factory-video-call",
    routeType: "buyer-information",
    title: "Book a Live Factory Video Call | Irha Apparels",
    description: "Request a scheduled live factory-view video call and discuss a custom apparel manufacturing requirement with the responsible team.",
    h1: "Live Factory Video Call",
    clientComponent: "FactoryVideoCall",
    structuredDataType: "WebPage+BreadcrumbList",
    parentPath: "/buyer-trust",
  },
  {
    path: "/resources",
    routeType: "resource-index",
    title: "B2B Apparel Manufacturing Guides | Irha Apparels",
    description: "Practical buyer guides for specifications, sampling, private labels, materials, decoration, RFQs, Incoterms and manufacturer verification.",
    h1: "B2B Apparel Manufacturing Guides",
    clientComponent: "BuyerResources",
    structuredDataType: "CollectionPage+ItemList+BreadcrumbList",
    parentPath: "/",
  },
  {
    path: "/blog",
    routeType: "resource-index",
    title: "B2B Apparel Buyer Journal | Irha Apparels",
    description: "Buyer-focused guidance about custom apparel development, specifications, samples, private label, quality planning and manufacturer verification.",
    h1: "Practical guidance for B2B apparel programs.",
    clientComponent: "Blog",
    structuredDataType: "CollectionPage+ItemList+BreadcrumbList",
    parentPath: "/resources",
  },
  {
    path: "/faq",
    routeType: "buyer-information",
    title: "Buyer FAQ | Irha Apparels",
    description: "Answers about sampling, MOQ review, private labeling, production, quotation, documentation, packing and export support.",
    h1: "Frequently Asked Buyer Questions",
    clientComponent: "FAQ",
    structuredDataType: "WebPage+BreadcrumbList",
    parentPath: "/resources",
  },
  {
    path: "/compliance",
    routeType: "buyer-information",
    title: "Compliance and Documentation Readiness | Irha Apparels",
    description: "See how buyer compliance requirements, material documentation and third-party evidence are reviewed before commitment.",
    h1: "Compliance and Documentation Readiness",
    clientComponent: "Compliance",
    structuredDataType: "WebPage+BreadcrumbList",
    parentPath: "/buyer-information",
  },
  {
    path: "/inquiry",
    routeType: "inquiry-rfq",
    title: "Request a B2B Apparel Manufacturing Quote | Irha Apparels",
    description: "Send product, quantity, material, branding, packaging and destination requirements for a requirement-led B2B quotation review.",
    h1: "Tell us what you need.",
    clientComponent: "Inquiry",
    structuredDataType: "WebPage+BreadcrumbList",
    parentPath: "/",
  },
  {
    path: "/repeat-order",
    routeType: "inquiry-rfq",
    title: "Repeat Order Request | Irha Apparels",
    description: "Submit a repeat-order request using previous product, artwork, material, size and production references.",
    h1: "Repeat Order Request",
    clientComponent: "RepeatOrder",
    structuredDataType: "WebPage+BreadcrumbList",
    parentPath: "/inquiry",
  },
  {
    path: "/contact",
    routeType: "inquiry-rfq",
    title: "Contact Irha Apparels | B2B Manufacturing",
    description: "Contact Irha Apparels in Sialkot for wholesale, OEM, ODM and private-label apparel manufacturing inquiries.",
    h1: "Let's build together.",
    clientComponent: "Contact",
    structuredDataType: "ContactPage+BreadcrumbList",
    parentPath: "/",
  },
  {
    path: "/privacy-policy",
    routeType: "legal",
    title: "Privacy Policy | Irha Apparels",
    description: "Read how Irha Apparels handles website choices, inquiry details, uploaded files and buyer information.",
    h1: "Privacy Policy",
    clientComponent: "PrivacyPolicy",
    structuredDataType: "WebPage+BreadcrumbList",
    parentPath: "/",
  },
  {
    path: "/terms-of-service",
    routeType: "legal",
    title: "Terms of Service | Irha Apparels",
    description: "Review the terms that apply when using the Irha Apparels website and B2B inquiry services.",
    h1: "Terms of Service",
    clientComponent: "TermsOfService",
    structuredDataType: "WebPage+BreadcrumbList",
    parentPath: "/",
  },
];

const REDIRECT_PREDECESSORS: Record<string, string[]> = {
  "/products": ["/catalogue", "/catalog", "/de/katalog"],
  "/buyer-trust": ["/buyer-trust-center", "/buyer-trust-centre"],
  "/resources": ["/buyer-resources"],
  "/faq": ["/buyer-faq"],
  "/privacy-policy": ["/privacy"],
  "/terms-of-service": ["/terms", "/terms-and-conditions"],
  "/markets/germany": ["/germany"],
  "/markets/austria": ["/austria"],
  "/markets/switzerland": ["/switzerland"],
  "/markets/netherlands": ["/netherlands"],
  "/markets/united-states": ["/usa", "/united-states"],
  "/markets/united-kingdom": ["/uk", "/united-kingdom"],
  "/markets/canada": ["/canada"],
  "/markets/australia": ["/australia"],
  "/markets/new-zealand": ["/new-zealand"],
};

function cleanPath(value: string): string {
  return normalizeRoutePath(value);
}

function canonicalUrl(path: string): string {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

function stableId(routeType: SeoRouteType, path: string): string {
  const slug = path === "/" ? "home" : path.slice(1).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `${routeType}:${slug}`;
}

function localeCode(locale: string): string {
  const normalized = locale.toLowerCase();
  if (normalized.startsWith("de")) return "de";
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("nl")) return "nl";
  return "en";
}

function parentBreadcrumbs(parentPath: string | null): string[] {
  if (!parentPath) return [];
  if (parentPath === "/") return ["/"];
  const segments = parentPath.split("/").filter(Boolean);
  const paths = ["/"];
  let current = "";
  for (const segment of segments) {
    current += `/${segment}`;
    paths.push(current);
  }
  return paths;
}

function createRoute(seed: Omit<SeoRouteEntry, "id" | "canonicalUrl" | "alternates" | "xDefault">): SeoRouteEntry {
  const path = cleanPath(seed.path);
  return {
    ...seed,
    id: stableId(seed.routeType, path),
    path,
    canonicalUrl: canonicalUrl(path),
    alternates: [],
    xDefault: null,
  };
}

function readCatalogManifest(): CatalogManifest {
  const manifest = JSON.parse(readFileSync(CATALOG_MANIFEST_PATH, "utf8")) as CatalogManifest;
  if (manifest.schemaVersion !== 1 || manifest.productCount !== manifest.products.length || manifest.products.length !== 254) {
    throw new Error(`Catalogue manifest is incomplete: ${manifest.products.length} products`);
  }
  return manifest;
}

async function fetchPublishedBlogPosts(): Promise<BlogPost[]> {
  const fields = [
    "slug", "locale", "title", "excerpt", "body_md", "author", "seo_title", "seo_description",
    "canonical_url", "cover_image_url", "og_image_url", "published_at", "updated_at",
  ].join(",");
  const url = `${OWNER_SUPABASE_URL}/rest/v1/blog_posts?select=${encodeURIComponent(fields)}&is_published=eq.true&order=sort_order.asc,updated_at.desc`;
  const response = await fetch(url, {
    headers: {
      apikey: OWNER_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${OWNER_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });
  if (!response.ok) throw new Error(`Could not fetch published blog posts: ${response.status} ${await response.text()}`);
  const posts = await response.json() as BlogPost[];
  return posts.filter((post) => post.slug && post.title && post.body_md && post.body_md.trim().length >= 300);
}

function markdownToText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[\*_~]/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function addStaticRoutes(routes: Map<string, SeoRouteEntry>) {
  for (const seed of STATIC_ROUTES) {
    const parentPath = seed.parentPath ?? null;
    const route = createRoute({
      routeType: seed.routeType,
      path: seed.path,
      locale: seed.locale ?? "en",
      equivalentGroup: seed.equivalentGroup ?? null,
      indexable: true,
      sitemap: true,
      title: seed.title,
      description: seed.description,
      h1: seed.h1,
      staticShellRenderer: "generate-static-route-shells",
      clientComponent: seed.clientComponent,
      structuredDataType: seed.structuredDataType ?? "WebPage+BreadcrumbList",
      breadcrumbPaths: parentBreadcrumbs(parentPath),
      parentPath,
      redirectPredecessors: REDIRECT_PREDECESSORS[seed.path] ?? [],
      lastmod: null,
    });
    routes.set(route.path, route);
  }
}

function addCatalogRoutes(routes: Map<string, SeoRouteEntry>, products: BuyerReadyCatalogRoute[]) {
  const taxonomy = new Map<string, { routeType: SeoRouteType; name: string; parentPath: string; categoryName: string; updatedAt: string }>();

  for (const product of products) {
    const categoryPath = `/products/${product.main_category_slug}`;
    const audiencePath = `${categoryPath}/${product.audience_slug}`;
    const typePath = `${audiencePath}/${product.product_type_slug}`;
    taxonomy.set(categoryPath, {
      routeType: "main-division",
      name: product.main_category_name,
      parentPath: "/products",
      categoryName: product.main_category_name,
      updatedAt: product.updated_at,
    });
    taxonomy.set(audiencePath, {
      routeType: "audience-group",
      name: product.audience_name,
      parentPath: categoryPath,
      categoryName: product.main_category_name,
      updatedAt: product.updated_at,
    });
    taxonomy.set(typePath, {
      routeType: "product-type",
      name: product.product_type_name,
      parentPath: audiencePath,
      categoryName: product.main_category_name,
      updatedAt: product.updated_at,
    });
  }

  for (const [path, node] of [...taxonomy].sort(([a], [b]) => a.localeCompare(b))) {
    const current = routes.get(path);
    const title = node.routeType === "main-division"
      ? `${node.name} Manufacturer | Wholesale & Private Label | Irha Apparels`
      : `${node.name} | ${node.categoryName} Manufacturing | Irha Apparels`;
    const h1 = node.routeType === "main-division"
      ? `${node.name} Manufacturer for Wholesale & Private Label`
      : `${node.name} for Custom B2B Manufacturing`;
    const description = node.routeType === "main-division"
      ? `${node.name} programs for B2B buyers with custom development, branding and packaging against an approved buyer brief.`
      : `Explore ${node.name} within ${node.categoryName} for wholesale, OEM, ODM and private-label manufacturing programs.`;
    const route = createRoute({
      routeType: node.routeType,
      path,
      locale: "en",
      equivalentGroup: current?.equivalentGroup ?? null,
      indexable: true,
      sitemap: true,
      title,
      description,
      h1,
      staticShellRenderer: "generate-static-route-shells",
      clientComponent: "CategoryTaxonomyPage",
      structuredDataType: "CollectionPage+ItemList+BreadcrumbList",
      breadcrumbPaths: parentBreadcrumbs(node.parentPath),
      parentPath: node.parentPath,
      redirectPredecessors: REDIRECT_PREDECESSORS[path] ?? [],
      lastmod: node.updatedAt || null,
    });
    routes.set(path, route);
  }

  for (const product of products) {
    const parentPath = `/products/${product.main_category_slug}/${product.audience_slug}/${product.product_type_slug}`;
    const route = createRoute({
      routeType: "individual-product",
      path: product.canonical_path,
      locale: "en",
      equivalentGroup: null,
      indexable: true,
      sitemap: true,
      title: product.seo_title || `${product.product_name} Wholesale Manufacturer | Irha Apparels`,
      description: product.seo_description || product.short_description || product.product_description || `${product.product_name} custom B2B manufacturing.`,
      h1: product.seo_h1 || product.product_name,
      staticShellRenderer: "generate-static-route-shells",
      clientComponent: "CanonicalProductRoute",
      structuredDataType: "Product+BreadcrumbList",
      breadcrumbPaths: parentBreadcrumbs(parentPath),
      parentPath,
      redirectPredecessors: REDIRECT_PREDECESSORS[product.canonical_path] ?? [],
      lastmod: product.updated_at || null,
      bodyText: product.product_description || product.short_description || undefined,
      image: product.image_url,
      productReference: product.reference_code,
    });
    routes.set(route.path, route);
  }
}

function addMarketRoutes(routes: Map<string, SeoRouteEntry>) {
  const indexPath = "/markets";
  routes.set(indexPath, createRoute({
    routeType: "localized-market",
    path: indexPath,
    locale: "en",
    equivalentGroup: null,
    indexable: true,
    sitemap: true,
    title: "International Apparel Manufacturing Markets | Irha Apparels",
    description: "Country-focused sourcing guidance for B2B apparel buyers working with Irha Apparels in Sialkot, Pakistan.",
    h1: "International B2B Apparel Markets",
    staticShellRenderer: "generate-static-route-shells",
    clientComponent: "Markets",
    structuredDataType: "CollectionPage+ItemList+BreadcrumbList",
    breadcrumbPaths: ["/"],
    parentPath: "/",
    redirectPredecessors: [],
    lastmod: null,
  }));

  for (const market of MARKET_PAGES) {
    const path = `/markets/${market.slug}`;
    routes.set(path, createRoute({
      routeType: "localized-market",
      path,
      locale: market.locale,
      equivalentGroup: null,
      indexable: true,
      sitemap: true,
      title: market.title,
      description: market.description,
      h1: market.h1,
      staticShellRenderer: "generate-market-route-shells",
      clientComponent: "MarketLandingPage",
      structuredDataType: "WebPage+BreadcrumbList",
      breadcrumbPaths: ["/", "/markets"],
      parentPath: "/markets",
      redirectPredecessors: REDIRECT_PREDECESSORS[path] ?? [],
      lastmod: null,
      bodyText: [market.intro, market.summary, ...market.sections.flatMap((section) => [section.heading, section.body, ...section.bullets])].join("\n\n"),
    }));
  }
}

function addBuyerIntentRoutes(routes: Map<string, SeoRouteEntry>) {
  for (const page of SEO_BUYER_INTENT_LANDING_PAGES) {
    const path = cleanPath(page.path);
    routes.set(path, createRoute({
      routeType: "localized-market",
      path,
      locale: page.locale,
      equivalentGroup: null,
      indexable: true,
      sitemap: true,
      title: page.title,
      description: page.description,
      h1: page.h1,
      staticShellRenderer: "generate-buyer-intent-route-shells",
      clientComponent: "BuyerIntentLandingPage",
      structuredDataType: "WebPage+BreadcrumbList",
      breadcrumbPaths: ["/"],
      parentPath: page.categoryPath || "/",
      redirectPredecessors: REDIRECT_PREDECESSORS[path] ?? [],
      lastmod: null,
      bodyText: [page.intro, ...page.sections.flatMap((section) => [section.heading, section.body, ...section.bullets])].join("\n\n"),
    }));
  }
}

function localizedSeed(path: string) {
  if (path === "/de/") return { title: "B2B Bekleidungshersteller für Marken und Großhandel | Irha Apparels", description: "Individuelle B2B-Bekleidungsfertigung aus Sialkot für Marken, Großhändler und Importeure.", h1: "B2B-Bekleidungsfertigung für Marken, Großhändler und Importeure", component: "GermanGateway", type: "homepage" as SeoRouteType };
  if (path === "/fr/") return { title: "Fabricant de vêtements B2B pour marques et grossistes | Irha Apparels", description: "Fabrication de vêtements B2B sur mesure à Sialkot pour marques, grossistes et importateurs.", h1: "Fabrication de vêtements B2B pour marques, grossistes et importateurs", component: "BuyerIntentLandingPage", type: "homepage" as SeoRouteType };
  if (path === "/nl/") return { title: "B2B Kledingfabrikant voor merken en groothandels | Irha Apparels", description: "Maatwerk B2B-kledingproductie in Sialkot voor merken, groothandels en importeurs.", h1: "B2B-kledingproductie voor merken, groothandels en importeurs", component: "BuyerIntentLandingPage", type: "homepage" as SeoRouteType };
  if (path.endsWith("/materialien")) return { title: "Materialien für individuelle Bekleidung | Irha Apparels", description: "Materialrichtungen für individuelle B2B-Bekleidungsprogramme.", h1: "Material- und Stoffbibliothek", component: "BuyerConfidence", type: "materials" as SeoRouteType };
  if (path.endsWith("/matieres")) return { title: "Matières pour vêtements sur mesure | Irha Apparels", description: "Orientations matières pour les programmes de vêtements B2B sur mesure.", h1: "Bibliothèque de matières et tissus", component: "BuyerConfidence", type: "materials" as SeoRouteType };
  if (path.endsWith("/materialen")) return { title: "Materialen voor maatwerkkleding | Irha Apparels", description: "Materiaalrichtingen voor B2B-maatwerk kledingprogramma's.", h1: "Materiaal- en stoffenbibliotheek", component: "BuyerConfidence", type: "materials" as SeoRouteType };
  if (path.includes("einkaeufer") || path.includes("informations-acheteurs") || path.includes("kopersinformatie")) return { title: "Buyer Information | Irha Apparels", description: "Localized buyer information for quotation, logistics, confidentiality and compliance-readiness review.", h1: "Buyer Information", component: "BuyerConfidence", type: "buyer-information" as SeoRouteType };
  return null;
}

function addLocalizedRegistryRoutes(routes: Map<string, SeoRouteEntry>) {
  for (const record of LOCALIZED_ROUTE_REGISTRY) {
    if (!record.indexable || !record.sitemapEligible) continue;
    const path = cleanPath(record.path);
    const current = routes.get(path);
    if (current) {
      current.equivalentGroup = record.equivalentGroup;
      current.locale = record.locale;
      continue;
    }
    const seed = localizedSeed(path);
    if (!seed) continue;
    routes.set(path, createRoute({
      routeType: seed.type,
      path,
      locale: record.locale,
      equivalentGroup: record.equivalentGroup,
      indexable: true,
      sitemap: true,
      title: seed.title,
      description: seed.description,
      h1: seed.h1,
      staticShellRenderer: "localized-static-shell",
      clientComponent: seed.component,
      structuredDataType: "WebPage+BreadcrumbList",
      breadcrumbPaths: ["/"],
      parentPath: "/",
      redirectPredecessors: [],
      lastmod: null,
    }));
  }
}

function addBlogRoutes(routes: Map<string, SeoRouteEntry>, posts: BlogPost[]) {
  for (const post of posts) {
    const path = `/blog/${post.slug}`;
    const expectedCanonical = canonicalUrl(path);
    if (post.canonical_url && post.canonical_url !== expectedCanonical) {
      throw new Error(`Blog canonical mismatch for ${post.slug}: ${post.canonical_url}`);
    }
    routes.set(path, createRoute({
      routeType: "resource-article",
      path,
      locale: post.locale,
      equivalentGroup: null,
      indexable: true,
      sitemap: true,
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt || `Buyer guidance: ${post.title}`,
      h1: post.title,
      staticShellRenderer: "generate-static-route-shells",
      clientComponent: "BlogPost",
      structuredDataType: "Article+BreadcrumbList",
      breadcrumbPaths: ["/", "/resources", "/blog"],
      parentPath: "/blog",
      redirectPredecessors: [],
      lastmod: post.updated_at || post.published_at,
      bodyText: markdownToText(post.body_md || ""),
      image: post.og_image_url || post.cover_image_url,
    }));
  }
}

function applyEquivalence(routes: Map<string, SeoRouteEntry>) {
  const groups = new Map<string, Set<string>>();
  const addToGroup = (group: string, path: string) => {
    const members = groups.get(group) ?? new Set<string>();
    members.add(cleanPath(path));
    groups.set(group, members);
  };

  addToGroup("homepage", "/");
  addToGroup("homepage", "/de/");
  addToGroup("homepage", "/fr/");
  addToGroup("homepage", "/nl/");

  for (const route of routes.values()) {
    if (route.equivalentGroup) addToGroup(route.equivalentGroup, route.path);
  }
  for (const page of SEO_BUYER_INTENT_LANDING_PAGES) {
    if (!page.alternates || page.alternates.length < 2) continue;
    const group = `buyer-intent:${page.alternates.map((alternate) => cleanPath(alternate.href)).sort().join("|")}`;
    for (const alternate of page.alternates) addToGroup(group, alternate.href);
    const route = routes.get(cleanPath(page.path));
    if (route) route.equivalentGroup = group;
  }

  for (const [group, memberSet] of groups) {
    const members = [...memberSet]
      .map((path) => routes.get(path))
      .filter((route): route is SeoRouteEntry => Boolean(route?.indexable && route.sitemap));
    if (members.length < 2) continue;
    const expectedPaths = new Set(members.map((route) => route.path));
    if (expectedPaths.size !== memberSet.size) continue;
    const english = members.find((route) => localeCode(route.locale) === "en");
    for (const route of members) {
      route.equivalentGroup = group;
      route.alternates = members
        .map((member) => ({ hreflang: localeCode(member.locale), path: member.path, url: member.canonicalUrl }))
        .sort((a, b) => a.hreflang.localeCompare(b.hreflang) || a.path.localeCompare(b.path));
      route.xDefault = english?.canonicalUrl ?? null;
    }
  }
}

function validate(routes: SeoRouteEntry[]) {
  const ids = new Set<string>();
  const paths = new Set<string>();
  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();
  const prohibitedSchema = /\b(Offer|AggregateRating|Review)\b/;

  for (const route of routes) {
    if (ids.has(route.id)) throw new Error(`Duplicate SEO route ID: ${route.id}`);
    if (paths.has(route.path)) throw new Error(`Duplicate SEO route path: ${route.path}`);
    if (!route.path.startsWith("/") || route.path.includes("?") || route.path.includes("#")) throw new Error(`Invalid canonical path: ${route.path}`);
    if (route.canonicalUrl !== canonicalUrl(route.path)) throw new Error(`Canonical host mismatch: ${route.path}`);
    if (!route.title.trim() || !route.description.trim() || !route.h1.trim()) throw new Error(`Incomplete metadata: ${route.path}`);
    if (prohibitedSchema.test(route.structuredDataType)) throw new Error(`Restricted structured data on ${route.path}`);
    if (route.indexable && route.sitemap) {
      const titleKey = `${localeCode(route.locale)}:${route.title.toLowerCase().replace(/\s+/g, " ").trim()}`;
      const descriptionKey = `${localeCode(route.locale)}:${route.description.toLowerCase().replace(/\s+/g, " ").trim()}`;
      const titleOwner = titles.get(titleKey);
      if (titleOwner && titleOwner !== route.path) throw new Error(`Duplicate title: ${titleOwner} and ${route.path}`);
      const descriptionOwner = descriptions.get(descriptionKey);
      if (descriptionOwner && descriptionOwner !== route.path) throw new Error(`Duplicate description: ${descriptionOwner} and ${route.path}`);
      titles.set(titleKey, route.path);
      descriptions.set(descriptionKey, route.path);
    }
    for (const alternate of route.alternates) {
      const target = routes.find((candidate) => candidate.path === alternate.path);
      if (!target || !target.indexable || !target.sitemap) throw new Error(`Invalid hreflang target ${alternate.path} from ${route.path}`);
      const reciprocal = target.alternates.some((candidate) => candidate.path === route.path && candidate.hreflang === localeCode(route.locale));
      if (!reciprocal) throw new Error(`Non-reciprocal hreflang: ${route.path} -> ${alternate.path}`);
    }
    ids.add(route.id);
    paths.add(route.path);
  }

  for (const route of routes) {
    if (route.parentPath && !paths.has(route.parentPath)) throw new Error(`Missing parent route ${route.parentPath} for ${route.path}`);
  }
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;");
}

function writeOutputs(routes: SeoRouteEntry[], productCount: number, blogCount: number) {
  const ordered = routes.slice().sort((a, b) => {
    if (a.path === "/") return -1;
    if (b.path === "/") return 1;
    return a.path.localeCompare(b.path);
  });
  const routeTypeCounts = Object.fromEntries([...new Set(ordered.map((route) => route.routeType))].sort().map((type) => [type, ordered.filter((route) => route.routeType === type).length]));
  const manifest = {
    schemaVersion: 1,
    canonicalOrigin: SITE_URL,
    slashPolicy: "root-and-locale-gateways-trailing-slash; all-other-canonicals-no-trailing-slash",
    generatedAt: new Date().toISOString(),
    routeCount: ordered.length,
    sitemapCount: ordered.filter((route) => route.indexable && route.sitemap).length,
    productCount,
    blogArticleCount: blogCount,
    routeTypeCounts,
    routes: ordered,
  };
  writeFileSync(SEO_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  const sitemapRoutes = ordered.filter((route) => route.indexable && route.sitemap);
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...sitemapRoutes.map((route) => {
      const alternates = route.alternates.map((alternate) => `    <xhtml:link rel="alternate" hreflang="${xmlEscape(alternate.hreflang)}" href="${xmlEscape(alternate.url)}" />`);
      if (route.xDefault) alternates.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(route.xDefault)}" />`);
      return [
        "  <url>",
        `    <loc>${xmlEscape(route.canonicalUrl)}</loc>`,
        route.lastmod ? `    <lastmod>${xmlEscape(route.lastmod.slice(0, 10))}</lastmod>` : null,
        ...alternates,
        "  </url>",
      ].filter(Boolean).join("\n");
    }),
    "</urlset>",
  ].join("\n");
  writeFileSync(SITEMAP_PATH, `${xml}\n`);
  console.log(`Finalized authoritative SEO manifest: ${manifest.routeCount} routes, ${manifest.sitemapCount} sitemap URLs, ${productCount} products, ${blogCount} guides`);
}

async function main() {
  const catalog = readCatalogManifest();
  const blogPosts = await fetchPublishedBlogPosts();
  const routes = new Map<string, SeoRouteEntry>();
  addStaticRoutes(routes);
  addCatalogRoutes(routes, catalog.products);
  addMarketRoutes(routes);
  addBuyerIntentRoutes(routes);
  addLocalizedRegistryRoutes(routes);
  addBlogRoutes(routes, blogPosts);
  applyEquivalence(routes);
  const values = [...routes.values()];
  validate(values);
  writeOutputs(values, catalog.products.length, blogPosts.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
