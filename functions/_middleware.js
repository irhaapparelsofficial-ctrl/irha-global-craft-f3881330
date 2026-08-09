const SITE_ORIGIN = "https://irhaapparels.com";
const WEBMCP_SCRIPT = '<script src="/agent-webmcp.js" defer data-irha-agent-tools="true"></script>';
const PUBLIC_ROBOTS_DIRECTIVE = "index,follow,max-image-preview:large";
const NOINDEX_ROBOTS_DIRECTIVE = "noindex,follow";
const NOINDEX_PATHS = new Set(["/studio"]);
const NOINDEX_PREFIXES = ["/intl/"];

const PAGE_SUMMARIES = {
  "/": { title: "Irha Apparels", summary: "B2B custom apparel manufacturer in Sialkot, Pakistan for brands, wholesalers, importers, retailers and private-label buyers." },
  "/about": { title: "About Irha Apparels", summary: "Company overview for a requirement-led custom apparel manufacturer available for international B2B enquiries." },
  "/products": { title: "Irha Apparels Products", summary: "Public overview of Bavarian and Trachten wear, leather apparel, sportswear, activewear, streetwear, leisurewear and nightwear manufacturing programs." },
  "/manufacturing": { title: "Manufacturing", summary: "Requirement-led OEM, ODM and private-label apparel workflow covering development, sampling, customization, production review and order-specific shipment planning." },
  "/compliance": { title: "Compliance", summary: "Public compliance and buyer due-diligence information. Product-specific documentation is confirmed after requirements are reviewed." },
  "/buyer-trust": { title: "Buyer Trust", summary: "Buyer verification, communication and confidence information, including the option to request a live factory-view video call." },
  "/factory-video-call": { title: "Factory Video Call", summary: "Information for requesting a live factory-view video call as part of buyer verification." },
  "/resources": { title: "Buyer Resources", summary: "Public guidance for requirements, samples, quotations, shipping questions and buyer preparation." },
  "/faq": { title: "Buyer FAQ", summary: "Frequently asked questions for B2B apparel buyers. MOQ, price, timing and shipping remain subject to requirement review." },
  "/catalogue": { title: "Product Catalogue", summary: "Buyer-oriented public catalogue groups. Fixed pricing is not published; use the inquiry page for a quotation." },
  "/inquiry": { title: "B2B Inquiry", summary: "Buyer form for RFQs, catalogue requests, samples, mockups, references and meeting requests." },
  "/repeat-order": { title: "Repeat Order", summary: "Buyer workflow for a repeat-order request using previous product and production references." },
  "/contact": { title: "Contact Irha Apparels", summary: "Official public contact options for B2B buyers." },
  "/connect": { title: "Connect with Irha Apparels", summary: "Official communication options for qualified B2B apparel inquiries." },
  "/blog": { title: "Irha Apparels Blog", summary: "Public manufacturing and buyer education articles." },
  "/studio": { title: "Custom Apparel Mockup Studio", summary: "Public tool for preparing a visual direction before submitting a manufacturing inquiry." },
  "/shortlist": { title: "Buyer Product Shortlist", summary: "Public buyer shortlist used to prepare a focused apparel inquiry." },
  "/compare": { title: "Compare Apparel Programs", summary: "Public comparison view for product programs selected by a B2B buyer." },
  "/privacy-policy": { title: "Privacy Policy", summary: "Privacy information for the Irha Apparels website and public forms." },
  "/terms-of-service": { title: "Terms of Service", summary: "Terms governing use of the Irha Apparels website and public services." },
  "/markets": { title: "International B2B Apparel Markets", summary: "Country-specific sourcing guidance for apparel importers, wholesalers, brands, retailers and sports buyers in nine priority markets." },
};

