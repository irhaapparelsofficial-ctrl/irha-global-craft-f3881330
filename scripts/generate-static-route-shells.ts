import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { BuyerReadyCatalogRoute } from "./generate-buyer-ready-catalog-manifest";

const DIST_DIR = resolve("dist");
const SITE_URL = "https://irhaapparels.com";
const HOME_TITLE = "Irha Apparels — Custom Apparel Manufacturing for Global B2B Buyers";
const MANIFEST_PATH = join(DIST_DIR, "catalog-route-manifest.json");

const STATIC_META: Record<string, { title: string; heading: string; description: string }> = {
  "/products": {
    title: "Custom Apparel Collections | Irha Apparels",
    heading: "Custom Apparel Collections for B2B Buyers",
    description: "Explore Irha Apparels manufacturing collections for wholesale, OEM, ODM and private-label buyer programs.",
  },
  "/catalogue": {
    title: "B2B Apparel Catalogue | Irha Apparels",
    heading: "B2B Apparel Catalogue",
    description: "Browse Irha Apparels product categories and prepare a focused wholesale or private-label inquiry.",
  },
  "/about": {
    title: "About Irha Apparels | Sialkot Manufacturer",
    heading: "About Irha Apparels",
    description: "Learn about Irha Apparels, an experienced custom apparel manufacturer in Sialkot for global B2B buyers.",
  },
  "/manufacturing": {
    title: "Custom Apparel Manufacturing | Irha Apparels",
    heading: "Custom Apparel Manufacturing",
    description: "Review Irha Apparels sampling, customization, production and buyer-approval workflow for B2B programs.",
  },
  "/buyer-trust": {
    title: "Buyer Trust Center | Irha Apparels",
    heading: "Buyer Trust Center",
    description: "Review factory visibility, documentation, communication and buyer-safety practices at Irha Apparels.",
  },
  "/factory-video-call": {
    title: "Book a Live Factory Video Call | Irha Apparels",
    heading: "Live Factory Video Call",
    description: "Schedule a live video call to view the Irha Apparels factory and discuss your manufacturing program.",
  },
  "/resources": {
    title: "B2B Buyer Resources | Irha Apparels",
    heading: "B2B Buyer Resources",
    description: "Use practical checklists and guidance to prepare sampling, customization, quotation and shipping requirements.",
  },
  "/faq": {
    title: "Buyer FAQ | Irha Apparels",
    heading: "Frequently Asked Buyer Questions",
    description: "Answers about custom apparel sampling, MOQ review, private labeling, production, quotation and export support.",
  },
  "/compliance": {
    title: "Compliance and Documentation | Irha Apparels",
    heading: "Compliance and Documentation",
    description: "See how buyer compliance, material documentation and certification evidence are reviewed before commitment.",
  },
  "/inquiry": {
    title: "Request a B2B Apparel Quote | Irha Apparels",
    heading: "Request a Manufacturing Quote",
    description: "Send product, quantity, material, branding, packaging and delivery requirements for a tailored B2B quotation.",
  },
  "/repeat-order": {
    title: "Repeat Order Request | Irha Apparels",
    heading: "Repeat Order Request",
    description: "Submit a repeat-order request using your previous product and production references.",
  },
  "/contact": {
    title: "Contact Irha Apparels | B2B Manufacturing",
    heading: "Contact Irha Apparels",
    description: "Contact Irha Apparels in Sialkot for wholesale, OEM, ODM and private-label apparel manufacturing inquiries.",
  },
  "/blog": {
    title: "B2B Apparel Manufacturing Insights | Irha Apparels",
    heading: "B2B Apparel Manufacturing Insights",
    description: "Practical apparel sourcing, customization, sampling and manufacturing guidance for international buyers.",
  },
  "/privacy-policy": {
    title: "Privacy Policy | Irha Apparels",
    heading: "Privacy Policy",
    description: "Read how Irha Apparels handles website, inquiry and buyer information.",
  },
  "/terms-of-service": {
    title: "Terms of Service | Irha Apparels",
    heading: "Terms of Service",
    description: "Review the terms that apply when using the Irha Apparels website and buyer inquiry services.",
  },
};

