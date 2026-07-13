import { readFile } from "node:fs/promises";

const read = (name) => readFile(new URL(`../dist/${name}`, import.meta.url), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [html, robots, sitemap, llms, llmsFull] = await Promise.all([
  read("index.html"),
  read("robots.txt"),
  read("sitemap.xml"),
  read("llms.txt"),
  read("llms-full.txt"),
]);

const canonical = "https://irhaapparels.com";
const alternateHost = "https://www.irhaapparels.com";
const forbidden = [
  "Since 2014",
  "MOQ 50",
  "45-day delivery",
  "45-Day Production",
  "reply within 12 hours",
  "BSCI Audited",
  "ISO 9001:2015",
  "SEDEX Member",
];

assert(html.includes('id="root"'), "Built HTML is missing the React root");
assert(html.includes('id="irha-static-crawler-shell"'), "Built HTML is missing the progressive crawler shell");
assert(
  html.includes("Custom Apparel Manufacturer for Global B2B Buyers"),
  "Built crawler shell is missing the current homepage H1",
);
assert(
  html.includes(`<link rel="canonical" href="${canonical}/"`),
  "Built HTML canonical does not use the live apex host",
);
assert(
  html.includes(`property="og:url" content="${canonical}/"`),
  "Built Open Graph URL does not use the live apex host",
);
assert(
  html.includes('name="robots" content="index,follow,max-image-preview:large"'),
  "Built HTML is missing the static robots meta tag",
);

for (const term of forbidden) {
  assert(!html.toLowerCase().includes(term.toLowerCase()), `Built crawler HTML contains unverified legacy claim: ${term}`);
}

for (const agent of ["Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "GPTBot", "ClaudeBot", "PerplexityBot"]) {
  assert(robots.includes(`User-agent: ${agent}`), `robots.txt is missing ${agent}`);
}
assert(robots.includes(`Sitemap: ${canonical}/sitemap.xml`), "robots.txt sitemap does not use the canonical apex host");
assert(!sitemap.includes(`<loc>${alternateHost}`), "sitemap still contains www URLs");
assert(sitemap.includes(`<loc>${canonical}/</loc>`), "sitemap is missing the canonical homepage");
assert(llms.includes(`${canonical}/`), "llms.txt is missing absolute canonical URLs");
assert(llmsFull.toLowerCase().includes("two production hubs"), "llms-full.txt is missing the current homepage structure");

console.log("PASS built crawler parity shell, canonical URLs, robots, sitemap and llms files");
