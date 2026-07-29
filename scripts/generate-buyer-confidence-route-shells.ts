import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  BUYER_INFORMATION_COPY,
  MATERIAL_DISCLAIMER,
  MATERIAL_FAMILIES,
  MATERIAL_PAGE_COPY,
  MATERIALS,
  ROUTES,
  materialDetail,
} from "../src/data/buyerCapabilities";
import { localizedMaterialSpecification } from "../src/data/materialSpecificationCopy";
import {
  getHreflangAlternates,
  getXDefaultPath,
  type LocaleCode,
} from "../src/lib/i18nFoundation";

const DIST_DIR = resolve("dist");
const SITE_URL = "https://irhaapparels.com";
const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const LOCALES: readonly LocaleCode[] = ["en", "de", "fr", "nl"];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function absolute(path: string): string {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

function routeFile(path: string): string {
  return join(DIST_DIR, path.slice(1), "index.html");
}

function link(path: string, label: string, extra = ""): string {
  return `<a href="${escapeHtml(path)}"${extra} style="display:inline-flex;min-height:44px;align-items:center;border:1px solid #6b5a34;padding:10px 14px;color:#e8c477;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.06em">${escapeHtml(label)}</a>`;
}

function list(items: readonly string[]): string {
  return `<ul style="display:grid;gap:10px;margin:18px 0 0;padding:0;list-style:none">${items.map((item) => `<li style="border:1px solid #2e2a25;background:#101010;padding:14px;color:#cfc7bb">✓ ${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function staticHeader(locale: LocaleCode, home: string): string {
  const nav = locale === "de"
    ? ["Produkte", "Materialien", "Einkäuferinformationen", "Anfrage"]
    : locale === "fr"
      ? ["Produits", "Matières", "Informations acheteurs", "Demande"]
      : locale === "nl"
        ? ["Producten", "Materialen", "Inkopersinformatie", "Aanvraag"]
        : ["Products", "Materials", "Buyer information", "Inquiry"];
  return `<header style="border-bottom:1px solid #2e2a25;background:#080808"><div style="max-width:1120px;margin:0 auto;padding:17px 22px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap"><a href="${home}" style="color:#e8c477;text-decoration:none;font-weight:700;letter-spacing:.16em">IRHA APPARELS</a><nav aria-label="Primary navigation" style="display:flex;gap:14px;flex-wrap:wrap;font-size:12px"><a href="/products" style="color:#f5f1e8;text-decoration:none">${nav[0]}</a><a href="${ROUTES.materials[locale]}" style="color:#f5f1e8;text-decoration:none">${nav[1]}</a><a href="${ROUTES.buyerInformation[locale]}" style="color:#f5f1e8;text-decoration:none">${nav[2]}</a><a href="/inquiry?intent=rfq" style="color:#e8c477;text-decoration:none;font-weight:700">${nav[3]}</a></nav></div></header>`;
}

function staticFooter(): string {
  return `<footer style="border-top:1px solid #2e2a25;background:#080808"><div style="max-width:1120px;margin:0 auto;padding:24px;color:#aaa29a;font-size:12px">Irha Apparels · Sialkot, Pakistan · <a href="mailto:info@irhaapparels.com" style="color:#e8c477">info@irhaapparels.com</a> · <a href="/privacy-policy" style="color:#e8c477">Privacy</a></div></footer>`;
}

function materialShell(locale: LocaleCode): string {
  const copy = MATERIAL_PAGE_COPY[locale];
  const home = locale === "en" ? "/" : `/${locale}/`;
  const familyHtml = MATERIAL_FAMILIES.map((family) => {
    const entries = MATERIALS.filter((material) => material.family === family.id);
    return `<section id="${family.id}" style="margin-top:42px;border-top:1px solid #2e2a25;padding-top:30px"><h2 style="margin:0;color:#e8c477;font:500 clamp(28px,4vw,38px)/1.15 Georgia,serif">${escapeHtml(family.title[locale])}</h2><p style="max-width:820px;color:#bdb5a8">${escapeHtml(family.intro[locale])}</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:22px">${entries.map((material) => {
      const detail = materialDetail(material, locale);
      const specification = localizedMaterialSpecification(material, locale);
      return `<article id="${material.id}" style="border:1px solid #302b24;background:#101010;padding:20px"><h3 style="margin:0 0 14px;color:#f5f1e8;font:500 25px/1.2 Georgia,serif">${escapeHtml(material.name[locale])}</h3><dl style="display:grid;gap:10px;margin:0;font-size:13px"><div><dt style="color:#c9a45c">${escapeHtml(copy.composition)}</dt><dd style="margin:3px 0 0;color:#cbc3b7">${escapeHtml(specification.composition)}</dd></div><div><dt style="color:#c9a45c">${escapeHtml(copy.weight)}</dt><dd style="margin:3px 0 0;color:#cbc3b7">${escapeHtml(specification.weight)}</dd></div><div><dt style="color:#c9a45c">${escapeHtml(copy.structure)}</dt><dd style="margin:3px 0 0;color:#cbc3b7">${escapeHtml(detail.structure)}</dd></div><div><dt style="color:#c9a45c">${escapeHtml(copy.uses)}</dt><dd style="margin:3px 0 0;color:#cbc3b7">${escapeHtml(detail.uses.join(" · "))}</dd></div><div><dt style="color:#c9a45c">${escapeHtml(copy.sourcing)}</dt><dd style="margin:3px 0 0;color:#cbc3b7">${escapeHtml(detail.sourcing)}</dd></div></dl><div style="margin-top:16px">${link(`/inquiry?intent=rfq&category=materials&name=${encodeURIComponent(`Material reference: ${material.name[locale]}`)}`, copy.rfq)}</div></article>`;
    }).join("")}</div></section>`;
  }).join("");

  return `<div data-irha-static-buyer-shell="true" data-irha-buyer-confidence-kind="materials" lang="${locale}" style="min-height:100vh;background:#0a0a0a;color:#f5f1e8;font-family:Arial,Helvetica,sans-serif;line-height:1.65">${staticHeader(locale, home)}<main id="irha-static-crawler-shell" data-irha-route-shell="${ROUTES.materials[locale]}" style="max-width:1120px;margin:0 auto;padding:48px 22px 68px"><p style="margin:0 0 12px;color:#c9a45c;letter-spacing:.18em;text-transform:uppercase;font-size:12px">${escapeHtml(copy.eyebrow)}</p><h1 style="max-width:980px;margin:0;font:500 clamp(38px,7vw,70px)/1.06 Georgia,serif">${escapeHtml(copy.title)}</h1><p style="max-width:850px;margin-top:20px;color:#d7d0c4;font-size:18px">${escapeHtml(copy.intro)}</p><div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:24px">${link(ROUTES.buyerInformation[locale], copy.related)}${link("/inquiry?intent=rfq&category=materials", copy.unsureCta)}</div><section style="margin-top:34px;border:1px solid #6b5a34;background:#15120d;padding:22px"><h2 style="margin:0;color:#e8c477;font:500 28px/1.2 Georgia,serif">${escapeHtml(copy.gsmTitle)}</h2><p style="color:#d7d0c4">${escapeHtml(copy.gsmBody)}</p><p style="margin-bottom:0;color:#f0dfb5;font-weight:700">${escapeHtml(MATERIAL_DISCLAIMER[locale])}</p></section>${familyHtml}<section style="margin-top:44px;border-top:1px solid #2e2a25;padding-top:30px"><h2 style="font:500 34px/1.15 Georgia,serif">${escapeHtml(copy.unsureTitle)}</h2><p style="max-width:820px;color:#c8c0b5">${escapeHtml(copy.unsureBody)}</p>${link("/inquiry?intent=rfq&category=materials", copy.unsureCta)}</section></main>${staticFooter()}</div>`;
}

function buyerInformationShell(locale: LocaleCode): string {
  const copy = BUYER_INFORMATION_COPY[locale];
  const home = locale === "en" ? "/" : `/${locale}/`;
  const story = copy.sections.story;
  const logistics = copy.sections.logistics;
  const confidentiality = copy.sections.confidentiality;
  const sustainability = copy.sections.sustainability;
  const compliance = copy.sections.compliance;
  const terms = logistics.terms.map(([term, explanation]) => `<article style="border:1px solid #302b24;background:#101010;padding:18px"><h3 style="margin:0;color:#e8c477;font:500 27px/1.2 Georgia,serif">${escapeHtml(term)}</h3><p style="color:#cbc3b7">${escapeHtml(explanation)}</p></article>`).join("");
  const section = (id: string, eyebrow: string, title: string, body: string) => `<section id="${id}" style="margin-top:44px;border-top:1px solid #2e2a25;padding-top:30px"><p style="color:#c9a45c;letter-spacing:.16em;text-transform:uppercase;font-size:11px">${escapeHtml(eyebrow)}</p><h2 style="max-width:900px;margin:0;color:#f5f1e8;font:500 clamp(30px,5vw,45px)/1.12 Georgia,serif">${escapeHtml(title)}</h2>${body}</section>`;

  return `<div data-irha-static-buyer-shell="true" data-irha-buyer-confidence-kind="business-information" lang="${locale}" style="min-height:100vh;background:#0a0a0a;color:#f5f1e8;font-family:Arial,Helvetica,sans-serif;line-height:1.65">${staticHeader(locale, home)}<main id="irha-static-crawler-shell" data-irha-route-shell="${ROUTES.buyerInformation[locale]}" style="max-width:1120px;margin:0 auto;padding:48px 22px 68px"><p style="margin:0 0 12px;color:#c9a45c;letter-spacing:.18em;text-transform:uppercase;font-size:12px">${escapeHtml(copy.eyebrow)}</p><h1 style="max-width:980px;margin:0;font:500 clamp(38px,7vw,70px)/1.06 Georgia,serif">${escapeHtml(copy.title)}</h1><p style="max-width:850px;margin-top:20px;color:#d7d0c4;font-size:18px">${escapeHtml(copy.intro)}</p><nav aria-label="${escapeHtml(copy.navLabel)}" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:24px">${[story, logistics, confidentiality, sustainability, compliance].map((item, index) => link(`#${["story", "logistics", "confidentiality", "sustainability", "compliance"][index]}`, item.label)).join("")}</nav>${section("story", story.label, story.title, `<div style="max-width:880px;color:#c8c0b5">${story.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div><div style="margin-top:18px">${link("/factory-video-call", copy.factoryCall)}</div>`)}${section("logistics", logistics.label, logistics.title, `<p style="max-width:850px;color:#c8c0b5">${escapeHtml(logistics.intro)}</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px;margin-top:20px">${terms}</div>${list(logistics.modes)}<h3 style="margin-top:28px;color:#e8c477;font:500 27px/1.2 Georgia,serif">${escapeHtml(logistics.timelineTitle)}</h3><ol style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;padding:0;list-style:none">${logistics.timelines.map((timeline, index) => `<li style="border:1px solid #302b24;padding:14px;color:#cbc3b7"><span style="color:#c9a45c">0${index + 1}</span> ${escapeHtml(timeline)}</li>`).join("")}</ol><p style="max-width:900px;color:#c8c0b5">${escapeHtml(logistics.timelineNote)}</p>`)}${section("confidentiality", confidentiality.label, confidentiality.title, `${list(confidentiality.points)}<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:20px">${link("/inquiry?intent=meeting&name=NDA%20review", confidentiality.cta)}${link("/privacy-policy", copy.privacy)}</div>`)}${section("sustainability", sustainability.label, sustainability.title, `${list(sustainability.points)}<div style="margin-top:20px">${link("/inquiry?intent=rfq&category=responsible-materials", copy.rfq)}</div>`)}${section("compliance", compliance.label, compliance.title, `${list(compliance.points)}<p style="border-left:2px solid #e8c477;padding-left:14px;color:#f0dfb5;font-weight:700">${escapeHtml(compliance.note)}</p><div style="display:flex;gap:12px;flex-wrap:wrap">${link("/compliance", copy.compliancePage)}${link("/inquiry?intent=reference&name=Compliance%20requirement", copy.rfq)}</div>`)}<section style="margin-top:46px;border-top:1px solid #2e2a25;padding-top:30px;display:flex;gap:12px;flex-wrap:wrap">${link(ROUTES.materials[locale], copy.materials)}${link("/inquiry?intent=rfq", copy.rfq)}</section></main>${staticFooter()}</div>`;
}

function routeJsonLd(path: string, locale: LocaleCode, name: string, description: string): string {
  const url = absolute(path);
  const schemas = [
    { "@context": "https://schema.org", "@type": "WebPage", "@id": `${url}#webpage`, url, name, description, isPartOf: { "@id": WEBSITE_ID }, about: { "@id": ORGANIZATION_ID }, inLanguage: locale },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Irha Apparels", item: absolute(locale === "en" ? "/" : `/${locale}/`) }, { "@type": "ListItem", position: 2, name, item: url }] },
  ];
  return schemas.map((schema) => `<script data-irha-route-jsonld="true" type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`).join("\n    ");
}

function replaceHead(html: string, path: string, locale: LocaleCode, title: string, description: string): string {
  const canonical = absolute(path);
  const alternates = getHreflangAlternates(path).map((item) => `<link rel="alternate" hreflang="${item.locale}" href="${absolute(item.href)}" />`);
  alternates.push(`<link rel="alternate" hreflang="x-default" href="${absolute(getXDefaultPath(path))}" />`);
  let output = html
    .replace(/<html lang="[^"]*"(?: dir="[^"]*")?>/i, `<html lang="${locale}" dir="ltr">`)
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta data-irha-fallback-seo="true" name="description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="description" content="${escapeHtml(description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta data-irha-fallback-seo="true" property="og:title" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta data-irha-fallback-seo="true" property="og:description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta data-irha-fallback-seo="true" property="og:url" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:url" content="${canonical}" />`)
    .replace(/<meta data-irha-fallback-seo="true" name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="twitter:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta data-irha-fallback-seo="true" name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="twitter:description" content="${escapeHtml(description)}" />`)
    .replace(/\s*<link rel="alternate"[^>]*>/gi, "")
    .replace(/\s*<script data-irha-route-jsonld="true"[\s\S]*?<\/script>/gi, "");
  output = output.replace("</head>", `    ${alternates.join("\n    ")}\n    ${routeJsonLd(path, locale, title, description)}\n  </head>`);
  return output;
}

async function render(path: string, locale: LocaleCode, kind: "materials" | "buyer-information"): Promise<void> {
  const file = routeFile(path);
  await mkdir(dirname(file), { recursive: true });
  const html = await readFile(file, "utf8");
  const copy = kind === "materials" ? MATERIAL_PAGE_COPY[locale] : BUYER_INFORMATION_COPY[locale];
  const title = `${copy.eyebrow} | Irha Apparels`;
  const description = copy.intro;
  const shell = kind === "materials" ? materialShell(locale) : buyerInformationShell(locale);
  const mainPattern = /<main id="irha-static-crawler-shell"[\s\S]*?<\/main>/i;
  if (!mainPattern.test(html)) throw new Error(`Buyer-confidence route is missing a base static shell: ${path}`);
  const output = replaceHead(html.replace(mainPattern, shell), path, locale, title, description);
  if (!output.includes('data-irha-static-buyer-shell="true"')) throw new Error(`Buyer-confidence marker missing after render: ${path}`);
  await writeFile(file, output, "utf8");
}

async function main(): Promise<void> {
  for (const locale of LOCALES) {
    await render(ROUTES.materials[locale], locale, "materials");
    await render(ROUTES.buyerInformation[locale], locale, "buyer-information");
  }
  console.log("Generated 8 source-backed buyer-confidence static route shells");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
