import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { SEO_BUYER_INTENT_LANDING_PAGES } from "../src/lib/buyerIntentSeoPages";
import { getBuyerJourneyCopy, getBuyerJourneyLocaleForPage } from "../src/lib/buyerJourneyLocaleCopy";
import {
  getHreflangAlternates,
  getPublishedRoute,
  getXDefaultPath,
  isPublishedLocalizedRoute,
} from "../src/lib/i18nFoundation";
import type { BuyerIntentLandingPage } from "../src/lib/buyerIntentLandingPages";

const DIST_DIR = resolve("dist");
const SITE_URL = "https://irhaapparels.com";
const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}
function truncate(value: string, max = 160): string { return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`; }
function absoluteUrl(path: string) { return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`; }

function buildJsonLd(page: BuyerIntentLandingPage) {
  const url = absoluteUrl(page.path);
  const locale = getBuyerJourneyLocaleForPage(page);
  const copy = getBuyerJourneyCopy(locale);
  const homePath = locale === "en" ? "/" : `/${locale}/`;
  const breadcrumbs = locale === "en"
    ? [
        { "@type": "ListItem", position: 1, name: copy.home, item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: copy.products, item: `${SITE_URL}/products` },
        { "@type": "ListItem", position: 3, name: page.h1, item: url },
      ]
    : [
        { "@type": "ListItem", position: 1, name: copy.home, item: absoluteUrl(homePath) },
        { "@type": "ListItem", position: 2, name: page.h1, item: url },
      ];
  return [
    { "@context": "https://schema.org", "@type": "WebPage", "@id": `${url}#webpage`, url, name: page.title, description: page.description, isPartOf: { "@id": WEBSITE_ID }, about: { "@id": ORGANIZATION_ID }, inLanguage: page.locale },
    { "@context": "https://schema.org", "@type": "Service", "@id": `${url}#service`, name: page.h1, description: page.description, url, serviceType: page.productFocus, provider: { "@id": ORGANIZATION_ID }, areaServed: { "@type": "AdministrativeArea", name: page.market }, audience: { "@type": "BusinessAudience", audienceType: copy.audience } },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: page.faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: breadcrumbs },
  ];
}

function readableRelatedLabel(path: string, page: BuyerIntentLandingPage): string {
  const locale = getBuyerJourneyLocaleForPage(page);
  const copy = getBuyerJourneyCopy(locale);
  const related = SEO_BUYER_INTENT_LANDING_PAGES.find((candidate) => candidate.path === path);
  const fallback = path.split("/").filter(Boolean).at(-1)?.replace(/-/g, " ") ?? path;
  const label = related?.h1 ?? fallback;
  return locale !== "en" && !path.startsWith(`/${locale}/`) ? `${copy.englishPagePrefix}${label}` : label;
}

