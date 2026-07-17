import { readFileSync, writeFileSync } from "node:fs";

const path = "supabase/functions/generate-mockup/index.ts";
let source = readFileSync(path, "utf8");
const before = 'const respond = (body: Record<string, unknown>, status = 200) => respond(body, status, headers);';
const after = 'const respond = (body: Record<string, unknown>, status = 200) => jsonResponse(body, status, headers);';
if (source.indexOf(before) < 0 || source.indexOf(before) !== source.lastIndexOf(before)) {
  throw new Error("expected exactly one recursive responder line");
}
source = source.replace(before, after);
if (source.includes("=> respond(body, status, headers)")) {
  throw new Error("recursive responder remains");
}
writeFileSync(path, source);
