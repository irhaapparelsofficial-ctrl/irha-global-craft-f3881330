import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const outputPath = resolve("dist/index.html");
const organizationPattern = /["']@type["']\s*:\s*["']Organization["']/;
const structuredScriptPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?["']@type["']\s*:\s*["']Organization["'][\s\S]*?<\/script>/i;

let html = await readFile(outputPath, "utf8");

if (!structuredScriptPattern.test(html)) {
  const graph = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://irhaapparels.com/#organization",
        name: "Irha Apparels",
        alternateName: "Irha Apparels Sialkot",
        url: "https://irhaapparels.com/",
        logo: "https://irhaapparels.com/icon-512x512.png",
        description: "Irha Apparels is a B2B custom apparel manufacturer in Sialkot, Pakistan providing OEM, ODM and private-label manufacturing programs.",
        email: "info@irhaapparels.com",
        telephone: "+92 320 4110066",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Sialkot",
          addressCountry: "PK",
        },
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "sales",
          telephone: "+92 320 4110066",
          email: "info@irhaapparels.com",
          availableLanguage: ["English", "Urdu"],
        },
        sameAs: ["https://www.instagram.com/irhaapparels/"],
      },
      {
        "@type": "WebSite",
        "@id": "https://irhaapparels.com/#website",
        url: "https://irhaapparels.com/",
        name: "Irha Apparels",
        publisher: { "@id": "https://irhaapparels.com/#organization" },
        inLanguage: "en",
      },
      {
        "@type": "WebPage",
        "@id": "https://irhaapparels.com/#webpage",
        url: "https://irhaapparels.com/",
        name: "Irha Apparels | B2B Apparel Manufacturer in Sialkot, Pakistan",
        description: "Irha Apparels manufactures custom apparel and private-label programs in Sialkot, Pakistan for brands, wholesalers and importers worldwide.",
        isPartOf: { "@id": "https://irhaapparels.com/#website" },
        about: { "@id": "https://irhaapparels.com/#organization" },
        inLanguage: "en",
      },
    ],
  }).replace(/</g, "\\u003c");

  const marker = `    <script data-irha-static-organization type="application/ld+json">${graph}</script>\n`;
  if (!html.includes("</head>")) throw new Error("Built homepage is missing </head>; structured data was not injected.");
  html = html.replace("</head>", `${marker}  </head>`);
  await writeFile(outputPath, html, "utf8");
}

const final = await readFile(outputPath, "utf8");
if (!organizationPattern.test(final) || !/type=["']application\/ld\+json["']/i.test(final)) {
  throw new Error("Built homepage Organization structured data is missing after injection.");
}

await import("./strengthen-brand-search-signals.mjs");
console.log("PASS ensured crawler-visible Organization/WebSite graph and exact Irha Apparels brand signals");