function buildShell(page: BuyerIntentLandingPage): string {
  const locale = getBuyerJourneyLocaleForPage(page);
  const copy = getBuyerJourneyCopy(locale);
  const homePath = locale === "en" ? "/" : `/${locale}/`;
  const externalEnglish = (path: string) => locale !== "en" && !path.startsWith(`/${locale}/`);
  const sectionHtml = page.sections.map((section) => `<section style="margin-top:34px;border-top:1px solid #2e2a25;padding-top:26px">
            <h2 style="font-size:clamp(24px,4vw,30px);line-height:1.2;margin:0 0 12px;color:#e8c477">${escapeHtml(section.heading)}</h2>
            <p style="max-width:820px;color:#d7d0c4">${escapeHtml(section.body)}</p>
            <ul style="max-width:820px;padding-left:20px;color:#c8c0b5">${section.bullets.map((bullet) => `<li style="margin:8px 0">${escapeHtml(bullet)}</li>`).join("")}</ul>
          </section>`).join("");
  const faqHtml = page.faqs.map((faq) => `<article style="margin-top:20px"><h3 style="font-size:clamp(19px,3vw,22px);line-height:1.35;margin:0 0 8px">${escapeHtml(faq.question)}</h3><p style="margin:0;color:#c8c0b5">${escapeHtml(faq.answer)}</p></article>`).join("");
  const relatedLinks = [...new Set([page.categoryPath, ...page.relatedPaths])]
    .map((path) => `<a href="${escapeHtml(path)}"${externalEnglish(path) ? ' hreflang="en" lang="en"' : ` hreflang="${locale}" lang="${locale}"`} style="color:#e8c477;text-decoration:none">${escapeHtml(readableRelatedLabel(path, page))}</a>`)
    .join("");

  return `<div id="irha-static-buyer-page" data-irha-static-buyer-shell="true" data-irha-route-shell="${escapeHtml(page.path)}" style="min-height:100vh;background:#0a0a0a;color:#f5f1e8;font-family:Arial,Helvetica,sans-serif;line-height:1.65">
      <header style="position:relative;border-bottom:1px solid #2e2a25;background:#0a0a0a"><div style="max-width:1120px;margin:0 auto;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap">
        <a href="${homePath}" aria-label="${escapeHtml(copy.homeAria)}" style="color:#e8c477;text-decoration:none;font-weight:700;letter-spacing:.2em;font-size:14px">IRHA APPARELS</a>
        <nav aria-label="${escapeHtml(copy.primaryNavigation)}" style="display:flex;flex-wrap:wrap;gap:18px;font-size:12px">
          <a href="/products"${locale !== "en" ? ' hreflang="en" lang="en"' : ""} style="color:#f5f1e8;text-decoration:none">${escapeHtml(copy.products)}</a>
          <a href="/buyer-trust"${locale !== "en" ? ' hreflang="en" lang="en"' : ""} style="color:#f5f1e8;text-decoration:none">${escapeHtml(copy.buyerTrust)}</a>
          <a href="/factory-video-call" style="color:#f5f1e8;text-decoration:none">${escapeHtml(copy.factoryCall)}</a>
          <a href="/inquiry?intent=rfq" style="color:#e8c477;text-decoration:none;font-weight:700">${escapeHtml(copy.requestQuote)}</a>
        </nav></div></header>
      <main id="irha-static-crawler-shell" lang="${locale}" style="max-width:1040px;margin:0 auto;padding:48px 24px 64px">
        <p style="margin:0 0 12px;letter-spacing:.18em;text-transform:uppercase;font-size:12px;color:#c9a45c">${escapeHtml(page.eyebrow)} · Irha Apparels</p>
        <h1 style="max-width:920px;margin:0 0 20px;font-family:Georgia,serif;font-size:clamp(34px,7vw,68px);line-height:1.08;font-weight:500">${escapeHtml(page.h1)}</h1>
        <p style="max-width:820px;font-size:18px;color:#d7d0c4">${escapeHtml(page.intro)}</p>
        <p style="max-width:820px;color:#aaa29a">${escapeHtml(copy.trustStatement)}</p>
        <nav aria-label="${escapeHtml(copy.buyerActions)}" style="display:flex;flex-wrap:wrap;gap:12px;margin-top:28px">
          <a href="/inquiry?intent=rfq&amp;source=${encodeURIComponent(page.path)}" style="display:inline-block;background:#d1ad5a;color:#090909;padding:12px 18px;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(page.primaryLabel)}</a>
          <a href="/factory-video-call" style="display:inline-block;border:1px solid #645943;color:#f5f1e8;padding:11px 18px;text-decoration:none;font-size:12px;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(page.secondaryLabel)}</a>
          <a href="${escapeHtml(page.categoryPath)}"${locale !== "en" ? ' hreflang="en" lang="en"' : ""} style="display:inline-block;border:1px solid #645943;color:#e8c477;padding:11px 18px;text-decoration:none;font-size:12px;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(copy.explore)}</a>
        </nav>
        ${sectionHtml}
        <section style="margin-top:38px;border-top:1px solid #2e2a25;padding-top:26px"><p style="letter-spacing:.18em;text-transform:uppercase;font-size:11px;color:#c9a45c">${escapeHtml(copy.faqEyebrow)}</p><h2 style="font-size:clamp(24px,4vw,30px);margin:0 0 12px;color:#e8c477">${escapeHtml(copy.faqTitle)}</h2>${faqHtml}</section>
        <nav aria-label="${escapeHtml(copy.relatedAria)}" style="display:flex;flex-wrap:wrap;gap:16px;margin-top:38px;border-top:1px solid #2e2a25;padding-top:26px">${relatedLinks}</nav>
      </main>
      <footer style="border-top:1px solid #2e2a25;background:#080808"><div style="max-width:1120px;margin:0 auto;padding:28px 24px;display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;color:#aaa29a;font-size:12px"><span>Irha Apparels · Sialkot, Pakistan · ${escapeHtml(copy.manufacturing)}</span><span><a href="/contact"${locale !== "en" ? ' hreflang="en" lang="en"' : ""} style="color:#e8c477;text-decoration:none">${escapeHtml(copy.contact)}</a> · <a href="/privacy-policy"${locale !== "en" ? ' hreflang="en" lang="en"' : ""} style="color:#aaa29a;text-decoration:none">${escapeHtml(copy.privacy)}</a></span></div></footer>
    </div>`;
}

