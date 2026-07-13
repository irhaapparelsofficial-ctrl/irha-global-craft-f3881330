import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const directory = path.join(process.cwd(), "supabase", "migrations");
const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
const errors = [];
const timestamps = new Map();

for (const file of files) {
  const match = file.match(/^(\d{14})_([a-z0-9][a-z0-9_\-]*)\.sql$/);
  if (!match) {
    errors.push(`${file}: expected YYYYMMDDHHMMSS_descriptive_name.sql`);
    continue;
  }

  const [, timestamp] = match;
  const duplicate = timestamps.get(timestamp);
  if (duplicate) errors.push(`${file}: duplicate migration timestamp also used by ${duplicate}`);
  else timestamps.set(timestamp, file);

  const sql = await readFile(path.join(directory, file), "utf8");
  if (!sql.trim()) errors.push(`${file}: migration is empty`);
  if (/\b(?:DROP\s+DATABASE|DROP\s+SCHEMA|TRUNCATE\s+TABLE)\b/i.test(sql)) {
    errors.push(`${file}: contains a prohibited database-wide destructive statement`);
  }
}

if (files.length === 0) errors.push("No Supabase migrations were found");

if (errors.length) {
  console.error("Migration-order verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Migration-order verification passed: ${files.length} ordered migration file(s), ${timestamps.size} unique timestamp(s).`);