const MARKET_SUMMARIES = {
  "/markets/germany": { title: "Custom Apparel Manufacturing for Buyers in Germany", summary: "Germany-focused sourcing guidance for Trachten, leather, sportswear and private-label apparel programs." },
  "/markets/austria": { title: "Private-Label Apparel Programs for Buyers in Austria", summary: "Austria-focused sourcing guidance for Trachten, leather and custom private-label apparel." },
  "/markets/switzerland": { title: "Custom Clothing Manufacturing for Buyers in Switzerland", summary: "Switzerland-focused guidance for carefully scoped private-label and custom apparel sourcing." },
  "/markets/netherlands": { title: "Private-Label Clothing Programs for Buyers in the Netherlands", summary: "Netherlands-focused sourcing guidance for streetwear, sportswear, leather and private-label apparel." },
  "/markets/united-states": { title: "Custom Apparel Manufacturing for Buyers in the United States", summary: "United States-focused sourcing guidance for private-label, sportswear, streetwear and leather apparel." },
  "/markets/united-kingdom": { title: "Private-Label Clothing Manufacturing for Buyers in the UK", summary: "United Kingdom-focused sourcing guidance for private-label, teamwear, leather and heritage apparel." },
  "/markets/canada": { title: "Custom Clothing Manufacturing for Buyers in Canada", summary: "Canada-focused sourcing guidance for custom sportswear, streetwear, leather and leisure apparel." },
  "/markets/australia": { title: "Custom Apparel Manufacturing for Buyers in Australia", summary: "Australia-focused sourcing guidance for sportswear, activewear, streetwear and custom apparel programs." },
  "/markets/new-zealand": { title: "Private-Label Apparel Programs for Buyers in New Zealand", summary: "New Zealand-focused sourcing guidance for teamwear, streetwear, leather and private-label apparel." },
};

const BUYER_INTENT_PATH = /^\/[a-z0-9-]*(?:apparel-manufacturer|clothing-manufacturer|sportswear-manufacturer|streetwear-manufacturer|leather-jacket-manufacturer|lederhosen-manufacturer|dirndl-manufacturer|grosshandel|hersteller)[a-z0-9-]*$/;

const DISCOVERY_LINKS = [
  `<${SITE_ORIGIN}/.well-known/api-catalog>; rel="api-catalog"`,
  `<${SITE_ORIGIN}/.well-known/mcp/server-card.json>; rel="service-desc"`,
  `<${SITE_ORIGIN}/.well-known/agent-skills/index.json>; rel="service-meta"`,
  `<${SITE_ORIGIN}/auth.md>; rel="authorization"`,
].join(", ");

const API_CATALOG = {
  linkset: [
    {
      anchor: `${SITE_ORIGIN}/.well-known/api-catalog`,
      item: [
        { href: "https://pvzjiozismyxqrzmtfbi.supabase.co/functions/v1/public-lead-gateway" },
        { href: `${SITE_ORIGIN}/mcp` },
      ],
    },
    {
      anchor: "https://pvzjiozismyxqrzmtfbi.supabase.co/functions/v1/public-lead-gateway",
      "service-desc": [{ href: `${SITE_ORIGIN}/openapi/public-lead-gateway.json`, type: "application/vnd.oai.openapi+json;version=3.1" }],
      "service-doc": [{ href: `${SITE_ORIGIN}/docs/public-lead-gateway.md`, type: "text/markdown" }],
    },
    {
      anchor: `${SITE_ORIGIN}/mcp`,
      "service-desc": [{ href: `${SITE_ORIGIN}/.well-known/mcp/server-card.json`, type: "application/json" }],
      "service-doc": [{ href: `${SITE_ORIGIN}/docs/mcp.md`, type: "text/markdown" }],
    },
  ],
};

