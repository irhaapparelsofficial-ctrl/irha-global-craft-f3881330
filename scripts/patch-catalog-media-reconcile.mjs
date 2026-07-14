import { readFileSync, writeFileSync } from "node:fs";

const backendPath = "supabase/functions/catalog-media-bootstrap/index.ts";
let backend = readFileSync(backendPath, "utf8");

const oldBlock = `      const { data: existing } = await service.from("media_assets").select("id,public_url,verification_status,social_approved").eq("object_path", objectPath).maybeSingle();
      if (existing) {
        outcomes.push({ source: candidate.source, status: "skipped_existing", asset_id: existing.id, public_url: existing.public_url });
        continue;
      }

      const dimensions = imageDimensions(fetched.bytes, fetched.mimeType);`;

const newBlock = `      const { data: existingByObject } = await service.from("media_assets").select("id,public_url,verification_status,social_approved,tags").eq("object_path", objectPath).maybeSingle();
      if (existingByObject) {
        outcomes.push({ source: candidate.source, status: "skipped_existing", asset_id: existingByObject.id, public_url: existingByObject.public_url });
        continue;
      }
      const { data: placeholder } = await service.from("media_assets")
        .select("id,public_url,verification_status,social_approved,tags")
        .eq("public_url", candidate.source)
        .maybeSingle();

      const dimensions = imageDimensions(fetched.bytes, fetched.mimeType);`;

if (!backend.includes(oldBlock)) throw new Error("Existing asset lookup anchor not found");
backend = backend.replace(oldBlock, newBlock);

const oldSave = `      const fileName = fileNameFromUrl(fetched.resolvedUrl, extension);
      const { data: asset, error: insertError } = await service.from("media_assets").insert({
        bucket: BUCKET,
        object_path: objectPath,
        public_url: publicData.publicUrl,
        file_name: fileName,
        mime_type: fetched.mimeType,
        size_bytes: fetched.bytes.byteLength,
        title: \`${candidate.productNames[0] || "Catalog product"} · catalog image ${candidate.position}\`,
        alt_text: candidate.productNames[0] || "Irha Apparels product",
        tags,
        usage_notes: \`Imported from the published Irha Apparels catalog. Source: ${fetched.resolvedUrl}. Owner social approval remains required.\`,
        status: "active",
        verification_status: "verified",
        width_px: dimensions.width,
        height_px: dimensions.height,
        duration_ms: null,
        checksum_sha256: checksum,
        social_approved: false,
      }).select("id,public_url,verification_status,social_approved,width_px,height_px").single();
      if (insertError || !asset) {
        await service.storage.from(BUCKET).remove([objectPath]);
        throw new Error(insertError?.message || "Media metadata insert returned no row");
      }

      outcomes.push({
        source: candidate.source,
        resolved_url: fetched.resolvedUrl,
        status: "imported_verified",`;

const newSave = `      const fileName = fileNameFromUrl(fetched.resolvedUrl, extension);
      const metadata = {
        bucket: BUCKET,
        object_path: objectPath,
        public_url: publicData.publicUrl,
        file_name: fileName,
        mime_type: fetched.mimeType,
        size_bytes: fetched.bytes.byteLength,
        title: \`${candidate.productNames[0] || "Catalog product"} · catalog image ${candidate.position}\`,
        alt_text: candidate.productNames[0] || "Irha Apparels product",
        tags: unique([...(placeholder ? stringArray(placeholder.tags) : []), ...tags]).slice(0, 50),
        usage_notes: \`Reconciled from the published Irha Apparels catalog. Source: ${fetched.resolvedUrl}. Owner social approval remains required.\`,
        status: "active",
        verification_status: "verified",
        width_px: dimensions.width,
        height_px: dimensions.height,
        duration_ms: null,
        checksum_sha256: checksum,
        social_approved: false,
        social_approved_by: null,
        social_approved_at: null,
      };
      const saveQuery = placeholder
        ? service.from("media_assets").update(metadata).eq("id", placeholder.id)
        : service.from("media_assets").insert(metadata);
      const { data: asset, error: saveError } = await saveQuery.select("id,public_url,verification_status,social_approved,width_px,height_px").single();
      if (saveError || !asset) {
        await service.storage.from(BUCKET).remove([objectPath]);
        throw new Error(saveError?.message || "Media metadata save returned no row");
      }

      outcomes.push({
        source: candidate.source,
        resolved_url: fetched.resolvedUrl,
        status: placeholder ? "reconciled_verified" : "imported_verified",`;

if (!backend.includes(oldSave)) throw new Error("Media save anchor not found");
backend = backend.replace(oldSave, newSave);

const oldCounts = `  const imported = outcomes.filter((item) => item.status === "imported_verified").length;
  const skipped = outcomes.filter((item) => item.status === "skipped_existing").length;`;
const newCounts = `  const reconciled = outcomes.filter((item) => item.status === "reconciled_verified").length;
  const inserted = outcomes.filter((item) => item.status === "imported_verified").length;
  const imported = reconciled + inserted;
  const skipped = outcomes.filter((item) => item.status === "skipped_existing").length;`;
if (!backend.includes(oldCounts)) throw new Error("Import count anchor not found");
backend = backend.replace(oldCounts, newCounts);

const oldResult = `    imported,
    skipped,
    failed,`;
const newResult = `    imported,
    reconciled,
    inserted,
    skipped,
    failed,`;
if (!backend.includes(oldResult)) throw new Error("Import response anchor not found");
backend = backend.replace(oldResult, newResult);

writeFileSync(backendPath, backend);

const frontendPath = "src/components/admin/CatalogMediaBootstrapPanel.tsx";
let frontend = readFileSync(frontendPath, "utf8");
frontend = frontend.replace("  imported?: number;\n  skipped?: number;", "  imported?: number;\n  reconciled?: number;\n  inserted?: number;\n  skipped?: number;");
frontend = frontend.replace(
  "description: `${result.skipped || 0} already existed · ${result.failed || 0} failed. Social approval is still off.`,",
  "description: `${result.reconciled || 0} pending rows upgraded · ${result.inserted || 0} new · ${result.skipped || 0} already verified · ${result.failed || 0} failed. Social approval is still off.`,",
);
writeFileSync(frontendPath, frontend);