function stripApplicationRuntime(template: string): string {
  return template
    .replace(/\s*<script(?![^>]*type=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\s*<link[^>]+rel=["']modulepreload["'][^>]*>/gi, "")
    .replace(/\s*<link[^>]+rel=["']stylesheet["'][^>]*>/gi, "")
    .replace(/\s*<link[^>]+rel=["']preconnect["'][^>]*fonts\.(?:googleapis|gstatic)\.com[^>]*>/gi, "");
}
function removeAlternates(template: string): string { return template.replace(/\s*<link\s+rel=["']alternate["'][^>]*>/gi, ""); }

function replaceSeo(template: string, page: BuyerIntentLandingPage): string {
  const canonical = absoluteUrl(page.path);
  const title = escapeHtml(page.title);
  const description = escapeHtml(truncate(page.description));
  const shell = buildShell(page);
  const registryAlternates = getPublishedRoute(page.path) ? getHreflangAlternates(page.path) : [];
  const alternates = registryAlternates.length > 0 ? registryAlternates : page.alternates?.length ? page.alternates : [{ locale: getBuyerJourneyLocaleForPage(page), href: page.path }];
  const xDefault = getXDefaultPath(page.path);
  const hreflang = [...alternates.map((alternate) => `<link rel="alternate" hreflang="${escapeHtml(alternate.locale)}" href="${escapeHtml(absoluteUrl(alternate.href))}" />`), `<link rel="alternate" hreflang="x-default" href="${escapeHtml(absoluteUrl(xDefault))}" />`].join("\n    ");
  const jsonLd = buildJsonLd(page).map((schema) => `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`).join("\n    ");
  return removeAlternates(stripApplicationRuntime(template))
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

const FORBIDDEN_FALLBACK: Record<string, string[]> = {
  de: ["Buyer FAQ", "Request Quote", "Explore related products", "Experienced manufacturer in Sialkot", 'aria-label="Primary navigation"'],
  fr: ["Buyer FAQ", "Request Quote", "Explore related products", "Experienced manufacturer in Sialkot", "FAQ für Einkäufer", "Angebot anfragen"],
  nl: ["Buyer FAQ", "Request Quote", "Explore related products", "Experienced manufacturer in Sialkot", "FAQ pour les acheteurs", "Demander un devis"],
};

async function verify() {
  for (const page of SEO_BUYER_INTENT_LANDING_PAGES) {
    const outputPath = join(DIST_DIR, page.path.slice(1), "index.html");
    const output = await readFile(outputPath, "utf8");
    const locale = getBuyerJourneyLocaleForPage(page);
    const copy = getBuyerJourneyCopy(locale);
    if (!output.includes(`data-irha-route-shell="${page.path}"`)) throw new Error(`Buyer-intent shell marker is missing for ${page.path}`);
    if (!output.includes('data-irha-static-buyer-shell="true"')) throw new Error(`Static buyer shell marker is missing for ${page.path}`);
    if (!output.includes(`<link rel="canonical" href="${absoluteUrl(page.path)}"`)) throw new Error(`Buyer-intent canonical is incorrect for ${page.path}`);
    if (!output.includes("<h1") || !output.includes(escapeHtml(page.h1))) throw new Error(`Buyer-intent H1 is missing for ${page.path}`);
    if (locale !== "en") {
      if (!output.includes(`lang="${page.locale}"`)) throw new Error(`Localized language attribute is missing for ${page.path}`);
      if (!isPublishedLocalizedRoute(page.path)) throw new Error(`Unpublished localized buyer route reached static generation: ${page.path}`);
      const mixedFallback = FORBIDDEN_FALLBACK[locale]?.find((phrase) => output.includes(phrase));
      if (mixedFallback) throw new Error(`Foreign fallback leaked into ${locale} raw output for ${page.path}: ${mixedFallback}`);
      if (!output.includes(escapeHtml(copy.faqTitle)) || !output.includes(escapeHtml(copy.requestQuote))) throw new Error(`Localized buyer guidance is incomplete for ${page.path}`);
    }
    if (/<script(?![^>]*type=["']application\/ld\+json["'])/i.test(output)) throw new Error(`Application JavaScript leaked into static buyer page: ${page.path}`);
    if (/rel=["'](?:stylesheet|modulepreload)["']/i.test(output)) throw new Error(`Application CSS or module preload leaked into static buyer page: ${page.path}`);
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
  console.log(`Generated ${SEO_BUYER_INTENT_LANDING_PAGES.length} runtime-free buyer-intent HTML pages`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
