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

function ensureTomlAiBinding(value, sectionName) {
  const section = tomlSection(value, sectionName);
  if (section) {
    if (!/^binding\s*=\s*["']AI["']/m.test(section)) {
      throw new Error(`A conflicting Workers AI binding already exists in [${sectionName}]; refusing to overwrite it.`);
    }
    return value;
  }
  return `${value.trimEnd()}\n\n[${sectionName}]\nbinding = "AI"\n`;
}

function addTomlBindings(value) {
  return ensureTomlAiBinding(ensureTomlAiBinding(value, "ai"), "env.production.ai");
}

function stripJsonComments(value) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const next = value[index + 1];

    if (inString) {
      output += character;
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      output += character;
      continue;
    }

    if (character === "/" && next === "/") {
      output += "  ";
      index += 1;
      while (index + 1 < value.length && value[index + 1] !== "\n") {
        output += " ";
        index += 1;
      }
      continue;
    }

    if (character === "/" && next === "*") {
      output += "  ";
      index += 1;
      while (index + 1 < value.length) {
        const current = value[index + 1];
        const after = value[index + 2];
        if (current === "*" && after === "/") {
          output += "  ";
          index += 2;
          break;
        }
        output += current === "\n" ? "\n" : " ";
        index += 1;
      }
      continue;
    }

    output += character;
  }

  return output;
}

function stripJsonTrailingCommas(value) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (inString) {
      output += character;
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      output += character;
      continue;
    }

    if (character === ",") {
      let lookahead = index + 1;
      while (lookahead < value.length && /\s/.test(value[lookahead])) lookahead += 1;
      if (value[lookahead] === "}" || value[lookahead] === "]") continue;
    }

    output += character;
  }

  return output;
}

function parseJsonFamily(value) {
  try {
    return JSON.parse(stripJsonTrailingCommas(stripJsonComments(value)));
  } catch (error) {
    throw new Error(`Downloaded JSON Wrangler configuration is malformed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function ensureObject(parent, key, label) {
  const current = parent[key];
  if (current === undefined) {
    parent[key] = {};
    return parent[key];
  }
  if (!current || typeof current !== "object" || Array.isArray(current)) {
    throw new Error(`${label} must be an object; refusing to overwrite it.`);
  }
  return current;
}

function ensureJsonAiBinding(container, label) {
  const current = container.ai;
  if (current === undefined) {
    container.ai = { binding: "AI" };
    return;
  }
  if (!current || typeof current !== "object" || Array.isArray(current) || current.binding !== "AI") {
    throw new Error(`A conflicting Workers AI binding already exists in ${label}; refusing to overwrite it.`);
  }
}

function addJsonBindings(value) {
  const parsed = parseJsonFamily(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Downloaded JSON Wrangler configuration must contain an object at the root.");
  }

  ensureJsonAiBinding(parsed, "the top-level configuration");
  const environments = ensureObject(parsed, "env", 'the top-level "env" property');
  const production = ensureObject(environments, "production", 'the "env.production" property');
  ensureJsonAiBinding(production, 'the "env.production" configuration');

  return `${JSON.stringify(parsed, null, 2)}\n`;
}

function assertTomlBindings(value) {
  for (const sectionName of ["ai", "env.production.ai"]) {
    const section = tomlSection(value, sectionName);
    if (!section || !/^binding\s*=\s*["']AI["']/m.test(section)) {
      throw new Error(`Workers AI binding is missing from [${sectionName}].`);
    }
  }
}

function assertJsonBindings(value) {
  const parsed = parseJsonFamily(value);
  if (parsed?.ai?.binding !== "AI" || parsed?.env?.production?.ai?.binding !== "AI") {
    throw new Error("Workers AI bindings are missing from preview or production configuration.");
  }
}

assertProjectContract(source);
source = isToml ? addTomlBindings(source) : addJsonBindings(source);
await writeFile(path, source, "utf8");

const final = await readFile(path, "utf8");
assertProjectContract(final);
if (isToml) assertTomlBindings(final);
else assertJsonBindings(final);

console.log(`Verified Workers AI bindings named AI for preview and production in downloaded ${extension.slice(1).toUpperCase()} Pages configuration.`);
