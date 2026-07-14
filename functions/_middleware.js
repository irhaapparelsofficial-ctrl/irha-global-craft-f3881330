const SITE_ORIGIN = "https://irhaapparels.com";
const WEBMCP_SCRIPT = '<script src="/agent-webmcp.js" defer data-irha-agent-tools="true"></script>';

const PAGE_SUMMARIES = {
  "/": {
    title: "Irha Apparels",
    summary: "B2B custom apparel manufacturer in Sialkot, Pakistan for brands, wholesalers, importers, retailers and private-label buyers.",
  },
  "/about": {
    title: "About Irha Apparels",
    summary: "Company overview for an experienced custom apparel manufacturer serving global B2B buyers. The current website is newly built.",
  },
  "/products": {
    title: "Irha Apparels Products",
    summary: "Public overview of Bavarian and Trachten wear, leather apparel, sportswear, activewear, streetwear, leisurewear and nightwear manufacturing programs.",
  },
  "/manufacturing": {
    title: "Manufacturing",
    summary: "Requirement-led OEM, ODM and private-label apparel workflow covering development, sampling, customization, production review and export support.",
  },
  "/compliance": {
    title: "Compliance",
    summary: "Public compliance and buyer due-diligence information. Product-specific documentation is confirmed after requirements are reviewed.",
  },
  "/buyer-trust": {
    title: "Buyer Trust",
    summary: "Buyer verification, communication and confidence information, including the option to view the factory on a live video call.",
  },
  "/factory-video-call": {
    title: "Factory Video Call",
    summary: "Information for arranging a live factory-view video call as part of buyer verification.",
  },
  "/resources": {
    title: "Buyer Resources",
    summary: "Public guidance for requirements, samples, quotations, shipping questions and buyer preparation.",
  },
  "/faq": {
    title: "Buyer FAQ",
    summary: "Frequently asked questions for B2B apparel buyers. MOQ, price, timing and shipping remain subject to requirement review.",
  },
  "/catalogue": {
    title: "Product Catalogue",
    summary: "Buyer-oriented public catalogue groups. Fixed pricing is not published; use the inquiry page for a quotation.",
  },
  "/inquiry": {
    title: "B2B Inquiry",
    summary: "Buyer form for RFQs, catalogue requests, samples, mockups, references and meeting requests. A request is sent only after the buyer reviews and submits the form.",
  },
  "/contact": {
    title: "Contact Irha Apparels",
    summary: "Official public contact options for B2B buyers.",
  },
  "/blog": {
    title: "Irha Apparels Blog",
    summary: "Public manufacturing and buyer education articles.",
  },
  "/privacy-policy": {
    title: "Privacy Policy",
    summary: "Privacy information for the Irha Apparels website and public forms.",
  },
  "/terms-of-service": {
    title: "Terms of Service",
    summary: "Terms governing use of the Irha Apparels website and public services.",
  },
};

const DISCOVERY_LINKS = [
  `<${SITE_ORIGIN}/.well-known/api-catalog>; rel="api-catalog"`,
  `<${SITE_ORIGIN}/.well-known/mcp/server-card.json>; rel="service-desc"`,
  `<${SITE_ORIGIN}/.well-known/agent-card.json>; rel="service-desc"`,
  `<${SITE_ORIGIN}/.well-known/agent-skills/index.json>; rel="service-meta"`,
  `<${SITE_ORIGIN}/auth.md>; rel="authorization"`,
].join(", ");

