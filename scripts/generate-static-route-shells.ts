import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const DIST_DIR = resolve("dist");
const SITE_URL = "https://irhaapparels.com";
const HOME_TITLE = "Irha Apparels — Custom Apparel Manufacturing for Global B2B Buyers";

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
    description: "Learn about Irha Apparels, an experienced custom apparel manufacturer in Sialkot serving global B2B buyers.",
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
  return pathname.replace(/\/+$/, "") || "/";
}

function routeMeta(pathname: string) {
  const path = cleanPath(pathname);
  const exact = STATIC_META[path];
  if (exact) return exact;

  const segments = path.split("/").filter(Boolean);
  let locale = "en";
  let route = segments;
  if (segments[0] === "intl" && segments.length > 3) {
    locale = segments[1];
    route = segments.slice(2);
  }

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

    if (route.length === 3) {
      return {
        title: `${leafName} Manufacturer | Irha Apparels`,
        heading: `Custom ${leafName} Manufacturing`,
        description: `${leafName} for wholesale, OEM and private-label buyer programs. Materials, construction, branding and packaging are confirmed against buyer requirements.`,
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
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function buildShell(pathname: string, heading: string, description: string): string {
  const categoryPath = pathname.startsWith("/products/")
    ? pathname.split("/").slice(0, 3).join("/")
    : "/products";
  return `<main id="irha-static-crawler-shell" data-irha-route-shell="${escapeHtml(pathname)}" style="min-height:100vh;background:#0a0a0a;color:#f5f1e8;padding:48px 24px;font-family:Arial,sans-serif;line-height:1.6">
        <div style="max-width:960px;margin:0 auto">
          <p style="margin:0 0 12px;letter-spacing:.18em;text-transform:uppercase;font-size:12px;color:#c9a45c">Irha Apparels · Sialkot, Pakistan</p>
          <h1 style="margin:0 0 20px;font-size:clamp(34px,7vw,68px);line-height:1.08">${escapeHtml(heading)}</h1>
          <p style="max-width:760px;font-size:18px;color:#d7d0c4">${escapeHtml(description)}</p>
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

function replaceMeta(html: string, pathname: string): string {
  const meta = routeMeta(pathname);
  const title = escapeHtml(meta.title);
  const description = escapeHtml(truncate(meta.description));
  const canonical = pathname === "/" ? `${SITE_URL}/` : `${SITE_URL}${pathname}`;
  const shell = buildShell(pathname, meta.heading, meta.description);
  const locale = "locale" in meta && typeof meta.locale === "string" ? meta.locale : "en";

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: canonical,
    name: meta.title,
    description: meta.description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
    inLanguage: locale,
  }).replace(/</g, "\\u003c");

  return html
    .replace(/<html lang="[^"]*">/i, `<html lang="${escapeHtml(locale)}">`)
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
    .replace(/<meta data-irha-fallback-seo="true" name="description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="description" content="${description}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta data-irha-fallback-seo="true" property="og:title" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:title" content="${title}" />`)
    .replace(/<meta data-irha-fallback-seo="true" property="og:description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:description" content="${description}" />`)
    .replace(/<meta data-irha-fallback-seo="true" property="og:url" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:url" content="${canonical}" />`)
    .replace(/<meta data-irha-fallback-seo="true" name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="twitter:title" content="${title}" />`)
    .replace(/<meta data-irha-fallback-seo="true" name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="twitter:description" content="${description}" />`)
    .replace(/<main id="irha-static-crawler-shell"[\s\S]*?<\/main>/i, shell)
    .replace("</head>", `    <script type="application/ld+json">${jsonLd}</script>\n  </head>`);
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

async function verify(paths: string[]) {
  const required = [
    "/buyer-trust",
    "/faq",
    "/products/bavarian-trachten-wear",
    "/products/leisure-nightwear/plush-bathrobe-sleep-robe",
  ];
  for (const path of required) {
    if (!paths.includes(path)) throw new Error(`Static route shell is missing required path: ${path}`);
    const output = await readFile(join(DIST_DIR, path.slice(1), "index.html"), "utf8");
    if (!output.includes(`data-irha-route-shell="${path}"`)) {
      throw new Error(`Route shell marker is missing for ${path}`);
    }
    if (!output.includes(`<link rel="canonical" href="${SITE_URL}${path}"`)) {
      throw new Error(`Canonical is incorrect for ${path}`);
    }
    if (path.includes("plush-bathrobe") && output.includes(`<title>${HOME_TITLE}</title>`)) {
      throw new Error("Product route still uses the generic homepage title");
    }
    if (/Loading product/i.test(output)) throw new Error(`Loading placeholder leaked into ${path}`);
  }
}

async function main() {
  const template = await readFile(join(DIST_DIR, "index.html"), "utf8");
  const sitemap = await readFile(join(DIST_DIR, "sitemap.xml"), "utf8");
  const paths = extractPaths(sitemap).filter((path) => path !== "/");

  for (const path of paths) {
    const outputPath = join(DIST_DIR, path.slice(1), "index.html");
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, replaceMeta(template, path), "utf8");
  }

  await verify(paths);
  console.log(`Generated ${paths.length} route-specific static HTML shells from sitemap.xml`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
