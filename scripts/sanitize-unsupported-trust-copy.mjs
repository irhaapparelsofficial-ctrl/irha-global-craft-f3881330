import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const DIST_DIR = resolve(process.env.IRHA_DIST_DIR || "dist");
const TEXT_EXTENSIONS = new Set([".html", ".js", ".json", ".txt", ".xml"]);

const replacements = [
  {
    pattern: /Experienced manufacturer\. Newly built website\./gi,
    replacement: "Manufacturing verification before commitment.",
  },
  {
    pattern: /Irha Apparels is an experienced manufacturer and the current website is newly built\./gi,
    replacement: "Irha Apparels provides requirement-led manufacturing support for global B2B buyers.",
  },
  {
    pattern: /The company has manufacturing experience even though the present website is new\./gi,
    replacement: "The company provides a direct, requirement-led manufacturing review process.",
  },
  {
    pattern: /The website is newly built, but Irha Apparels is not a new manufacturing operation\./gi,
    replacement: "Irha Apparels provides a direct manufacturing review process for qualified B2B buyers.",
  },
  {
    pattern: /Irha Apparels is an experienced manufacturer with a newly built website\./gi,
    replacement: "Irha Apparels provides requirement-led manufacturing support for B2B buyers.",
  },
  {
    pattern: /Irha Apparels is an experienced manufacturer; the current website is newly built\./gi,
    replacement: "Irha Apparels provides requirement-led manufacturing support for B2B buyers.",
  },
  {
    pattern: /The company is an experienced manufacturer; the public website itself is newly built\./gi,
    replacement: "The company provides requirement-led manufacturing support for B2B buyers.",
  },
  {
    pattern: /The current website is newly built, while Irha Apparels has manufacturing experience in Sialkot\./gi,
    replacement: "Irha Apparels supports requirement-led manufacturing programs from Sialkot.",
  },
  {
    pattern: /The company is experienced; the public website is newly built\./gi,
    replacement: "The company provides a direct manufacturing review process for B2B buyers.",
  },
];

const forbiddenPatterns = [
  /experienced manufacturer\s*[.;:-]?\s*(?:with\s+)?(?:a\s+)?newly built website/i,
  /(?:current|present|public) website(?: itself)? is new(?:ly built)?/i,
  /website is newly built/i,
  /newly built website/i,
  /website-age trust/i,
];

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

function sanitize(source) {
  return replacements.reduce(
    (current, { pattern, replacement }) => current.replace(pattern, replacement),
    source,
  );
}

async function main() {
  const files = await listTextFiles(DIST_DIR);
  let changedFiles = 0;
  let replacementsApplied = 0;

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const sanitized = sanitize(source);
    if (sanitized !== source) {
      await writeFile(file, sanitized, "utf8");
      changedFiles += 1;
      replacementsApplied += replacements.reduce((count, { pattern }) => {
        pattern.lastIndex = 0;
        return count + [...source.matchAll(pattern)].length;
      }, 0);
    }
  }

  const violations = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const pattern of forbiddenPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(source);
      if (match) {
        violations.push(`${file.slice(DIST_DIR.length + 1)}: ${match[0]}`);
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(`Unsupported website-age trust copy remains in the production artifact:\n${violations.join("\n")}`);
  }

  console.log(`Trust-copy release guard passed: ${changedFiles} files updated, ${replacementsApplied} replacements applied.`);
}

await main();
