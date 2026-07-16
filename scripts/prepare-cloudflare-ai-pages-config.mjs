import { extname } from "node:path";
import { readFile, writeFile } from "node:fs/promises";

const path = process.argv[2];
if (!path) throw new Error("A downloaded Wrangler configuration path is required.");

const extension = extname(path).toLowerCase();
const isToml = extension === ".toml";
const isJsonFamily = extension === ".json" || extension === ".jsonc";
if (!isToml && !isJsonFamily) {
  throw new Error(`Unsupported Wrangler configuration format: ${extension || "none"}`);
}

let source = await readFile(path, "utf8");

function assertProjectName(value) {
  const hasName = isToml
    ? /^name\s*=\s*["'][^"']+["']/m.test(value)
    : /["']name["']\s*:\s*["'][^"']+["']/.test(value);
  if (!hasName) throw new Error("Downloaded Pages configuration is missing the project name.");
}

function normalizeTomlDist(value) {
  if (/^pages_build_output_dir\s*=/m.test(value)) {
    return value.replace(/^pages_build_output_dir\s*=.*$/m, 'pages_build_output_dir = "dist"');
  }
  return value.replace(/^name\s*=\s*["'][^"']+["'].*$/m, (line) => (
    `${line}\npages_build_output_dir = "dist"`
  ));
}

function assertProjectContract(value) {
  assertProjectName(value);
  const hasDist = isToml
    ? /^pages_build_output_dir\s*=\s*["']\.?\/?dist["']/m.test(value)
    : /["']pages_build_output_dir["']\s*:\s*["']\.?\/?dist["']/.test(value);
  if (!hasDist) {
    throw new Error("Prepared Pages configuration does not target the verified dist directory.");
  }
}

function tomlSection(value, sectionName) {
  const headerPattern = new RegExp(`^\\[${sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]\\s*$`, "m");
  const headerMatch = headerPattern.exec(value);
  if (!headerMatch || headerMatch.index < 0) return "";

  const sectionStart = headerMatch.index;
  const afterHeader = sectionStart + headerMatch[0].length;
  const remaining = value.slice(afterHeader);
  const nextSectionMatch = /^\[[^\]]+\]\s*$/m.exec(remaining);
  const sectionEnd = nextSectionMatch?.index === undefined
    ? value.length
    : afterHeader + nextSectionMatch.index;
  return value.slice(sectionStart, sectionEnd);
}

function addTomlBinding(value) {
  const aiSection = tomlSection(value, "ai");
  if (aiSection) {
    const normalized = /^binding\s*=/m.test(aiSection)
      ? aiSection.replace(/^binding\s*=.*$/m, 'binding = "AI"')
      : aiSection.replace(/^\[ai\]\s*$/m, '[ai]\nbinding = "AI"');
    return value.replace(aiSection, normalized);
  }
  return `${value.trimEnd()}\n\n[ai]\nbinding = "AI"\n`;
}

function addJsonBinding(value) {
  const aiProperty = value.match(/["']ai["']\s*:\s*\{[\s\S]*?\}/)?.[0] || "";
  if (aiProperty) {
    if (!/["']binding["']\s*:\s*["']AI["']/.test(aiProperty)) {
      throw new Error("A conflicting Workers AI binding already exists; refusing to overwrite it.");
    }
    return value;
  }

  const lastBrace = value.lastIndexOf("}");
  if (lastBrace < 0) throw new Error("Downloaded JSON Wrangler configuration is malformed.");
  const prefix = value.slice(0, lastBrace).trimEnd();
  const suffix = value.slice(lastBrace);
  const separator = prefix.endsWith("{") || prefix.endsWith(",") ? "" : ",";
  return `${prefix}${separator}\n  "ai": {\n    "binding": "AI"\n  }\n${suffix}`;
}

assertProjectName(source);
if (isToml) source = normalizeTomlDist(source);
source = isToml ? addTomlBinding(source) : addJsonBinding(source);
await writeFile(path, source, "utf8");

const final = await readFile(path, "utf8");
assertProjectContract(final);
const sectionCount = isToml
  ? (final.match(/^\[ai\]$/gm) || []).length
  : (final.match(/["']ai["']\s*:/g) || []).length;
const bindingCount = isToml
  ? (final.match(/^binding\s*=\s*["']AI["']$/gm) || []).length
  : (final.match(/["']binding["']\s*:\s*["']AI["']/g) || []).length;
if (sectionCount !== 1 || bindingCount !== 1) {
  throw new Error(`Workers AI config is not idempotent: sections=${sectionCount}, bindings=${bindingCount}`);
}

console.log(`Verified dist output and one Workers AI binding named AI in downloaded ${extension.slice(1).toUpperCase()} Pages configuration.`);
