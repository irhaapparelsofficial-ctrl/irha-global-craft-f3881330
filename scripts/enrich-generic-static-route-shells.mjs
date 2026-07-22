import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const DIST_DIR = resolve("dist");
const SALES_EMAIL = "info@irhaapparels.com";
const SALES_PHONE_DISPLAY = "+92 320 4110066";
const SALES_PHONE_LINK = "+923204110066";
const WHATSAPP_URL = "https://wa.me/923204110066";
const GENERIC_ROUTE_SHELL = /<main id="irha-static-crawler-shell" data-irha-route-shell="([^"]+)"[\s\S]*?<\/main>/i;
const PRODUCT_SHELL = 'data-irha-product-shell="true"';
const EXPECTED_PRODUCT_SHELLS = 254;

const CATEGORY_LINKS = [
  ["/products/bavarian-trachten-wear", "Bavarian & Trachten Wear", "Lederhosen, Dirndl, shirts, vests, jackets and accessories."],
  ["/products/premium-leather-apparel", "Premium Leather Apparel", "Custom leather jackets, outerwear, vests and coordinated accessories."],
  ["/products/sportswear", "Sportswear & Teamwear", "Team kits, training wear and performance apparel developed to buyer specifications."],
  ["/products/streetwear-activewear", "Streetwear & Activewear", "Private-label hoodies, T-shirts, joggers, activewear and capsule programs."],
  ["/products/leisure-nightwear", "Leisurewear & Nightwear", "Loungewear, sleepwear, robes and casual essentials for B2B programs."],
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function titleCase(value) {
  return decodeURIComponent(value)
    .split("-")
    .filter(Boolean)
    .map((word) => {
      const upper = word.toUpperCase();
      if (["B2B", "OEM", "ODM", "FAQ", "USA", "UK"].includes(upper)) return upper;
      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

function routeEyebrow(pathname) {
  if (pathname.startsWith("/products")) return "Custom manufacturing collection";
  if (pathname.startsWith("/catalogue")) return "B2B product catalogue";
  if (pathname.startsWith("/blog")) return "Buyer sourcing resource";
  if (pathname.startsWith("/intl/")) return "International buyer program";
  return "Irha Apparels · Sialkot, Pakistan";
}

function relatedCollection(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "products" && segments[1]) return `/products/${segments[1]}`;
  return "/products";
}

function breadcrumbs(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  const items = [{ href: "/", label: "Home" }];
  let current = "";
  for (const segment of segments) {
    current += `/${segment}`;
    items.push({ href: current, label: titleCase(segment) });
  }
  return items
    .map((item, index) => {
      const label = escapeHtml(item.label);
      return index === items.length - 1
        ? `<span aria-current="page" style="color:#aaa29a">${label}</span>`
        : `<a href="${escapeHtml(item.href)}" style="color:#e8c477;text-decoration:none">${label}</a>`;
    })
    .join('<span aria-hidden="true" style="color:#5f584e">/</span>');
}

function categoriesHtml() {
  return CATEGORY_LINKS.map(
    ([href, name, description]) => `<article style="border:1px solid #2e2a25;background:#111;padding:22px">
              <h3 style="margin:0 0 10px;font-size:21px"><a href="${href}" style="color:#f5f1e8;text-decoration:none">${name}</a></h3>
              <p style="margin:0 0 14px;color:#bdb5aa">${description}</p>
              <a href="${href}" style="color:#e8c477;text-decoration:none">View manufacturing collection →</a>
            </article>`,
  ).join("");
}

function richShell(pathname, headingHtml, descriptionHtml) {
  const encodedSource = encodeURIComponent(pathname);
  const collectionPath = relatedCollection(pathname);
  return `<main id="irha-static-crawler-shell" data-irha-route-shell="${escapeHtml(pathname)}" data-irha-rich-route-shell="true" style="min-height:100vh;background:#0a0a0a;color:#f5f1e8;font-family:Arial,Helvetica,sans-serif;line-height:1.65">
        <header style="border-bottom:1px solid #2e2a25;background:#0a0a0a">
          <div style="max-width:1120px;margin:0 auto;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap">
            <a href="/" aria-label="Irha Apparels home" style="color:#e8c477;text-decoration:none;font-weight:700;letter-spacing:.18em;font-size:14px">IRHA APPARELS</a>
            <nav aria-label="Primary navigation" style="display:flex;flex-wrap:wrap;gap:16px;font-size:13px">
              <a href="/products" style="color:#f5f1e8;text-decoration:none">Products</a>
              <a href="/manufacturing" style="color:#f5f1e8;text-decoration:none">Manufacturing</a>
              <a href="/buyer-trust" style="color:#f5f1e8;text-decoration:none">Buyer Trust</a>
              <a href="/contact" style="color:#f5f1e8;text-decoration:none">Contact</a>
              <a href="/inquiry?intent=rfq&amp;source=${encodedSource}" style="color:#e8c477;text-decoration:none;font-weight:700">Request Quote</a>
            </nav>
          </div>
        </header>
        <div style="max-width:1120px;margin:0 auto;padding:34px 24px 64px">
          <nav aria-label="Breadcrumb" style="display:flex;flex-wrap:wrap;gap:9px;font-size:12px;margin-bottom:28px">${breadcrumbs(pathname)}</nav>
          <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:30px;align-items:start;padding-bottom:42px">
            <div>
              <p style="margin:0 0 12px;letter-spacing:.18em;text-transform:uppercase;font-size:12px;color:#c9a45c">${escapeHtml(routeEyebrow(pathname))}</p>
              <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:clamp(36px,7vw,68px);line-height:1.08;font-weight:500">${headingHtml}</h1>
              <p style="max-width:820px;font-size:18px;color:#d7d0c4">${descriptionHtml}</p>
              <p style="max-width:820px;color:#aaa29a">Irha Apparels works with brands, wholesalers, importers, retailers, teams and sourcing professionals. Materials, sampling, quantity, customization, pricing, production timing, packaging and shipping are confirmed after the buyer requirement is reviewed.</p>
              <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:26px">
                <a href="/inquiry?intent=rfq&amp;source=${encodedSource}" style="display:inline-block;background:#d1ad5a;color:#090909;padding:13px 18px;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Request a Manufacturing Quote</a>
                <a href="${escapeHtml(collectionPath)}" style="display:inline-block;border:1px solid #645943;color:#e8c477;padding:12px 18px;text-decoration:none;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Explore Related Products</a>
                <a href="${WHATSAPP_URL}" style="display:inline-block;border:1px solid #645943;color:#f5f1e8;padding:12px 18px;text-decoration:none;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Discuss on WhatsApp</a>
              </div>
            </div>
            <aside style="border:1px solid rgba(232,196,119,.35);background:#111;padding:24px">
              <p style="margin:0 0 8px;color:#c9a45c;text-transform:uppercase;letter-spacing:.14em;font-size:12px">Buyer verification</p>
              <h2 style="margin:0 0 12px;font-size:27px">Experienced manufacturer. Newly built website.</h2>
              <p style="margin:0 0 18px;color:#d7d0c4">Qualified buyers may request a scheduled live factory-view video call and discuss the production path before placing an order.</p>
              <ul style="margin:0;padding-left:20px;color:#c8c0b5"><li>OEM, ODM and private-label programs</li><li>Sampling and buyer approval before bulk commitment</li><li>Labels, tags, packaging and decoration reviewed per program</li><li>MOQ, timing and pricing confirmed against the actual requirement</li></ul>
              <p style="margin:18px 0 0"><a href="/factory-video-call" style="color:#e8c477">Request a live factory video call →</a></p>
            </aside>
          </section>
          <section aria-labelledby="crawler-capabilities" style="margin-top:8px">
            <p style="margin:0 0 8px;color:#c9a45c;text-transform:uppercase;letter-spacing:.14em;font-size:12px">B2B manufacturing capabilities</p>
            <h2 id="crawler-capabilities" style="font-size:clamp(28px,5vw,42px);margin:0 0 20px">Built around the buyer's approved brief.</h2>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:1px;background:#2e2a25;border:1px solid #2e2a25">
              <article style="background:#111;padding:20px"><h3 style="margin:0 0 8px">Custom Development</h3><p style="margin:0;color:#bdb5aa">Tech packs, sketches, reference samples and product briefs can be reviewed before development.</p></article>
              <article style="background:#111;padding:20px"><h3 style="margin:0 0 8px">Branding Options</h3><p style="margin:0;color:#bdb5aa">Embroidery, printing, patches, labels, tags and placement requirements are scoped by product.</p></article>
              <article style="background:#111;padding:20px"><h3 style="margin:0 0 8px">Private Label</h3><p style="margin:0;color:#bdb5aa">Woven labels, care labels, hangtags and buyer-specific packaging can be included in the program.</p></article>
              <article style="background:#111;padding:20px"><h3 style="margin:0 0 8px">Order Documentation</h3><p style="margin:0;color:#bdb5aa">Packing, labelling, quality and shipping documentation needs are reviewed before confirmation.</p></article>
            </div>
          </section>
          <section aria-labelledby="crawler-categories" style="margin-top:48px">
            <p style="margin:0 0 8px;color:#c9a45c;text-transform:uppercase;letter-spacing:.14em;font-size:12px">Product categories</p>
            <h2 id="crawler-categories" style="font-size:clamp(28px,5vw,42px);margin:0 0 20px">Five specialist apparel categories.</h2>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px">${categoriesHtml()}</div>
          </section>
          <section aria-labelledby="crawler-process" style="margin-top:48px">
            <p style="margin:0 0 8px;color:#c9a45c;text-transform:uppercase;letter-spacing:.14em;font-size:12px">Manufacturing workflow</p>
            <h2 id="crawler-process" style="font-size:clamp(28px,5vw,42px);margin:0 0 20px">From requirement to shipping review.</h2>
            <ol style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;list-style:none;padding:0;margin:0">
              <li style="border:1px solid #2e2a25;padding:20px"><strong style="color:#e8c477">01 · Requirement review</strong><p style="margin:10px 0 0;color:#bdb5aa">Confirm product, material, quantity, branding, packaging, destination and commercial priorities.</p></li>
              <li style="border:1px solid #2e2a25;padding:20px"><strong style="color:#e8c477">02 · Sampling path</strong><p style="margin:10px 0 0;color:#bdb5aa">Agree the development, sample, revision and approval process for the actual style.</p></li>
              <li style="border:1px solid #2e2a25;padding:20px"><strong style="color:#e8c477">03 · Production planning</strong><p style="margin:10px 0 0;color:#bdb5aa">Confirm construction, decoration, labels, packaging, quality checkpoints and timing.</p></li>
              <li style="border:1px solid #2e2a25;padding:20px"><strong style="color:#e8c477">04 · Packing and shipping</strong><p style="margin:10px 0 0;color:#bdb5aa">Review final packing, carton marks, documents and the approved shipping arrangement.</p></li>
            </ol>
          </section>
          <section aria-labelledby="crawler-faq" style="margin-top:48px;border-top:1px solid #2e2a25;padding-top:34px">
            <p style="margin:0 0 8px;color:#c9a45c;text-transform:uppercase;letter-spacing:.14em;font-size:12px">Buyer questions</p>
            <h2 id="crawler-faq" style="font-size:clamp(28px,5vw,42px);margin:0 0 18px">What buyers usually need to confirm.</h2>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px">
              <article><h3 style="margin:0 0 8px">What is the MOQ?</h3><p style="margin:0;color:#bdb5aa">MOQ is confirmed after the product, material, decoration, size ratio and packaging requirement are reviewed.</p></article>
              <article><h3 style="margin:0 0 8px">Can a sample be approved first?</h3><p style="margin:0;color:#bdb5aa">A sampling and revision path can be agreed before bulk production. Timing and charges depend on the actual requirement.</p></article>
              <article><h3 style="margin:0 0 8px">Can you add our private label?</h3><p style="margin:0;color:#bdb5aa">Brand labels, care labels, hangtags, packaging and decoration can be scoped to the buyer's approved brand system.</p></article>
              <article><h3 style="margin:0 0 8px">How can we verify the factory?</h3><p style="margin:0;color:#bdb5aa">Qualified buyers can request a scheduled live factory-view video call and discuss relevant manufacturing areas directly.</p></article>
            </div>
          </section>
          <section style="margin-top:48px;border:1px solid rgba(232,196,119,.35);background:#111;padding:28px">
            <p style="margin:0 0 8px;color:#c9a45c;text-transform:uppercase;letter-spacing:.14em;font-size:12px">Start a buyer program</p>
            <h2 style="font-size:clamp(28px,5vw,42px);margin:0 0 12px">Send the real requirement for a scoped quotation.</h2>
            <p style="max-width:840px;color:#bdb5aa">Share the product, quantity, material, customization, branding, packaging and destination. The team will review the requirement before confirming MOQ, price, sample path, production timing and shipping.</p>
            <div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:20px"><a href="/inquiry?intent=rfq&amp;source=${encodedSource}" style="color:#e8c477">Request a Quote</a><a href="/catalogue" style="color:#e8c477">View Catalogue</a><a href="/buyer-trust" style="color:#e8c477">Buyer Trust Center</a><a href="/contact" style="color:#e8c477">Contact Irha Apparels</a></div>
          </section>
        </div>
        <footer style="border-top:1px solid #2e2a25;background:#080808"><div style="max-width:1120px;margin:0 auto;padding:28px 24px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;color:#aaa29a;font-size:13px"><div><strong style="color:#f5f1e8">Irha Apparels</strong><br>B2B custom apparel manufacturer<br>Sialkot, Punjab, Pakistan</div><div><strong style="color:#f5f1e8">Contact</strong><br><a href="mailto:${SALES_EMAIL}" style="color:#e8c477">${SALES_EMAIL}</a><br><a href="tel:${SALES_PHONE_LINK}" style="color:#e8c477">${SALES_PHONE_DISPLAY}</a><br><a href="${WHATSAPP_URL}" style="color:#e8c477">WhatsApp</a></div><div><strong style="color:#f5f1e8">Buyer links</strong><br><a href="/manufacturing" style="color:#aaa29a">Manufacturing</a><br><a href="/faq" style="color:#aaa29a">Buyer FAQ</a><br><a href="/factory-video-call" style="color:#aaa29a">Live factory call</a></div><div><strong style="color:#f5f1e8">Social</strong><br><a href="https://www.instagram.com/irhaapparels/" style="color:#e8c477">Instagram @irhaapparels</a><br><span>OEM · ODM · Private Label</span></div></div></footer>
      </main>`;
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(target)));
    else if (entry.isFile() && entry.name === "index.html") files.push(target);
  }
  return files;
}

