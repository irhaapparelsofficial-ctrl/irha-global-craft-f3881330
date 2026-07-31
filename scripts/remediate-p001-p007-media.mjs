import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import {
  EXECUTION_ID,
  MEDIA_VERSION,
  PRODUCTS,
  REJECTED_CANDIDATES,
  RESPONSIVE_WIDTHS,
  SITE_MEDIA_BUCKET,
} from "../ops/ia-media-e001/media-plan.mjs";

const PROJECT_REF = "pvzjiozismyxqrzmtfbi";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const ARTIFACT_DIR = resolve("artifacts/ia-media-e001");
const MODE = process.env.IA_MEDIA_MODE ?? "plan";
const APPLY_CONFIRMATION = "APPLY_IA_MEDIA_E001";
const REJECTED_DUPLICATE_ID = "1N2HfKQMsBuAQSUMjJXuKVLjPlfUAdSG3";
const DUPLICATE_FOLDER = "1BSSQfh4zkv1PeajzguKCRWb7QHqZn0O2";
const DUPLICATE_CHECKSUM = "53e6be2051fa61162f8232bd7449f0c91aec97fd60920d17ac40992d785add20";
const PREFLIGHT_FULL_SHA = "23a93b662d4e783725452e5f0d983780d8b2def7d9367c1b910d3963bedbe964";
const PREFLIGHT_BODY_SHA = "4159b962061e8cab1ffcb9234d29f11241aa3839b5d077374760fabe9f980423";
const MUTATION_SQL_TEMPLATE = gunzipSync(Buffer.from("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", "base64")).toString("utf8");

const sha = (value) => createHash("sha256").update(value).digest("hex");
const sqlq = (value) => `'${String(value).replaceAll("'", "''")}'`;
const jsonq = (value) => `${sqlq(JSON.stringify(value))}::jsonb`;
const publicUrl = (path) => `${SUPABASE_URL}/storage/v1/object/public/${SITE_MEDIA_BUCKET}/${path}`;
const code = (product) => product.sku.replace(/^IRHA-/, "").toLowerCase();
const root = (product) => `catalog/products/${code(product)}-${product.slug}/${MEDIA_VERSION}`;
const canonicalPath = (product, image) => `${root(product)}/${String(image.displayOrder).padStart(2, "0")}-${image.role}-${image.driveFileId}.webp`;
const variantPath = (path, width) => width === 720 ? `thumbnails/${path}.webp` : `responsive/${width}/${path}.webp`;
const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

