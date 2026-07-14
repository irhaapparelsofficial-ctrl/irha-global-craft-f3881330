import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { SEO_BUYER_INTENT_LANDING_PAGES } from "../src/lib/buyerIntentSeoPages";
import type { BuyerIntentLandingPage } from "../src/lib/buyerIntentLandingPages";

const DIST_DIR = resolve("dist");
const SITE_URL = "https://irhaapparels.com";
const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(value: string, max = 160): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function absoluteUrl(path: string) {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

function buildJsonLd(page: BuyerIntentLandingPage) {
  const url = absoluteUrl(page.path);
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: page.title,
      description: page.description,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      inLanguage: page.locale,
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${url}#service`,
      name: page.h1,
      description: page.description,
      url,
      serviceType: page.productFocus,
      provider: { "@id": ORGANIZATION_ID },
      areaServed: { "@type": "AdministrativeArea", name: page.market },
      audience: {
        "@type": "BusinessAudience",
        audienceType: "Importers, wholesalers, retailers and private-label brands",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Products", item: `${SITE_URL}/products` },
        { "@type": "ListItem", position: 3, name: page.h1, item: url },
      ],
    },
  ];
}

function buildShell(page: BuyerIntentLandingPage): string {
  const sectionHtml = page.sections
    .map(
      (section) => `<section style="margin-top:34px;border-top:1px solid #2e2a25;padding-top:26px">
            <h2 style="font-size:28px;margin:0 0 12px;color:#e8c477">${escapeHtml(section.heading)}</h2>
            <p style="max-width:820px;color:#d7d0c4">${escapeHtml(section.body)}</p>
            <ul style="max-width:820px;padding-left:20px;color:#c8c0b5">${section.bullets
              .map((bullet) => `<li style="margin:8px 0">${escapeHtml(bullet)}</li>`)
              .join("")}</ul>
          </section>`,
    )
    .join("");

  const faqHtml = page.faqs
    .map(
      (faq) => `<article style="margin-top:20px">
              <h3 style="font-size:21px;margin:0 0 8px">${escapeHtml(faq.question)}</h3>
              <p style="margin:0;color:#c8c0b5">${escapeHtml(faq.answer)}</p>
            </article>`,
    )
    .join("");

  const relatedLinks = [...new Set([page.categoryPath, ...page.relatedPaths])]
    .map((path) => `<a href="${escapeHtml(path)}" style="color:#e8c477">${escapeHtml(path)}</a>`)
    .join("");

  return `<main id="irha-static-crawler-shell" data-irha-route-shell="${escapeHtml(page.path)}" style="min-height:100vh;background:#0a0a0a;color:#f5f1e8;padding:48px 24px;font-family:Arial,sans-serif;line-height:1.65">
        <div style="max-width:1040px;margin:0 auto">
          <p style="margin:0 0 12px;letter-spacing:.18em;text-transform:uppercase;font-size:12px;color:#c9a45c">${escapeHtml(page.eyebrow)} · Irha Apparels</p>
          <h1 style="margin:0 0 20px;font-size:clamp(34px,7vw,68px);line-height:1.08">${escapeHtml(page.h1)}</h1>
          <p style="max-width:820px;font-size:18px;color:#d7d0c4">${escapeHtml(page.intro)}</p>
          <p style="max-width:820px;color:#aaa29a">Experienced manufacturer in Sialkot, Pakistan. The website is newly built, and qualified buyers may request a live factory video call before placing an order.</p>
          <nav aria-label="Primary buyer actions" style="display:flex;flex-wrap:wrap;gap:16px;margin-top:28px">
            <a href="/inquiry?intent=rfq" style="color:#e8c477">${escapeHtml(page.primaryLabel)}</a>
            <a href="/factory-video-call" style="color:#e8c477">${escapeHtml(page.secondaryLabel)}</a>
            <a href="${escapeHtml(page.categoryPath)}" style="color:#e8c477">Explore related products</a>
          </nav>
          ${sectionHtml}
          <section style="margin-top:38px;border-top:1px solid #2e2a25;padding-top:26px">
            <h2 style="font-size:28px;margin:0 0 12px;color:#e8c477">Buyer FAQ</h2>
            ${faqHtml}
          </section>
          <nav aria-label="Related sourcing pages" style="display:flex;flex-wrap:wrap;gap:16px;margin-top:38px;border-top:1px solid #2e2a25;padding-top:26px">${relatedLinks}</nav>
        </div>
      </main>`;
}

