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

function normalizedOutputDirectory(value) {
  const match = isToml
    ? /^pages_build_output_dir\s*=\s*["']([^"']+)["']/m.exec(value)
    : /["']pages_build_output_dir["']\s*:\s*["']([^"']+)["']/.exec(value);
  if (!match) return "";

  return match[1]
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "");
}

function assertProjectContract(value) {
  const hasName = isToml
    ? /^name\s*=\s*["'][^"']+["']/m.test(value)
    : /["']name["']\s*:\s*["'][^"']+["']/.test(value);
  if (!hasName) throw new Error("Downloaded Pages configuration is missing the project name.");

  if (normalizedOutputDirectory(value) !== "dist") {
    throw new Error("Downloaded Pages configuration does not target the verified dist directory.");
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tomlSection(value, sectionName) {
  const headerPattern = new RegExp(`^\\[${escapeRegExp(sectionName)}\\]\\s*$`, "m");
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

function ensureTomlBinding(value, sectionName) {
  const section = tomlSection(value, sectionName);
  if (section) {
    if (!/^binding\s*=\s*["']AI["']\s*$/m.test(section)) {
      throw new Error(`A conflicting Workers AI binding exists in [${sectionName}]; refusing to overwrite it.`);
    }
    return value;
  }
  return `${value.trimEnd()}\n\n[${sectionName}]\nbinding = "AI"\n`;
}

function validateTomlBindings(value) {
  for (const sectionName of ["ai", "env.production.ai"]) {
    const headerCount = (value.match(new RegExp(`^\\[${escapeRegExp(sectionName)}\\]\\s*$`, "gm")) || []).length;
    const section = tomlSection(value, sectionName);
    const bindingCount = (section.match(/^binding\s*=\s*["']AI["']\s*$/gm) || []).length;
    if (headerCount !== 1 || bindingCount !== 1) {
      throw new Error(`Workers AI config is not idempotent for [${sectionName}]: sections=${headerCount}, bindings=${bindingCount}`);
    }
  }
}

function stripJsonComments(value) {
  let output = "";
  let inString = false;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const next = value[index + 1] || "";

    if (lineComment) {
      if (char === "\n") {
        lineComment = false;
        output += char;
      } else {
        output += " ";
      }
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        output += "  ";
        index += 1;
      } else {
        output += char === "\n" ? "\n" : " ";
      }
      continue;
    }

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
    } else if (char === "/" && next === "/") {
      lineComment = true;
      output += "  ";
      index += 1;
    } else if (char === "/" && next === "*") {
      blockComment = true;
      output += "  ";
      index += 1;
    } else {
      output += char;
    }
  }

  return output;
}

function removeJsonTrailingCommas(value) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (inString) {
      output += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }

    if (char === ",") {
      let cursor = index + 1;
      while (cursor < value.length && /\s/.test(value[cursor])) cursor += 1;
      if (value[cursor] === "}" || value[cursor] === "]") continue;
    }
    output += char;
  }
  return output;
}

function parseJsonFamily(value) {
  try {
    return JSON.parse(removeJsonTrailingCommas(stripJsonComments(value)));
  } catch (error) {
    throw new Error(`Downloaded JSON Wrangler configuration is malformed: ${error instanceof Error ? error.message : "parse failed"}`);
  }
}

function objectAt(parent, key, label) {
  const existing = parent[key];
  if (existing === undefined) {
    parent[key] = {};
    return parent[key];
  }
  if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
    throw new Error(`${label} must be an object.`);
  }
  return existing;
}

function ensureJsonAiBinding(parent, label) {
  const existing = parent.ai;
  if (existing === undefined) {
    parent.ai = { binding: "AI" };
    return;
  }
  if (!existing || typeof existing !== "object" || Array.isArray(existing) || existing.binding !== "AI") {
    throw new Error(`A conflicting Workers AI binding exists in ${label}; refusing to overwrite it.`);
  }
}

function addJsonBindings(value) {
  const config = parseJsonFamily(value);
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Downloaded JSON Wrangler configuration must contain one root object.");
  }

  ensureJsonAiBinding(config, "the top-level preview environment");
  const env = objectAt(config, "env", "Wrangler env");
  const production = objectAt(env, "production", "Wrangler env.production");
  ensureJsonAiBinding(production, "env.production");
  return `${JSON.stringify(config, null, 2)}\n`;
}

function validateJsonBindings(value) {
  const config = parseJsonFamily(value);
  if (config?.ai?.binding !== "AI" || config?.env?.production?.ai?.binding !== "AI") {
    throw new Error("Workers AI bindings are missing from preview or production JSON configuration.");
  }
}

assertProjectContract(source);
if (isToml) {
  source = ensureTomlBinding(source, "ai");
  source = ensureTomlBinding(source, "env.production.ai");
} else {
  source = addJsonBindings(source);
}
await writeFile(path, source, "utf8");

const final = await readFile(path, "utf8");
assertProjectContract(final);
if (isToml) validateTomlBindings(final);
else validateJsonBindings(final);

console.log(`Verified Workers AI binding AI in both preview and production environments of downloaded ${extension.slice(1).toUpperCase()} Pages configuration.`);