function canonicalPath(pathname) {
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function isPrivateOrMachinePath(pathname) {
  return pathname === "/auth"
    || pathname.startsWith("/admin")
    || pathname.startsWith("/seo-indexing")
    || pathname.startsWith("/catalogs/")
    || pathname.startsWith("/inquiry-review")
    || pathname.startsWith("/api/")
    || pathname.startsWith("/.well-known/")
    || pathname.startsWith("/openapi/")
    || pathname.startsWith("/skills/")
    || pathname.startsWith("/docs/")
    || pathname === "/mcp"
    || pathname.startsWith("/mcp/");
}

function isNoindexPath(pathname) {
  return NOINDEX_PATHS.has(pathname) || NOINDEX_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function looksLikeFile(pathname) {
  const segment = pathname.split("/").pop() || "";
  return segment.includes(".");
}

function applyRobotsMeta(html, directive) {
  const meta = `<meta name="robots" content="${directive}" />`;
  const robotsMeta = /<meta\s+[^>]*name=["']robots["'][^>]*>/i;
  if (robotsMeta.test(html)) return html.replace(robotsMeta, meta);
  if (html.includes("</head>")) return html.replace("</head>", `    ${meta}\n  </head>`);
  return `${meta}${html}`;
}

export function pageSummaryFor(pathname) {
  const normalized = canonicalPath(pathname);
  if (PAGE_SUMMARIES[normalized]) return PAGE_SUMMARIES[normalized];
  if (MARKET_SUMMARIES[normalized]) return MARKET_SUMMARIES[normalized];
  if (BUYER_INTENT_PATH.test(normalized)) return { title: "Irha Apparels B2B Sourcing Page", summary: "Market and product-specific OEM, ODM and private-label apparel manufacturing guidance for qualified buyers." };
  if (/^\/products\/[a-z0-9-]+(?:\/[a-z0-9-]+){0,3}$/.test(normalized)) return { title: "Irha Apparels Product Program", summary: "Public B2B product and manufacturing information. Product feasibility, materials, MOQ, price, timing, shipping and documents are confirmed after human review." };
  if (/^\/intl\/[a-z]{2}(?:-[a-z]{2})?\/products\/[a-z0-9-]+(?:\/[a-z0-9-]+){0,2}$/i.test(normalized)) return { title: "Irha Apparels International Product Program", summary: "Localized public B2B product information for wholesale, OEM, ODM and private-label manufacturing." };
  if (/^\/intl\/[a-z]{2}(?:-[a-z]{2})?\/[a-z0-9-]+$/i.test(normalized)) return { title: "Irha Apparels Localized Buyer Page", summary: "Published localized B2B apparel manufacturing guidance." };
  if (/^\/catalogue\/[a-z0-9-]+$/.test(normalized)) return { title: "Irha Apparels Catalogue Group", summary: "Public B2B catalogue information. Use the inquiry page to request a quotation or product-specific confirmation." };
  if (/^\/blog\/[a-z0-9-]+$/.test(normalized)) return { title: "Irha Apparels Article", summary: "Public manufacturing and buyer education content." };
  return null;
}

function markdownBody(pathname, page) {
  const normalized = canonicalPath(pathname);
  const canonical = `${SITE_ORIGIN}${normalized === "/" ? "/" : normalized}`;
  return `# ${page.title}\n\n> ${page.summary}\n\nCanonical: ${canonical}\n\n## Buyer actions\n\n- [Browse products](${SITE_ORIGIN}/products)\n- [International markets](${SITE_ORIGIN}/markets)\n- [Review manufacturing](${SITE_ORIGIN}/manufacturing)\n- [Buyer trust](${SITE_ORIGIN}/buyer-trust)\n- [Live factory video call](${SITE_ORIGIN}/factory-video-call)\n- [Request a quote or catalogue](${SITE_ORIGIN}/inquiry)\n\n## Commercial accuracy\n\nIrha Apparels presents a requirement-led manufacturing process. Product feasibility, materials, MOQ, pricing, production timing, shipping and documentation are confirmed after the buyer's requirements are reviewed. Fixed commercial commitments and unverified certification claims are not published.\n\n## Machine-readable resources\n\n- [LLM summary](${SITE_ORIGIN}/llms.txt)\n- [Expanded LLM summary](${SITE_ORIGIN}/llms-full.txt)\n- [API catalog](${SITE_ORIGIN}/.well-known/api-catalog)\n- [MCP server card](${SITE_ORIGIN}/.well-known/mcp/server-card.json)\n- [Agent skills index](${SITE_ORIGIN}/.well-known/agent-skills/index.json)\n`;
}

function markdownResponse(request, pathname, page, status = 200) {
  const body = request.method === "HEAD" ? null : markdownBody(pathname, page);
  const normalized = canonicalPath(pathname);
  const shouldNoindex = status === 404 || isNoindexPath(normalized);
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      "CDN-Cache-Control": "no-store",
      "Content-Location": `${SITE_ORIGIN}${normalized}`,
      "Access-Control-Allow-Origin": "*",
      "Vary": "Accept",
      "Link": DISCOVERY_LINKS,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      ...(shouldNoindex ? { "X-Robots-Tag": NOINDEX_ROBOTS_DIRECTIVE } : {}),
    },
  });
}

