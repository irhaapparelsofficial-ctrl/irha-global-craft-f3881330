import { readFileSync, writeFileSync } from "node:fs";

const path = "src/components/admin/MediaLibraryPanel.tsx";
let source = readFileSync(path, "utf8");
const importLine = 'import CatalogMediaBootstrapPanel from "@/components/admin/CatalogMediaBootstrapPanel";';

if (!source.includes(importLine)) {
  const anchor = 'import ThumbnailImage from "@/components/ThumbnailImage";';
  if (!source.includes(anchor)) throw new Error("Media Library import anchor not found");
  source = source.replace(anchor, `${anchor}\n${importLine}`);
}

const mount = "      <CatalogMediaBootstrapPanel onChanged={load} />";
if (!source.includes(mount)) {
  const anchor = "      {error && <div className=\"border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-200\">Media backend or storage bucket is unavailable. Detail: {error}</div>}";
  if (!source.includes(anchor)) throw new Error("Media Library mount anchor not found");
  source = source.replace(anchor, `${mount}\n\n${anchor}`);
}

writeFileSync(path, source);