const CATEGORY_NAMES: Record<string, string> = {
  "bavarian-trachten-wear": "Bavarian Trachten Wear",
  "premium-leather-apparel": "Premium Leather Apparel",
  sportswear: "Sportswear",
  "streetwear-activewear": "Streetwear and Activewear",
  "leisure-nightwear": "Leisurewear and Nightwear",
};

type ManifestPayload = {
  schemaVersion: number;
  productCount: number;
  products: BuyerReadyCatalogRoute[];
};

type RouteMeta = {
  title: string;
  heading: string;
  description: string;
  locale: string;
};

function titleCase(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => {
      const upper = word.toUpperCase();
      if (["B2B", "OEM", "ODM", "FAQ", "AI"].includes(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function cleanPath(pathname: string): string {
  if (pathname === "/") return "/";
  const trimmed = pathname.replace(/\/+$/, "") || "/";
  return (["/de", "/fr", "/nl"] as const).includes(trimmed as "/de" | "/fr" | "/nl")
    ? `${trimmed}/`
    : trimmed;
}

function localeAndRoute(pathname: string) {
  const segments = cleanPath(pathname).split("/").filter(Boolean);
  if (segments[0] === "intl" && segments.length > 3) {
    return { locale: segments[1], route: segments.slice(2) };
  }
  return { locale: "en", route: segments };
}

function genericRouteMeta(pathname: string): RouteMeta {
  const path = cleanPath(pathname);
  const exact = STATIC_META[path];
  if (exact) return { ...exact, locale: "en" };

  const { locale, route } = localeAndRoute(path);
  if (route[0] === "products") {
    const categorySlug = route[1] ?? "custom-apparel";
    const categoryName = CATEGORY_NAMES[categorySlug] ?? titleCase(categorySlug);
    const leafSlug = route.at(-1) ?? categorySlug;
    const leafName = titleCase(leafSlug);

    if (route.length === 2) {
      return {
        title: `${categoryName} Manufacturer | Irha Apparels`,
        heading: `Custom ${categoryName} Manufacturing`,
        description: `${categoryName} manufacturing for wholesale, OEM, ODM and private-label buyer programs from Irha Apparels in Sialkot, Pakistan.`,
        locale,
      };
    }

    return {
      title: `${leafName} Collection | ${categoryName} | Irha Apparels`,
      heading: `${leafName} Collection`,
      description: `Explore the ${leafName} collection within ${categoryName} for wholesale, OEM, ODM and private-label manufacturing programs.`,
      locale,
    };
  }

  if (route[0] === "catalogue") {
    const name = titleCase(route.at(-1) ?? "catalogue");
    return {
      title: `${name} B2B Catalogue | Irha Apparels`,
      heading: `${name} B2B Catalogue`,
      description: `Explore ${name} manufacturing options and prepare a focused wholesale or private-label inquiry with Irha Apparels.`,
      locale,
    };
  }

  if (route[0] === "blog" && route[1]) {
    const name = titleCase(route[1]);
    return {
      title: `${name} | Irha Apparels Insights`,
      heading: name,
      description: `${name}: practical B2B apparel sourcing and manufacturing guidance from Irha Apparels.`,
      locale,
    };
  }

  const name = titleCase(route.at(-1) ?? "Irha Apparels");
  return {
    title: `${name} | Irha Apparels`,
    heading: name,
    description: `${name} information for wholesale, OEM, ODM and private-label buyers working with Irha Apparels.`,
    locale,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(value: string, max = 160): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

function genericShell(pathname: string, meta: RouteMeta): string {
  const categoryPath = pathname.startsWith("/products/")
    ? pathname.split("/").slice(0, 3).join("/")
    : "/products";
  return `<main id="irha-static-crawler-shell" data-irha-route-shell="${escapeHtml(pathname)}" style="min-height:100vh;background:#0a0a0a;color:#f5f1e8;padding:48px 24px;font-family:Arial,sans-serif;line-height:1.6">
        <div style="max-width:960px;margin:0 auto">
          <p style="margin:0 0 12px;letter-spacing:.18em;text-transform:uppercase;font-size:12px;color:#c9a45c">Irha Apparels · Sialkot, Pakistan</p>
          <h1 style="margin:0 0 20px;font-size:clamp(34px,7vw,68px);line-height:1.08">${escapeHtml(meta.heading)}</h1>
          <p style="max-width:760px;font-size:18px;color:#d7d0c4">${escapeHtml(meta.description)}</p>
          <p style="max-width:760px;color:#aaa29a">Requirements are reviewed before materials, sampling, quantity, pricing, production timing and shipping are confirmed.</p>
          <nav aria-label="Route crawler links" style="display:flex;flex-wrap:wrap;gap:16px;margin-top:34px">
            <a href="${escapeHtml(categoryPath)}" style="color:#e8c477">Explore Related Collection</a>
            <a href="/catalogue" style="color:#e8c477">View Catalogue</a>
            <a href="/buyer-trust" style="color:#e8c477">Buyer Trust</a>
            <a href="/inquiry" style="color:#e8c477">Request a Quote</a>
            <a href="/contact" style="color:#e8c477">Contact</a>
          </nav>
        </div>
      </main>`;
}

function productMeta(product: BuyerReadyCatalogRoute): RouteMeta {
  const description = product.seo_description
    || product.short_description
    || product.product_description
    || `${product.product_name} custom manufacturing for wholesale, OEM, ODM and private-label buyers.`;
  return {
    title: product.seo_title || `${product.product_name} Wholesale Manufacturer | Irha Apparels`,
    heading: product.seo_h1 || product.product_name,
    description,
    locale: "en",
  };
}

function productShell(product: BuyerReadyCatalogRoute, meta: RouteMeta): string {
  const categoryPath = `/products/${product.main_category_slug}`;
  const audiencePath = `${categoryPath}/${product.audience_slug}`;
  const typePath = `${audiencePath}/${product.product_type_slug}`;
  const gallery = product.gallery.filter(Boolean);
  const galleryHtml = gallery.map((image, index) => `<img src="${escapeHtml(image)}" alt="Digital catalogue reference for ${escapeHtml(product.product_name)}, view ${index + 1}" width="1200" height="1200" loading="${index === 0 ? "eager" : "lazy"}" decoding="async" style="${index === 0 ? "grid-column:1/-1;" : ""}width:100%;height:auto;aspect-ratio:1/1;display:block;background:#151515;object-fit:contain" />`).join("");
  const quoteParams = new URLSearchParams({
    intent: "rfq",
    product: product.product_slug,
    name: product.product_name,
    code: product.reference_code,
    category: product.main_category_slug,
  });
  const quotePath = `/inquiry?${quoteParams.toString()}`;
  const useCases = product.buyer_use_cases
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const decisionPoints = product.decision_points
    ? product.decision_points.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "";
  const samplingSteps = product.sampling_steps
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const faqs = product.buyer_faqs
    .map(({ question, answer }) => `<section><h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer)}</p></section>`)
    .join("");
  return `<main id="irha-static-crawler-shell" data-irha-route-shell="${escapeHtml(product.canonical_path)}" data-irha-product-shell="true" style="min-height:100vh;background:#0a0a0a;color:#f5f1e8;padding:40px 24px;font-family:Arial,sans-serif;line-height:1.6">
        <div style="max-width:1120px;margin:0 auto">
          <nav aria-label="Breadcrumb" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px;font-size:14px">
            <a href="/products" style="color:#e8c477">Products</a><span>/</span>
            <a href="${escapeHtml(categoryPath)}" style="color:#e8c477">${escapeHtml(product.main_category_name)}</a><span>/</span>
            <a href="${escapeHtml(audiencePath)}" style="color:#e8c477">${escapeHtml(product.audience_name)}</a><span>/</span>
            <a href="${escapeHtml(typePath)}" style="color:#e8c477">${escapeHtml(product.product_type_name)}</a>
          </nav>
          <div style="display:flex;flex-wrap:wrap;gap:40px;align-items:flex-start">
            <figure style="flex:1 1 520px;min-width:0;margin:0">
              <div role="group" aria-label="${escapeHtml(product.product_name)} digital reference gallery" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px">${galleryHtml}</div>
              <figcaption style="margin-top:12px;color:#aaa29a;font-size:13px">Digital catalogue references show design direction only; they are not photographs of completed buyer orders. Materials and construction follow the approved specification.</figcaption>
            </figure>
            <section style="flex:1 1 420px;min-width:0">
              <p style="margin:0 0 12px;letter-spacing:.18em;text-transform:uppercase;font-size:12px;color:#c9a45c">${escapeHtml(product.reference_code)} · Custom B2B Manufacturing</p>
              <h1 style="margin:0 0 20px;font-size:clamp(34px,6vw,64px);line-height:1.08">${escapeHtml(meta.heading)}</h1>
              <p style="font-size:18px;color:#d7d0c4">${escapeHtml(product.opening_answer)}</p>
              <p style="color:#d7d0c4"><strong>Style code:</strong> ${escapeHtml(product.reference_code)}</p>
              <p style="color:#aaa29a">${escapeHtml(product.moq_lead_time)}</p>
              <div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:30px">
                <a href="${escapeHtml(quotePath)}" style="color:#0a0a0a;background:#e8c477;padding:12px 18px;text-decoration:none">Request a Manufacturing Quote</a>
                <a href="/contact" style="color:#e8c477;padding:11px 18px;border:1px solid #e8c477;text-decoration:none">Contact Irha Apparels</a>
              </div>
            </section>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;margin-top:48px">
            <section style="border:1px solid #302b24;padding:24px">
              <h2>Who this ${escapeHtml(product.product_name)} program is for</h2>
              <ul>${useCases}</ul>
              ${decisionPoints ? `<h3>Decisions to include in the brief</h3><ul>${decisionPoints}</ul>` : ""}
            </section>
            <section style="border:1px solid #302b24;padding:24px">
              <h2>Material and construction review</h2>
              <p>${escapeHtml(product.material_guidance)}</p>
              <p>${escapeHtml(product.construction_guidance)}</p>
            </section>
            <section style="border:1px solid #302b24;padding:24px">
              <h2>Customization, colour, size and fit</h2>
              <p>${escapeHtml(product.customization_guidance)}</p>
              <p>${escapeHtml(product.size_fit_guidance)}</p>
            </section>
            <section style="border:1px solid #302b24;padding:24px">
              <h2>Sampling and approval workflow</h2>
              <ol>${samplingSteps}</ol>
            </section>
            <section style="border:1px solid #302b24;padding:24px">
              <h2>MOQ, production, packaging and logistics</h2>
              <p>${escapeHtml(product.moq_lead_time)}</p>
              <p>${escapeHtml(product.packaging_logistics)}</p>
            </section>
            <section style="border:1px solid #302b24;padding:24px">
              <h2>${escapeHtml(product.product_name)} buyer questions</h2>
              ${faqs}
            </section>
          </div>
          <nav aria-label="Related buyer resources" style="display:flex;flex-wrap:wrap;gap:18px;margin-top:36px">
            <a href="${escapeHtml(typePath)}" style="color:#e8c477">Related ${escapeHtml(product.product_type_name)}</a>
            <a href="/materials" style="color:#e8c477">Material Library</a>
            <a href="/resources" style="color:#e8c477">Buyer Guides</a>
            <a href="/buyer-information" style="color:#e8c477">Order and Logistics Preparation</a>
          </nav>
        </div>
      </main>`;
}

function jsonLdScripts(pathname: string, meta: RouteMeta, product?: BuyerReadyCatalogRoute) {
  const canonical = pathname === "/" ? `${SITE_URL}/` : `${SITE_URL}${pathname}`;
  if (!product) {
    const webPage = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      url: canonical,
      name: meta.title,
      description: meta.description,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      inLanguage: meta.locale,
    };
    return `<script data-irha-route-jsonld="true" type="application/ld+json">${JSON.stringify(webPage).replace(/</g, "\\u003c")}</script>`;
  }

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${canonical}#product`,
    url: canonical,
    name: product.product_name,
    description: product.opening_answer,
    image: product.gallery,
    sku: product.reference_code,
    category: `${product.main_category_name} > ${product.audience_name} > ${product.product_type_name}`,
    manufacturer: { "@id": `${SITE_URL}/#organization` },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Products", item: `${SITE_URL}/products` },
      { "@type": "ListItem", position: 2, name: product.main_category_name, item: `${SITE_URL}/products/${product.main_category_slug}` },
      { "@type": "ListItem", position: 3, name: product.audience_name, item: `${SITE_URL}/products/${product.main_category_slug}/${product.audience_slug}` },
      { "@type": "ListItem", position: 4, name: product.product_type_name, item: `${SITE_URL}/products/${product.main_category_slug}/${product.audience_slug}/${product.product_type_slug}` },
      { "@type": "ListItem", position: 5, name: product.product_name, item: canonical },
    ],
  };
  return [productSchema, breadcrumbs]
    .map((value) => `<script data-irha-route-jsonld="true" type="application/ld+json">${JSON.stringify(value).replace(/</g, "\\u003c")}</script>`)
    .join("\n    ");
}

function replaceMeta(
  html: string,
  pathname: string,
  productByPath: Map<string, BuyerReadyCatalogRoute>,
): string {
  const product = productByPath.get(pathname);
  const meta = product ? productMeta(product) : genericRouteMeta(pathname);
  const title = escapeHtml(meta.title);
  const description = escapeHtml(truncate(meta.description));
  const canonical = pathname === "/" ? `${SITE_URL}/` : `${SITE_URL}${pathname}`;
  const shell = product ? productShell(product, meta) : genericShell(pathname, meta);
  const scripts = jsonLdScripts(pathname, meta, product);
  const ogImage = product?.image_url;

  let output = html
    .replace(/<html lang="[^"]*">/i, `<html lang="${escapeHtml(meta.locale)}">`)
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
    .replace(/<meta data-irha-fallback-seo="true" name="description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="description" content="${description}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta data-irha-fallback-seo="true" property="og:title" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:title" content="${title}" />`)
    .replace(/<meta data-irha-fallback-seo="true" property="og:description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:description" content="${description}" />`)
    .replace(/<meta data-irha-fallback-seo="true" property="og:url" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:url" content="${canonical}" />`)
    .replace(/<meta data-irha-fallback-seo="true" name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="twitter:title" content="${title}" />`)
    .replace(/<meta data-irha-fallback-seo="true" name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="twitter:description" content="${description}" />`)
    .replace(/<main id="irha-static-crawler-shell"[\s\S]*?<\/main>/i, shell)
    .replace(/\s*<script data-irha-route-jsonld="true"[\s\S]*?<\/script>/gi, "")
    .replace("</head>", `    ${scripts}\n  </head>`);

  if (ogImage) {
    const tag = `<meta data-irha-product-image="true" property="og:image" content="${escapeHtml(ogImage)}" />`;
    output = output.replace("</head>", `    ${tag}\n  </head>`);
  }
  return output;
}

function extractPaths(sitemap: string): string[] {
  const paths = new Set<string>();
  for (const match of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const raw = match[1].replace(/&amp;/g, "&");
    const url = new URL(raw);
    if (url.origin !== SITE_URL) continue;
    const path = cleanPath(decodeURIComponent(url.pathname));
    if (!path.startsWith("/") || path.includes("..")) continue;
    paths.add(path);
  }
  return [...paths].sort();
}

async function readManifest(): Promise<ManifestPayload> {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as ManifestPayload;
  if (manifest.schemaVersion !== 1 || manifest.productCount !== 254 || manifest.products.length !== 254) {
    throw new Error("Buyer-ready catalogue manifest is incomplete");
  }
  return manifest;
}

async function verify(paths: string[], manifest: ManifestPayload) {
  const required = ["/buyer-trust", "/faq", "/products/bavarian-trachten-wear"];
  for (const path of required) {
    if (!paths.includes(path)) throw new Error(`Static route shell is missing required path: ${path}`);
  }

  for (const product of manifest.products) {
    if (!paths.includes(product.canonical_path)) {
      throw new Error(`Product shell path missing from sitemap: ${product.canonical_path}`);
    }
    const output = await readFile(join(DIST_DIR, product.canonical_path.slice(1), "index.html"), "utf8");
    const expectedTitle = escapeHtml(product.seo_title || `${product.product_name} Wholesale Manufacturer | Irha Apparels`);
    const expectedH1 = escapeHtml(product.seo_h1 || product.product_name);
    if (!output.includes(`<title>${expectedTitle}</title>`)) throw new Error(`${product.reference_code} title mismatch`);
    if (!output.includes(`<link rel="canonical" href="${SITE_URL}${product.canonical_path}"`)) throw new Error(`${product.reference_code} canonical mismatch`);
    if (!output.includes(`data-irha-product-shell="true"`)) throw new Error(`${product.reference_code} product shell missing`);
    if (!output.includes(`>${expectedH1}</h1>`)) throw new Error(`${product.reference_code} H1 mismatch`);
    if (!output.includes(product.image_url)) throw new Error(`${product.reference_code} front image missing`);
    if (!output.includes('width="1200" height="1200"')) throw new Error(`${product.reference_code} image dimensions missing`);
    if (!output.includes("Sampling and approval workflow")) throw new Error(`${product.reference_code} buyer workflow missing`);
    if (!output.includes(`${escapeHtml(product.product_name)} buyer questions`)) throw new Error(`${product.reference_code} buyer FAQ missing`);
    if (!output.includes('"@type":"Product"')) throw new Error(`${product.reference_code} Product schema missing`);
    if (!output.includes('"@type":"BreadcrumbList"')) throw new Error(`${product.reference_code} Breadcrumb schema missing`);
    if (/"offers"|"review"|"aggregateRating"|"price"/i.test(output.match(/<script data-irha-route-jsonld="true"[\s\S]*?<\/script>/gi)?.join("") ?? "")) {
      throw new Error(`${product.reference_code} contains unsupported Product commerce schema`);
    }
    if (output.includes(`<title>${HOME_TITLE}</title>`) || /Loading product/i.test(output)) {
      throw new Error(`${product.reference_code} still exposes a generic or loading shell`);
    }
  }
}

async function main() {
  const template = await readFile(join(DIST_DIR, "index.html"), "utf8");
  const sitemap = await readFile(join(DIST_DIR, "sitemap.xml"), "utf8");
  const manifest = await readManifest();
  const productByPath = new Map(manifest.products.map((product) => [product.canonical_path, product]));
  const paths = extractPaths(sitemap).filter((path) => path !== "/");

  for (const path of paths) {
    const outputPath = join(DIST_DIR, path.slice(1), "index.html");
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, replaceMeta(template, path, productByPath), "utf8");
  }

  await verify(paths, manifest);
  console.log(`Generated ${paths.length} route-specific shells, including ${manifest.products.length} verified product shells`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