function apiCatalogResponse(request) {
  const body = request.method === "HEAD" ? null : `${JSON.stringify(API_CATALOG, null, 2)}\n`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/linkset+json; charset=utf-8",
      "Cache-Control": "public, max-age=300, must-revalidate",
      "Access-Control-Allow-Origin": "*",
      "Link": DISCOVERY_LINKS,
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, follow",
      "X-Irha-Api-Catalog": "linkset-json",
    },
  });
}

function withDiscoveryHeaders(response) {
  const headers = new Headers(response.headers);
  const vary = headers.get("Vary");
  if (!vary) headers.set("Vary", "Accept");
  else if (!vary.toLowerCase().split(",").map((value) => value.trim()).includes("accept")) headers.set("Vary", `${vary}, Accept`);
  if (!headers.has("Link")) headers.set("Link", DISCOVERY_LINKS);
  return headers;
}

export async function onRequest(context) {
  const request = context.request;
  const method = request.method.toUpperCase();
  const url = new URL(request.url);
  const pathname = canonicalPath(url.pathname);
  const accept = request.headers.get("accept") || "";

  if ((method === "GET" || method === "HEAD") && pathname === "/.well-known/api-catalog") {
    return apiCatalogResponse(request);
  }

  if ((method === "GET" || method === "HEAD") && accept.toLowerCase().includes("text/markdown") && !isPrivateOrMachinePath(pathname) && !looksLikeFile(pathname)) {
    const page = pageSummaryFor(pathname);
    if (!page) return markdownResponse(request, pathname, { title: "Page Not Found", summary: "The requested Irha Apparels public page does not exist." }, 404);
    return markdownResponse(request, pathname, page, 200);
  }

  const response = await context.next();
  const headers = withDiscoveryHeaders(response);
  const contentType = headers.get("Content-Type") || "";
  const shouldNoindex = response.status === 404 || isPrivateOrMachinePath(pathname) || isNoindexPath(pathname);

  if (shouldNoindex) {
    headers.set("X-Robots-Tag", NOINDEX_ROBOTS_DIRECTIVE);
  } else if ((headers.get("X-Robots-Tag") || "").toLowerCase().includes("noindex")) {
    headers.delete("X-Robots-Tag");
  }

  if (method === "GET" && response.status === 200 && contentType.toLowerCase().includes("text/html") && !isPrivateOrMachinePath(pathname)) {
    const original = await response.text();
    const withAgentTools = original.includes('data-irha-agent-tools="true"') ? original : original.includes("</body>") ? original.replace("</body>", `${WEBMCP_SCRIPT}</body>`) : `${original}${WEBMCP_SCRIPT}`;
    const html = applyRobotsMeta(withAgentTools, shouldNoindex ? NOINDEX_ROBOTS_DIRECTIVE : PUBLIC_ROBOTS_DIRECTIVE);
    headers.delete("Content-Length");
    headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return new Response(html, { status: response.status, statusText: response.statusText, headers });
  }

  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