function replaceSeo(template: string, page: BuyerIntentLandingPage): string {
  const canonical = absoluteUrl(page.path);
  const title = escapeHtml(page.title);
  const description = escapeHtml(truncate(page.description));
  const shell = buildShell(page);
  const alternates = page.alternates?.length
    ? page.alternates
    : [{ locale: page.locale.startsWith("de") ? "de" : "en", href: page.path }];
  const xDefault = page.alternates?.find((alternate) => alternate.locale === "en")?.href ?? page.path;
  const hreflang = [
    ...alternates.map(
      (alternate) => `<link rel="alternate" hreflang="${escapeHtml(alternate.locale)}" href="${escapeHtml(absoluteUrl(alternate.href))}" />`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(absoluteUrl(xDefault))}" />`,
  ].join("\n    ");
  const jsonLd = buildJsonLd(page)
    .map((schema) => `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`)
    .join("\n    ");

  return template
    .replace(/<html lang="[^"]*"(?: dir="[^"]*")?>/i, `<html lang="${escapeHtml(page.locale)}" dir="${page.direction}">`)
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
    .replace(/<meta data-irha-fallback-seo="true" name="description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="description" content="${description}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta data-irha-fallback-seo="true" property="og:title" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:title" content="${title}" />`)
    .replace(/<meta data-irha-fallback-seo="true" property="og:description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:description" content="${description}" />`)
    .replace(/<meta data-irha-fallback-seo="true" property="og:url" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:url" content="${canonical}" />`)
    .replace(/<meta data-irha-fallback-seo="true" name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="twitter:title" content="${title}" />`)
    .replace(/<meta data-irha-fallback-seo="true" name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="twitter:description" content="${description}" />`)
    .replace(/<main id="irha-static-crawler-shell"[\s\S]*?<\/main>/i, shell)
    .replace("</head>", `    ${hreflang}\n    ${jsonLd}\n  </head>`);
}

async function verify() {
  for (const page of SEO_BUYER_INTENT_LANDING_PAGES) {
    const outputPath = join(DIST_DIR, page.path.slice(1), "index.html");
    const output = await readFile(outputPath, "utf8");
    if (!output.includes(`data-irha-route-shell="${page.path}"`)) {
      throw new Error(`Buyer-intent shell marker is missing for ${page.path}`);
    }
    if (!output.includes(`<link rel="canonical" href="${absoluteUrl(page.path)}"`)) {
      throw new Error(`Buyer-intent canonical is incorrect for ${page.path}`);
    }
    if (!output.includes(`<h1`) || !output.includes(escapeHtml(page.h1))) {
      throw new Error(`Buyer-intent H1 is missing for ${page.path}`);
    }
    if (page.path.startsWith("/de/") && !output.includes('lang="de-DE"')) {
      throw new Error(`German language attribute is missing for ${page.path}`);
    }
  }
}

async function main() {
  const template = await readFile(join(DIST_DIR, "index.html"), "utf8");
  for (const page of SEO_BUYER_INTENT_LANDING_PAGES) {
    const outputPath = join(DIST_DIR, page.path.slice(1), "index.html");
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, replaceSeo(template, page), "utf8");
  }
  await verify();
  console.log(`Generated ${SEO_BUYER_INTENT_LANDING_PAGES.length} rich buyer-intent route shells`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