async function main() {
  const files = await walk(DIST_DIR);
  let enriched = 0;
  let productShellsPreserved = 0;

  for (const file of files) {
    if (relative(DIST_DIR, file) === "index.html") continue;
    const html = await readFile(file, "utf8");
    const match = html.match(GENERIC_ROUTE_SHELL);
    if (!match) continue;
    const original = match[0];
    if (original.includes(PRODUCT_SHELL)) {
      productShellsPreserved += 1;
      continue;
    }

    const pathname = match[1];
    const headingHtml = original.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.trim();
    const afterHeading = original.split(/<\/h1>/i)[1] ?? "";
    const descriptionHtml = afterHeading.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1]?.trim();
    if (!headingHtml || !descriptionHtml) throw new Error(`Unable to extract unique route heading or description for ${pathname}`);

    const output = html.replace(GENERIC_ROUTE_SHELL, richShell(pathname, headingHtml, descriptionHtml));
    for (const token of ['data-irha-rich-route-shell="true"', SALES_EMAIL, SALES_PHONE_DISPLAY, WHATSAPP_URL, "Five specialist apparel categories", "From requirement to shipping review", "Request a Manufacturing Quote", "Experienced manufacturer. Newly built website."]) {
      if (!output.includes(token)) throw new Error(`Enriched crawler shell for ${pathname} is missing: ${token}`);
    }
    if (output.includes("MOQ 50") || output.includes("45-Day Production") || output.includes("BSCI Audited")) {
      throw new Error(`Enriched crawler shell for ${pathname} contains an unsupported legacy claim`);
    }
    await writeFile(file, output, "utf8");
    enriched += 1;
  }

  if (productShellsPreserved !== EXPECTED_PRODUCT_SHELLS) {
    throw new Error(`Expected ${EXPECTED_PRODUCT_SHELLS} product shells to remain product-specific; found ${productShellsPreserved}`);
  }
  if (enriched === 0) throw new Error("No generic static route shells were enriched");
  console.log(`Enriched ${enriched} generic route shells and preserved ${productShellsPreserved} product-specific shells`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