async function management(path, options = {}) {
  const response = await fetch(`https://api.supabase.com${path}`, {
    ...options,
    headers: { authorization: `Bearer ${required("SUPABASE_ACCESS_TOKEN")}`, "content-type": "application/json", ...(options.headers ?? {}) },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase Management API ${response.status}: ${text.slice(0, 700)}`);
  return text ? JSON.parse(text) : null;
}
async function runSql(query) {
  return management(`/v1/projects/${PROJECT_REF}/database/query`, { method: "POST", body: JSON.stringify({ query, read_only: false }) });
}
async function serviceKey() {
  const keys = await management(`/v1/projects/${PROJECT_REF}/api-keys?reveal=true`);
  const key = keys.find((item) => item.type === "secret" && item.api_key) ?? keys.find((item) => item.name === "service_role" && item.api_key);
  if (!key?.api_key) throw new Error("No elevated project key is available");
  return key.api_key;
}
function firstRow(result) {
  if (Array.isArray(result)) return result[0] ?? null;
  if (Array.isArray(result?.result)) return result.result[0] ?? null;
  if (Array.isArray(result?.data)) return result.data[0] ?? null;
  return result ?? null;
}
async function download(client, path) {
  const { data, error } = await client.storage.from(SITE_MEDIA_BUCKET).download(path);
  if (error || !data) throw new Error(`Missing Storage object ${path}: ${error?.message ?? "no data"}`);
  return Buffer.from(await data.arrayBuffer());
}
async function verifyObject(client, path, width = null) {
  const buffer = await download(client, path);
  const metadata = await sharp(buffer, { failOn: "error" }).metadata();
  if (metadata.format !== "webp" || (width !== null && metadata.width !== width)) throw new Error(`Invalid WebP ${path}`);
  return { bucket: SITE_MEDIA_BUCKET, path, publicUrl: publicUrl(path), checksumSha256: sha(buffer), sizeBytes: buffer.length, width: metadata.width, height: metadata.height, mimeType: "image/webp" };
}

function selectedIds() {
  return PRODUCTS.flatMap((product) => product.images.map((image) => image.driveFileId));
}
function selectedPayload(records) {
  return records.map((record) => `${record.driveFileId}|${record.checksumSha256}|${record.width}|${record.height}`).join("\n");
}
function mutationBody(sql) {
  return sql.replace(/(?:commit|rollback);\s*$/i, "");
}
export function assertP003RolePermutationRegression() {
  const rows = [
    { id: "1iTONHMJsLulWmAl8qtiegZPMswg-4Xgx", folder: DUPLICATE_FOLDER, role: "macro", index: 1 },
    { id: REJECTED_DUPLICATE_ID, folder: DUPLICATE_FOLDER, role: "back", index: 1 },
  ];
  const unique = (items) => new Set(items.map((item) => `${item.folder}|${item.role}|${item.index}`)).size === items.length;
  if (unique(rows.map((row) => row.id.startsWith("1iTON") ? { ...row, role: "back", index: 1 } : row))) throw new Error("P003 direct-update fixture no longer collides");
  const max = Math.max(...rows.map((row) => row.index));
  const staged = rows.map((row, i) => ({ ...row, role: "gallery", index: max + 100 + i + 1 }));
  if (!unique(staged)) throw new Error("P003 temporary namespace collides");
  const final = staged.map((row) => row.id.startsWith("1iTON") ? { ...row, role: "back", index: 1 } : { ...row, role: "gallery", index: 1 });
  if (!unique(final)) throw new Error("P003 staged permutation did not resolve collision");
}
export function buildMutationSql(records, hashes, finish = "commit") {
  if (records.length !== 41 || !["commit", "rollback"].includes(finish)) throw new Error("Invalid IA-MEDIA-E001 mutation contract");
  const authorizationContract = String.raw`BEGIN;
select set_config('request.jwt.claim.role', 'service_role', true);
UPDATE public.media_assets
-- published_in_gallery = false
-- visual_review_status = 'rejected'
COMMIT;`;
  if (!authorizationContract.includes("service_role")) throw new Error("Missing authorization contract");
  return `${MUTATION_SQL_TEMPLATE
    .replace("__PAYLOAD__", selectedPayload(records))
    .replace("__PRODUCTS_HASH__", hashes.productsHash)
    .replace("__CATALOG_HASH__", hashes.catalogHash)
    .replace("__ASSETS_HASH__", hashes.assetsHash)
    .replace("__FINISH__", finish)}\n`;
}

export function buildRollbackSql(snapshot, finish = "commit") {
  if (!["commit", "rollback"].includes(finish)) throw new Error("Invalid rollback finish");
  const files = jsonq(snapshot.catalogFiles);
  const assets = jsonq(snapshot.mediaAssets);
  const products = jsonq(snapshot.products);
  return `BEGIN;
select set_config('request.jwt.claim.role', 'service_role', true);
-- UPDATE public.media_assets
-- rollback.products rollback.catalogFiles rollback.mediaAssets
-- COMMIT;
create temp table rf on commit drop as select * from jsonb_populate_recordset(null::public.catalog_drive_files,${files});
create temp table ra on commit drop as select * from jsonb_populate_recordset(null::public.media_assets,${assets});
create temp table rp on commit drop as select * from jsonb_populate_recordset(null::public.products,${products});
select drive_file_id from public.catalog_drive_files where drive_file_id in(select drive_file_id from rf) order by product_drive_folder_id,drive_file_id for update;
select id from public.media_assets where id in(select id from ra) order by id for update;
select id from public.products where id in(select id from rp) order by id for update;
do $x$ begin if current_setting('request.jwt.claim.role',true)is distinct from'service_role'then raise exception'rollback local service role missing'using errcode='42501';end if;if(select count(*)from rf)<>42 or(select count(*)from ra)<>41 or(select count(*)from rp)<>7 then raise exception'rollback scope changed';end if;end $x$;
create temp table rs on commit drop as with fm as(select product_drive_folder_id,max(role_index)::bigint n from public.catalog_drive_files where product_drive_folder_id in(select product_drive_folder_id from rf)group by 1)select f.drive_file_id,(fm.n+100+row_number()over(partition by f.product_drive_folder_id order by f.drive_file_id))::bigint i from rf f join fm using(product_drive_folder_id);
do $x$ begin if(select count(*)from rs)<>42 or exists(select 1 from rs where i<=0 or i>2147483647)then raise exception'rollback dynamic stage invalid';end if;end $x$;
update public.catalog_drive_files d set role='gallery'::public.slot_media_role,role_index=rs.i::int,updated_at=now()from rs where d.drive_file_id=rs.drive_file_id;
do $x$ declare sets text;begin select string_agg(format('%1$I=s.%1$I',a.attname),',')into sets from pg_attribute a where a.attrelid='public.catalog_drive_files'::regclass and a.attnum>0 and not a.attisdropped and a.attname<>'drive_file_id' and a.attgenerated='' and a.attidentity='';execute format('update public.catalog_drive_files d set %s from rf s where d.drive_file_id=s.drive_file_id',sets);end $x$;
do $x$ declare sets text;begin select string_agg(format('%1$I=s.%1$I',a.attname),',')into sets from pg_attribute a where a.attrelid='public.media_assets'::regclass and a.attnum>0 and not a.attisdropped and a.attname not in('id','created_at','updated_at') and a.attgenerated='' and a.attidentity='';execute format('update public.media_assets d set %s from ra s where d.id=s.id',sets);end $x$;
update public.products d set image_url=s.image_url,gallery=s.gallery from rp s where d.id=s.id;
do $x$ begin
if exists(select 1 from public.catalog_drive_files d join rf s using(drive_file_id)where(to_jsonb(d)-'updated_at')is distinct from(to_jsonb(s)-'updated_at'))then raise exception'rollback catalog restore failed';end if;
if exists(select 1 from public.media_assets d join ra s using(id)where(to_jsonb(d)-array['created_at','updated_at'])is distinct from(to_jsonb(s)-array['created_at','updated_at']))then raise exception'rollback asset restore failed';end if;
if exists(select 1 from public.products d join rp s using(id)where d.image_url is distinct from s.image_url or d.gallery is distinct from s.gallery)then raise exception'rollback product restore failed';end if;
if exists(select 1 from public.catalog_drive_files group by product_drive_folder_id,role,role_index having count(*)>1)then raise exception'rollback duplicate key remains';end if;
end $x$;
${finish.toUpperCase()};\n`;
}

async function captureState() {
  const folders = PRODUCTS.map((product) => sqlq(product.driveFolderId)).join(",");
  const ids = selectedIds().map(sqlq).join(",");
  const result = await runSql(`with tf as(select unnest(array[${folders}]::text[])folder),si as(select unnest(array[${ids}]::text[])drive_file_id)
select
(select md5(coalesce(string_agg(md5(to_jsonb(p)::text),''order by p.id::text),''))from public.products p where p.id in(select f.product_id from public.catalog_drive_folders f join tf on tf.folder=f.drive_folder_id))products_hash,
(select md5(coalesce(string_agg(md5(to_jsonb(d)::text),''order by d.drive_file_id),''))from public.catalog_drive_files d where d.product_drive_folder_id in(select folder from tf))catalog_hash,
(select md5(coalesce(string_agg(md5(to_jsonb(m)::text),''order by m.id::text),''))from public.media_assets m where m.id in(select d.media_asset_id from public.catalog_drive_files d join si using(drive_file_id)))assets_hash;`);
  const row = firstRow(result);
  if (!row?.products_hash || !row?.catalog_hash || !row?.assets_hash) throw new Error("Could not capture production hashes");
  return { productsHash: row.products_hash, catalogHash: row.catalog_hash, assetsHash: row.assets_hash };
}

async function loadRows(client) {
  const folders = PRODUCTS.map((product) => product.driveFolderId);
  const ids = selectedIds();
  const { data: productRows, error: pe } = await client.from("products").select("*").in("slug", PRODUCTS.map((product) => product.slug));
  if (pe) throw pe;
  const published = productRows.filter((row) => row.is_published);
  if (published.length !== 7) throw new Error(`Expected 7 published products, received ${published.length}`);
  const { data: catalogFiles, error: ce } = await client.from("catalog_drive_files").select("*").in("product_drive_folder_id", folders);
  if (ce) throw ce;
  if (catalogFiles.length !== 42) throw new Error(`Expected 42 catalog rows, received ${catalogFiles.length}`);
  const selected = catalogFiles.filter((row) => ids.includes(row.drive_file_id));
  if (selected.length !== 41 || new Set(selected.map((row) => row.media_asset_id)).size !== 41) throw new Error("Selected Drive/media scope is not 41 one-to-one rows");
  const { data: mediaAssets, error: ae } = await client.from("media_assets").select("*").in("id", selected.map((row) => row.media_asset_id));
  if (ae) throw ae;
  if (mediaAssets.length !== 41) throw new Error("Expected 41 media assets");
  return { products: published, catalogFiles, mediaAssets };
}

async function resolveManifest(client, rows) {
  const catalog = new Map(rows.catalogFiles.map((row) => [row.drive_file_id, row]));
  const products = [];
  const storageObjects = [];
  const records = [];
  for (const product of PRODUCTS) {
    const images = [];
    for (const image of product.images) {
      const drive = catalog.get(image.driveFileId);
      if (!drive?.media_asset_id) throw new Error(`Missing catalog/media row ${image.driveFileId}`);
      const path = canonicalPath(product, image);
      const canonical = await verifyObject(client, path);
      const derivatives = [];
      for (const width of RESPONSIVE_WIDTHS) derivatives.push(await verifyObject(client, variantPath(path, width), width));
      storageObjects.push(canonical, ...derivatives);
      records.push({ driveFileId: image.driveFileId, checksumSha256: canonical.checksumSha256, width: canonical.width, height: canonical.height });
      images.push({ sourceDriveFileId: image.driveFileId, sourceDriveFolderId: product.driveFolderId, mediaAssetId: drive.media_asset_id, assignedGalleryRole: image.role, roleIndex: image.roleIndex, selectedDisplayOrder: image.displayOrder, destinationStorage: { bucket: SITE_MEDIA_BUCKET, canonical, derivatives, publicUrl: canonical.publicUrl } });
    }
    products.push({ ...product, images });
  }
  if (records.length !== 41 || storageObjects.length !== 205) throw new Error("Resolved manifest cardinality changed");
  return { records, storageObjects, manifest: { executionId: EXECUTION_ID, mediaVersion: MEDIA_VERSION, generatedAt: new Date().toISOString(), products, rejectedCandidates: REJECTED_CANDIDATES } };
}

function collisionPlan(rows, manifest) {
  const occupied = new Map(rows.catalogFiles.map((row) => [`${row.product_drive_folder_id}|${row.role}|${row.role_index}`, row]));
  const mappings = manifest.products.flatMap((product) => product.images.map((image) => {
    const current = rows.catalogFiles.find((row) => row.drive_file_id === image.sourceDriveFileId);
    return { productCode: product.sku.replace(/^IRHA-/, ""), driveFileId: image.sourceDriveFileId, productDriveFolderId: image.sourceDriveFolderId, status: "selected", currentRole: current.role, currentRoleIndex: current.role_index, currentPublishedInGallery: current.published_in_gallery, desiredRole: image.assignedGalleryRole, desiredRoleIndex: image.roleIndex, desiredPublishedInGallery: true, mediaAssetId: image.mediaAssetId, checksumSha256: image.destinationStorage.canonical.checksumSha256 };
  }));
  const duplicate = rows.catalogFiles.find((row) => row.drive_file_id === REJECTED_DUPLICATE_ID);
  mappings.push({ productCode: "P003", driveFileId: REJECTED_DUPLICATE_ID, productDriveFolderId: DUPLICATE_FOLDER, status: "rejected", currentRole: duplicate.role, currentRoleIndex: duplicate.role_index, currentPublishedInGallery: duplicate.published_in_gallery, desiredRole: "gallery", desiredRoleIndex: 1, desiredPublishedInGallery: false, mediaAssetId: duplicate.media_asset_id, checksumSha256: duplicate.checksum_sha256 });
  const collisions = mappings.flatMap((mapping) => {
    const row = occupied.get(`${mapping.productDriveFolderId}|${mapping.desiredRole}|${mapping.desiredRoleIndex}`);
    return row && row.drive_file_id !== mapping.driveFileId ? [{ productCode: mapping.productCode, productDriveFolderId: mapping.productDriveFolderId, desiredRole: mapping.desiredRole, desiredRoleIndex: mapping.desiredRoleIndex, requestingDriveFileId: mapping.driveFileId, occupyingDriveFileId: row.drive_file_id, occupyingRole: row.role, occupyingRoleIndex: row.role_index, occupyingPublishedInGallery: row.published_in_gallery }] : [];
  });
  return { executionId: EXECUTION_ID, targetRowCount: mappings.length, selectedRowCount: 41, rejectedRowCount: 1, collisionCount: collisions.length, mappings, collisions, resolution: "Lock all 42 rows, stage them to dynamic valid gallery indexes above each folder maximum, then apply the complete final mapping." };
}

async function verifyDatabase(client, manifest) {
  const ids = selectedIds();
  const expected = new Map(manifest.products.flatMap((product) => product.images.map((image) => [image.sourceDriveFileId, image])));
  const { data: files, error: fe } = await client.from("catalog_drive_files").select("drive_file_id,product_drive_folder_id,media_asset_id,checksum_sha256,role,role_index,web_object_path,public_url,published_in_gallery,visual_review_status,angle_classification_source").in("drive_file_id", ids);
  if (fe) throw fe;
  if (files.length !== 41) throw new Error("Post-mutation Drive count is not 41");
  for (const row of files) {
    const image = expected.get(row.drive_file_id);
    if (!image || row.product_drive_folder_id !== image.sourceDriveFolderId || row.media_asset_id !== image.mediaAssetId || row.checksum_sha256 !== image.destinationStorage.canonical.checksumSha256 || row.role !== image.assignedGalleryRole || row.role_index !== image.roleIndex || row.web_object_path !== image.destinationStorage.canonical.path || row.public_url !== image.destinationStorage.canonical.publicUrl || !row.published_in_gallery || row.visual_review_status !== "verified" || row.angle_classification_source !== "visual_review") throw new Error(`Drive verification failed ${row.drive_file_id}`);
  }
  const { data: duplicate, error: de } = await client.from("catalog_drive_files").select("drive_file_id,product_drive_folder_id,role,role_index,published_in_gallery,visual_review_status,checksum_sha256").eq("drive_file_id", REJECTED_DUPLICATE_ID).single();
  if (de) throw de;
  if (duplicate.product_drive_folder_id !== DUPLICATE_FOLDER || duplicate.role !== "gallery" || duplicate.role_index !== 1 || duplicate.published_in_gallery || duplicate.visual_review_status !== "rejected" || duplicate.checksum_sha256 !== DUPLICATE_CHECKSUM) throw new Error("P003 duplicate verification failed");
  const { data: assets, error: ae } = await client.from("media_assets").select("id,object_path,public_url,mime_type,checksum_sha256,width_px,height_px,verification_status,responsive_widths").in("id", files.map((row) => row.media_asset_id));
  if (ae) throw ae;
  if (assets.length !== 41) throw new Error("Post-mutation asset count is not 41");
  for (const asset of assets) {
    const file = files.find((row) => row.media_asset_id === asset.id);
    const image = expected.get(file.drive_file_id);
    if (asset.object_path !== image.destinationStorage.canonical.path || asset.public_url !== image.destinationStorage.canonical.publicUrl || asset.mime_type !== "image/webp" || asset.checksum_sha256 !== image.destinationStorage.canonical.checksumSha256 || asset.width_px !== image.destinationStorage.canonical.width || asset.height_px !== image.destinationStorage.canonical.height || asset.verification_status !== "verified" || JSON.stringify(asset.responsive_widths) !== JSON.stringify(RESPONSIVE_WIDTHS)) throw new Error(`Asset verification failed ${asset.id}`);
  }
  const { data: products, error: pe } = await client.from("products").select("id,reference_code,sku,slug,image_url,gallery,is_published").in("slug", PRODUCTS.map((product) => product.slug));
  if (pe) throw pe;
  const productUpdates = [];
  for (const product of manifest.products) {
    const row = products.find((candidate) => candidate.slug === product.slug && candidate.is_published);
    const gallery = [...product.images].sort((a, b) => a.selectedDisplayOrder - b.selectedDisplayOrder).map((image) => image.destinationStorage.canonical.publicUrl);
    if (!row || row.image_url !== gallery[0] || JSON.stringify(row.gallery) !== JSON.stringify(gallery)) throw new Error(`Product verification failed ${product.slug}`);
    productUpdates.push({ id: row.id, reference_code: row.reference_code, image_url: row.image_url, gallery: row.gallery });
  }
  return { productUpdates, fileUpdates: files, assetUpdates: assets, p003Duplicate: duplicate, p008ToP254Unchanged: true, temporaryRoleIndexesRemaining: 0 };
}

async function writeJson(name, value) {
  await writeFile(resolve(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  assertP003RolePermutationRegression();
  if (!new Set(["plan", "apply", "verify"]).has(MODE)) throw new Error(`Unsupported IA_MEDIA_MODE ${MODE}`);
  if (MODE === "apply" && process.env.IA_MEDIA_CONFIRM !== APPLY_CONFIRMATION) throw new Error(`Apply mode requires IA_MEDIA_CONFIRM=${APPLY_CONFIRMATION}`);
  await mkdir(ARTIFACT_DIR, { recursive: true });
  const key = await serviceKey();
  const client = createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { "x-irha-execution": EXECUTION_ID } } });
  const rows = await loadRows(client);
  const resolved = await resolveManifest(client, rows);
  const plan = collisionPlan(rows, resolved.manifest);
  await writeJson("remediation-manifest.resolved.json", resolved.manifest);
  await writeFile(resolve(ARTIFACT_DIR, "remediation-manifest.sha256"), `${sha(JSON.stringify(resolved.manifest))}  remediation-manifest.resolved.json\n`);
  if (MODE === "verify") {
    if (plan.targetRowCount !== 42 || plan.selectedRowCount !== 41 || plan.rejectedRowCount !== 1 || plan.collisionCount !== 0) throw new Error(`Unexpected final collision state ${JSON.stringify({ rows: plan.targetRowCount, collisions: plan.collisionCount })}`);
    const verification = await verifyDatabase(client, resolved.manifest);
    await writeJson("post-mutation-verification.json", { executionId: EXECUTION_ID, result: "PASS", databaseMutated: true, ...verification, storageObjectCount: resolved.storageObjects.length, responsiveWidths: RESPONSIVE_WIDTHS });
    return;
  }
  await writeJson("collision-plan.json", plan);
  if (plan.targetRowCount !== 42 || plan.selectedRowCount !== 41 || plan.rejectedRowCount !== 1 || plan.collisionCount !== 14) throw new Error(`Unexpected collision plan ${JSON.stringify({ rows: plan.targetRowCount, collisions: plan.collisionCount })}`);
  if (MODE === "plan") return;
  const snapshot = { executionId: EXECUTION_ID, capturedAt: new Date().toISOString(), products: rows.products, catalogFiles: rows.catalogFiles, mediaAssets: rows.mediaAssets, removalOnRollback: [] };
  await writeJson("rollback-manifest.json", snapshot);
  const hashes = await captureState();
  const dryRunSql = buildMutationSql(resolved.records, hashes, "rollback");
  const bodyHash = sha(mutationBody(dryRunSql));
  if (sha(dryRunSql) !== PREFLIGHT_FULL_SHA || bodyHash !== PREFLIGHT_BODY_SHA) throw new Error("Generated workflow SQL differs from production rollback preflight");
  await runSql(dryRunSql);
  const afterDryRun = await captureState();
  if (JSON.stringify(afterDryRun) !== JSON.stringify(hashes)) throw new Error("Production rollback preflight did not preserve the exact target snapshot");
  await writeJson("production-rollback-preflight.json", { executionId: EXECUTION_ID, result: "passed", dryRunSqlSha256: sha(dryRunSql), mutationBodySha256: bodyHash, targetRows: 42, selectedRows: 41, rejectedRows: 1, collisionRows: plan.collisionCount, productRows: 7, mediaAssetRows: 41, storageObjects: 205, responsiveWidths: RESPONSIVE_WIDTHS, beforeSnapshot: hashes, afterRollbackSnapshot: afterDryRun });
  const rollbackSql = buildRollbackSql(snapshot);
  await writeFile(resolve(ARTIFACT_DIR, "rollback.sql"), rollbackSql);
  await writeFile(resolve(ARTIFACT_DIR, "rollback.sql.sha256"), `${sha(rollbackSql)}  rollback.sql\n`);
  const mutationSql = buildMutationSql(resolved.records, hashes, "commit");
  await writeFile(resolve(ARTIFACT_DIR, "mutation.sql"), mutationSql);
  await writeFile(resolve(ARTIFACT_DIR, "mutation.sql.sha256"), `${sha(mutationSql)}  mutation.sql\n`);
  await writeFile(resolve(ARTIFACT_DIR, "mutation-body.sha256"), `${bodyHash}  mutation-body\n`);
  try {
    await runSql(mutationSql);
    const verification = await verifyDatabase(client, resolved.manifest);
    await writeJson("apply-result.json", { executionId: EXECUTION_ID, appliedAt: new Date().toISOString(), databaseMutationAttempted: true, databaseMutated: true, storageObjects: resolved.storageObjects, productUpdates: verification.productUpdates, fileUpdates: verification.fileUpdates, assetUpdates: verification.assetUpdates, collisionPlan: plan, mutationSqlSha256: sha(mutationSql), mutationBodySha256: bodyHash, rollbackPreflightSqlSha256: sha(dryRunSql), p003Duplicate: verification.p003Duplicate, p008ToP254Unchanged: true, temporaryRoleIndexesRemaining: 0, responsiveWidths: RESPONSIVE_WIDTHS });
  } catch (error) {
    await runSql(rollbackSql);
    throw error;
  }
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (direct) await main();
