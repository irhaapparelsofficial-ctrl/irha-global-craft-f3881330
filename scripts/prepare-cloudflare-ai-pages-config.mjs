import { readFile, writeFile } from "node:fs/promises";

const path = process.argv[2] || "wrangler.toml";
let source = await readFile(path, "utf8");

if (!/^name\s*=\s*["'][^"']+["']/m.test(source)) {
  throw new Error("Downloaded Pages configuration is missing the project name.");
}
if (!/^pages_build_output_dir\s*=\s*["']\.\/?dist["']/m.test(source)) {
  throw new Error("Downloaded Pages configuration does not target the verified dist directory.");
}

const aiSection = source.match(/^\[ai\][\s\S]*?(?=^\[|\Z)/m)?.[0] || "";
if (aiSection) {
  if (!/^binding\s*=\s*["']AI["']/m.test(aiSection)) {
    throw new Error("A conflicting Workers AI binding already exists; refusing to overwrite it.");
  }
  console.log("Downloaded Pages configuration already contains the AI binding.");
} else {
  source = `${source.trimEnd()}\n\n[ai]\nbinding = "AI"\n`;
  await writeFile(path, source, "utf8");
  console.log("Added one Workers AI binding named AI to the downloaded Pages configuration.");
}

const final = await readFile(path, "utf8");
const sectionCount = (final.match(/^\[ai\]$/gm) || []).length;
const bindingCount = (final.match(/^binding\s*=\s*["']AI["']$/gm) || []).length;
if (sectionCount !== 1 || bindingCount !== 1) {
  throw new Error(`Workers AI config is not idempotent: sections=${sectionCount}, bindings=${bindingCount}`);
}
