import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const directory = path.join(process.cwd(), "supabase", "migrations");
const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
const errors = [];
const warnings = [];
const versions = new Map();

for (const file of files) {
  const match = file.match(/^(\d{8,14})_([A-Za-z0-9][A-Za-z0-9_\-]*)\.sql$/);
  if (!match) {
    warnings.push(`${file}: legacy/non-standard filename; final activation must preserve lexicographic order`);
  } else {
    const [, version] = match;
    const duplicate = versions.get(version);
    if (duplicate) warnings.push(`${file}: shares migration version ${version} with ${duplicate}; final activation must verify Supabase migration-history compatibility`);
    else versions.set(version, file);
  }

  const sql = await readFile(path.join(directory, file), "utf8");
  if (!sql.trim()) errors.push(`${file}: migration is empty`);
  if (/\b(?:DROP\s+DATABASE|DROP\s+SCHEMA|TRUNCATE\s+TABLE)\b/i.test(sql)) {
    errors.push(`${file}: contains a prohibited database-wide destructive statement`);
  }
}

if (files.length === 0) errors.push("No Supabase migrations were found");

for (const warning of warnings) console.warn(`Migration warning: ${warning}`);

if (errors.length) {
  console.error("Migration-order verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Migration-order verification passed: ${files.length} SQL migration file(s) in deterministic lexicographic order; ${warnings.length} compatibility warning(s) require final activation review.`);
