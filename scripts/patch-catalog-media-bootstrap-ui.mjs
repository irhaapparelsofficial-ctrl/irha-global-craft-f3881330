import { readFileSync, writeFileSync } from "node:fs";

const mediaPath = "src/components/admin/MediaLibraryPanel.tsx";
let mediaSource = readFileSync(mediaPath, "utf8");
const importLine = 'import CatalogMediaBootstrapPanel from "@/components/admin/CatalogMediaBootstrapPanel";';

if (!mediaSource.includes(importLine)) {
  const anchor = 'import ThumbnailImage from "@/components/ThumbnailImage";';
  if (!mediaSource.includes(anchor)) throw new Error("Media Library import anchor not found");
  mediaSource = mediaSource.replace(anchor, `${anchor}\n${importLine}`);
}

const mount = "      <CatalogMediaBootstrapPanel onChanged={load} />";
if (!mediaSource.includes(mount)) {
  const anchor = "      {error && <div className=\"border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-200\">Media backend or storage bucket is unavailable. Detail: {error}</div>}";
  if (!mediaSource.includes(anchor)) throw new Error("Media Library mount anchor not found");
  mediaSource = mediaSource.replace(anchor, `${mount}\n\n${anchor}`);
}

writeFileSync(mediaPath, mediaSource);

const autopilotPath = "supabase/functions/social-autopilot/index.ts";
let autopilotSource = readFileSync(autopilotPath, "utf8");
const oldRendererHealth = 'Boolean(Deno.env.get("SOCIAL_RENDER_PROVIDER") && Deno.env.get("SOCIAL_RENDER_API_URL") && Deno.env.get("SOCIAL_RENDER_API_KEY"))';
const newRendererHealth = 'Boolean(Deno.env.get("SOCIAL_RENDER_PROVIDER_URL") && Deno.env.get("SOCIAL_RENDER_PROVIDER_KEY") && Deno.env.get("SOCIAL_RENDER_CALLBACK_SECRET"))';

if (autopilotSource.includes(oldRendererHealth)) {
  autopilotSource = autopilotSource.replace(oldRendererHealth, newRendererHealth);
} else if (!autopilotSource.includes(newRendererHealth)) {
  throw new Error("Social Autopilot renderer health anchor not found");
}

writeFileSync(autopilotPath, autopilotSource);
