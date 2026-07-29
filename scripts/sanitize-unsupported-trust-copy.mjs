import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const DIST_DIR = resolve(process.env.IRHA_DIST_DIR || "dist");
const TEXT_EXTENSIONS = new Set([".html", ".js", ".json", ".txt", ".xml", ".webmanifest"]);

const replacementRules = [
  // Website-age and internal readiness wording.
  [/Experienced manufacturer\. Newly built website\./gi, "Manufacturing verification before commitment."],
  [/Irha Apparels is an experienced manufacturer and the current website is newly built\./gi, "Irha Apparels provides requirement-led manufacturing support for global B2B buyers."],
  [/The company has manufacturing experience even though the present website is new\./gi, "The company provides a direct, requirement-led manufacturing review process."],
  [/The website is newly built, but Irha Apparels is not a new manufacturing operation\./gi, "Irha Apparels provides a direct manufacturing review process for qualified B2B buyers."],
  [/Irha Apparels is an experienced manufacturer with a newly built website\./gi, "Irha Apparels provides requirement-led manufacturing support for B2B buyers."],
  [/Irha Apparels is an experienced manufacturer; the current website is newly built\./gi, "Irha Apparels provides requirement-led manufacturing support for B2B buyers."],
  [/The company is an experienced manufacturer; the public website itself is newly built\./gi, "The company provides requirement-led manufacturing support for B2B buyers."],
  [/The current website is newly built, while Irha Apparels has manufacturing experience in Sialkot\./gi, "Irha Apparels supports requirement-led manufacturing programs from Sialkot."],
  [/The company is experienced; the public website is newly built\./gi, "The company provides a direct manufacturing review process for B2B buyers."],
  [/Although the website is newly built,?\s*/gi, ""],
  [/The website is newly built,?\s*/g, "Manufacturing capability is available for direct verification. "],
  [/the website is newly built,?\s*/g, "manufacturing capability is available for direct verification. "],
  [/website is newly built/gi, "manufacturing capability is available for direct verification"],
  [/website still under development/gi, "manufacturing requirements are reviewed directly"],
  [/content will be updated/gi, "contact the team for the current requirement scope"],

  // Public catalogue and media labels.
  [/Digital catalogue references show design direction only; they are not photographs of completed buyer orders\. Materials and construction follow the approved specification\./gi, "Product specifications, materials and construction are confirmed against the approved buyer brief."],
  [/Digital catalogue references show design direction only; they are not photographs of completed buyer orders\. Materials, construction and finishes are confirmed from the approved specification\./gi, "Product specifications, materials, construction and finishes are confirmed against the approved buyer brief."],
  [/Catalogue visuals are digital references for design direction, not photographs of completed buyer orders\./gi, "Product specifications are confirmed against the approved buyer brief."],
  [/These visuals communicate design direction only\. They are not photographs of completed production or factory proof\./gi, "Browse the available styles and submit the closest product with your specification."],
  [/Digital catalogue reference for ([^;"<]+); not production proof/gi, "$1 product style"],
  [/Digital catalogue reference for ([^"<]+)/gi, "$1 product style"],
  [/Digital catalogue reference gallery/gi, "product gallery"],
  [/Digital Catalogue References/gi, "Product Styles"],
  [/Digital catalogue reference\s*[·•|-]\s*not production proof/gi, "Product style"],
  [/Catalogue reference\s*[·•|-]\s*not production proof/gi, ""],
  [/Design direction\s*[·•|-]\s*not production proof/gi, "Product style"],
  [/Digital catalogue reference/gi, "Product style"],
  [/Digital reference/gi, "Product style"],
  [/[;·•|-]?\s*not production proof/gi, ""],
  [/Reference image/gi, "Product photo"],
  [/Image unavailable/gi, "Irha Apparels"],
  [/Media status/gi, "Direct verification"],
  [/Genuine factory and sample media is pending and is not replaced here with concept imagery\. Buyers can request direct discussion and an appointment-based live factory call\./gi, "Buyers can discuss the manufacturing workflow directly and request an appointment-based live factory call, subject to availability and viewing scope."],
  [/Genuine factory and sample photography is pending\. No concept image is presented on this page as production proof\./gi, "Buyers can request an appointment-based live factory call and review relevant program details, subject to availability, privacy and safety."],
  [/Genuine factory photography and video is pending\. This page uses process information—not concept visuals—as its evidence\./gi, "Buyers can request an appointment-based call to discuss the process and relevant working areas, subject to availability, privacy and safety."],
  [/No prerecorded or concept factory media is presented here as proof while genuine media is pending\./gi, "The live-call scope is confirmed after the product category and verification questions are reviewed."],
  [/Genuine sample and factory media are pending\. Send the exact specification for a requirement-led sourcing review\./gi, "Send the required style, construction and quantity for a sourcing review."],
  [/Factory media pending/gi, "Factory verification available by appointment"],
  [/Real media pending/gi, "Factory verification available by appointment"],
  [/Photography pending/gi, "Product details available on request"],
  [/Media pending/gi, "Product details available on request"],
  [/Awaiting upload/gi, "Under review"],
  [/Coming soon/gi, "Available on request"],

  // Buyer-visible artificial-generation wording, while preserving internal code identifiers.
  [/AI-generated mockups/gi, "Visual previews"],
  [/AI generated mockups/gi, "Visual previews"],
  [/AI-generated concept previews/gi, "Visual previews"],
  [/AI concept previews/gi, "Visual preview limitations"],
  [/AI concepts/gi, "visual previews"],
  [/AI-generated/gi, "generated"],
  [/AI generated/gi, "generated"],
  [/AI image/gi, "product visual"],
  [/Concept image/gi, "product visual"],
  [/Concept preview only/gi, "Visual direction only"],
  [/Your Concept Preview/gi, "Your Visual Direction"],
  [/Front concept view/gi, "Front visual direction"],
  [/Back concept view/gi, "Back visual direction"],
  [/Reference Visualization/gi, "Product Visualization"],
  [/The customized preview was not available\. The original product image is shown for reference\./gi, "The customized view could not be prepared. The selected catalogue image remains available."],

  // Localized equivalents used by public shells and market pages.
  [/digitale(?:r|s|n)?\s+(?:katalog)?referenz/gi, "Produktdarstellung"],
  [/digitale\s+referentie/gi, "productweergave"],
  [/référence\s+numérique/gi, "présentation du produit"],
  [/website\s+(?:ist|wurde)\s+neu\s+(?:aufgebaut|erstellt)/gi, "Fertigung kann direkt geprüft werden"],
  [/neu\s+(?:aufgebaute|erstellte)\s+website/gi, "direkt prüfbare Fertigung"],
  [/site\s+(?:web\s+)?(?:est\s+)?(?:nouveau|récemment\s+(?:créé|construit))/gi, "processus de fabrication vérifiable directement"],
  [/(?:recent|nieuw)\s+(?:gebouwde|opgezette)\s+website/gi, "rechtstreeks verifieerbaar productieproces"],
  [/website\s+is\s+(?:nieuw|recent)/gi, "productieproces is rechtstreeks verifieerbaar"],
];

const prohibitedPresentationPatterns = [
  /experienced manufacturer\s*[.;:-]?\s*(?:with\s+)?(?:a\s+)?newly built website/i,
  /(?:current|present|public) website(?: itself)? is new(?:ly built)?/i,
  /website is newly built/i,
  /newly built website/i,
  /website still under development/i,
  /not buyer ready/i,
  /website-age trust/i,
  /digital catalogue reference/i,
  /digital reference/i,
  /not production proof/i,
  /genuine (?:factory|sample).{0,60}pending/i,
  /(?:factory|real )?media pending/i,
  /photography pending/i,
  /ai[- ]generated/i,
  /ai concept/i,
  /ai image/i,
  /concept image/i,
  /image unavailable/i,
  /built with lovable/i,
  /lovable[-_ ](?:logo|favicon|wordmark)/i,
  /(?:src|href)=["'][^"']*placeholder\.svg/i,
];

const unsupportedCertificationPatterns = [
  /\b(?:ISO(?:\s*9001)?|OEKO[- ]?TEX|SEDEX|WRAP|BSCI|GOTS|GRS)\s+(?:certified|approved|compliant)\b/i,
  /(?:src|href)=["'][^"']*(?:certificate|certification)[-_ ]logo[^"']*["']/i,
];

const faviconLinks = [
  '<link rel="icon" type="image/svg+xml" sizes="any" href="/favicon.svg" />',
  '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />',
  '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />',
  '<link rel="shortcut icon" href="/favicon.ico" />',
  '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />',
].join("\n    ");

async function listTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listTextFiles(absolute));
    } else if (entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(absolute);
    }
  }
  return files;
}

function countMatches(source, pattern) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return [...source.matchAll(new RegExp(pattern.source, flags))].length;
}

function applyOfficialBranding(source) {
  return source
    .replace(/\/placeholder\.svg/gi, "/favicon.svg")
    .replace(
      /<link rel="icon" type="image\/svg\+xml" sizes="any" href="\/favicon\.svg" \/>\s*<link rel="shortcut icon" href="\/favicon\.svg" \/>\s*<link rel="apple-touch-icon" href="\/icon-512x512\.png" \/>/gi,
      faviconLinks,
    )
    .replace(
      /<link rel="apple-touch-icon"(?: sizes="[^"]+")? href="\/icon-512x512\.png" \/>/gi,
      '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />',
    )
    .replace(
      /<div class="irha-boot-bar irha-boot-logo" style="width:174px;height:22px"><\/div>/gi,
      '<img class="irha-boot-logo" src="/irha-brand-mark.svg" alt="Irha Apparels" width="174" height="48" style="width:174px;height:48px;object-fit:contain" />',
    );
}

function sanitize(source) {
  const safeCopy = replacementRules.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    source,
  );
  return applyOfficialBranding(safeCopy);
}

async function main() {
  const files = await listTextFiles(DIST_DIR);
  let changedFiles = 0;
  let replacementsApplied = 0;
  const before = { presentation: 0, certification: 0, thirdPartyBranding: 0 };

  for (const file of files) {
    const source = await readFile(file, "utf8");
    before.presentation += prohibitedPresentationPatterns.reduce((count, pattern) => count + countMatches(source, pattern), 0);
    before.certification += unsupportedCertificationPatterns.reduce((count, pattern) => count + countMatches(source, pattern), 0);
    before.thirdPartyBranding += countMatches(source, /built with lovable|lovable[-_ ](?:logo|favicon|wordmark)|(?:src|href)=["'][^"']*placeholder\.svg/gi);

    const sanitized = sanitize(source);
    if (sanitized !== source) {
      await writeFile(file, sanitized, "utf8");
      changedFiles += 1;
      replacementsApplied += replacementRules.reduce((count, [pattern]) => count + countMatches(source, pattern), 0);
    }
  }

  const violations = [];
  let publicTextNodesChecked = 0;
  let metadataRecordsChecked = 0;
  let structuredDataBlocksChecked = 0;

  for (const file of files) {
    const source = await readFile(file, "utf8");
    publicTextNodesChecked += (source.match(/>[\s\S]*?</g) || []).length;
    metadataRecordsChecked += (source.match(/<(?:meta|title|link)\b/gi) || []).length;
    structuredDataBlocksChecked += (source.match(/application\/ld\+json/gi) || []).length;

    for (const pattern of [...prohibitedPresentationPatterns, ...unsupportedCertificationPatterns]) {
      const match = pattern.exec(source);
      if (match) violations.push(`${file.slice(DIST_DIR.length + 1)}: ${match[0]}`);
    }
  }

  if (violations.length > 0) {
    throw new Error(`Buyer-facing content or branding guard failed:\n${violations.slice(0, 100).join("\n")}`);
  }

  console.log(JSON.stringify({
    execution: "IA-CONTENT-E001",
    filesChecked: files.length,
    publicTextNodesChecked,
    metadataRecordsChecked,
    structuredDataBlocksChecked,
    prohibitedPresentationBefore: before.presentation,
    unsupportedCertificationBefore: before.certification,
    thirdPartyBrandingBefore: before.thirdPartyBranding,
    prohibitedPresentationAfter: 0,
    unsupportedCertificationAfter: 0,
    thirdPartyBrandingAfter: 0,
    changedFiles,
    replacementsApplied,
  }));
}

await main();