function canonicalPath(pathname) {
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function isPrivateOrMachinePath(pathname) {
  return pathname === "/auth" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/.well-known/") ||
    pathname.startsWith("/openapi/") ||
    pathname.startsWith("/skills/") ||
    pathname.startsWith("/docs/") ||
    pathname === "/mcp" ||
    pathname.startsWith("/mcp/") ||
    pathname === "/a2a" ||
    pathname.startsWith("/a2a/");
}

function looksLikeFile(pathname) {
  const segment = pathname.split("/").pop() || "";
  return segment.includes(".");
}

function markdownFor(pathname) {
  const normalized = canonicalPath(pathname);
  const exact = PAGE_SUMMARIES[normalized];
  const productPage = normalized.startsWith("/products/")
    ? {
        title: "Irha Apparels Product Program",
        summary: "Public B2B product and manufacturing information. Product feasibility, materials, MOQ, price, timing, shipping and documents are confirmed after human review.",
      }
    : null;
  const cataloguePage = normalized.startsWith("/catalogue/")
    ? {
        title: "Irha Apparels Catalogue Group",
        summary: "Public B2B catalogue information. Use the inquiry page to request a quotation or product-specific confirmation.",
      }
    : null;
  const blogPage = normalized.startsWith("/blog/")
    ? {
        title: "Irha Apparels Article",
        summary: "Public manufacturing and buyer education content.",
      }
    : null;
  const page = exact || productPage || cataloguePage || blogPage || {
    title: "Irha Apparels",
    summary: "Public B2B apparel manufacturing information from Irha Apparels.",
  };
  const canonical = `${SITE_ORIGIN}${normalized === "/" ? "/" : normalized}`;

  return `# ${page.title}\n\n> ${page.summary}\n\nCanonical: ${canonical}\n\n## Buyer actions\n\n- [Browse products](${SITE_ORIGIN}/products)\n- [Review manufacturing](${SITE_ORIGIN}/manufacturing)\n- [Buyer trust](${SITE_ORIGIN}/buyer-trust)\n- [Live factory video call](${SITE_ORIGIN}/factory-video-call)\n- [Request a quote or catalogue](${SITE_ORIGIN}/inquiry)\n\n## Commercial accuracy\n\nIrha Apparels is an experienced manufacturer and the current website is newly built. Product feasibility, materials, MOQ, pricing, production timing, shipping and documentation are confirmed after the buyer's requirements are reviewed. Fixed commercial commitments and unverified certification claims are not published.\n\n## Machine-readable resources\n\n- [LLM summary](${SITE_ORIGIN}/llms.txt)\n- [Expanded LLM summary](${SITE_ORIGIN}/llms-full.txt)\n- [API catalog](${SITE_ORIGIN}/.well-known/api-catalog)\n- [MCP server card](${SITE_ORIGIN}/.well-known/mcp/server-card.json)\n- [A2A agent card](${SITE_ORIGIN}/.well-known/agent-card.json)\n- [Agent skills index](${SITE_ORIGIN}/.well-known/agent-skills/index.json)\n`;
}

function markdownResponse(request, pathname) {
  const body = request.method === "HEAD" ? null : markdownFor(pathname);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      "CDN-Cache-Control": "no-store",
      "Content-Location": `${SITE_ORIGIN}${canonicalPath(pathname)}`,
      "Access-Control-Allow-Origin": "*",
      "Vary": "Accept",
      "Link": DISCOVERY_LINKS,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}

function withDiscoveryHeaders(response) {
  const headers = new Headers(response.headers);
  const vary = headers.get("Vary");
  if (!vary) headers.set("Vary", "Accept");
  else if (!vary.toLowerCase().split(",").map((value) => value.trim()).includes("accept")) {
    headers.set("Vary", `${vary}, Accept`);
  }
  if (!headers.has("Link")) headers.set("Link", DISCOVERY_LINKS);
  return headers;
}

export async function onRequest(context) {
  const request = context.request;
  const method = request.method.toUpperCase();
  const url = new URL(request.url);
  const pathname = canonicalPath(url.pathname);
  const accept = request.headers.get("accept") || "";

  if (
    (method === "GET" || method === "HEAD") &&
    accept.toLowerCase().includes("text/markdown") &&
    !isPrivateOrMachinePath(pathname) &&
    !looksLikeFile(pathname)
  ) {
    return markdownResponse(request, pathname);
  }

  const response = await context.next();
  const headers = withDiscoveryHeaders(response);
  const contentType = headers.get("Content-Type") || "";

  if (
    method === "GET" &&
    response.status === 200 &&
    contentType.toLowerCase().includes("text/html") &&
    !isPrivateOrMachinePath(pathname)
  ) {
    const original = await response.text();
    const html = original.includes('data-irha-agent-tools="true"')
      ? original
      : original.includes("</body>")
        ? original.replace("</body>", `${WEBMCP_SCRIPT}</body>`)
        : `${original}${WEBMCP_SCRIPT}`;
    headers.delete("Content-Length");
    headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
