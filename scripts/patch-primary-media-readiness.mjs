import { readFileSync, writeFileSync } from "node:fs";

const backendPath = "supabase/functions/catalog-media-bootstrap/index.ts";
let backend = readFileSync(backendPath, "utf8");

const oldHealth = `async function health(service: DbClient) {
  const [productCount, totalAssets, importedAssets, approvedAssets] = await Promise.all([
    countRows(service, "products", (query) => query.eq("is_published", true)),
    countRows(service, "media_assets"),
    countRows(service, "media_assets", (query) => query.contains("tags", ["catalog-bootstrap"])),
    countRows(service, "media_assets", (query) => query.contains("tags", ["catalog-bootstrap"]).eq("social_approved", true)),
  ]);
  return json({
    ok: true,
    database_ready: [productCount, totalAssets, importedAssets, approvedAssets].every((item) => item.error === null),
    published_products: productCount.count,
    media_assets: totalAssets.count,
    imported_catalog_assets: importedAssets.count,
    approved_catalog_assets: approvedAssets.count,
    max_batch: MAX_BATCH,
    policy: "Imported assets are technically verified but remain blocked from social use until an admin explicitly approves them.",
    errors: [productCount, totalAssets, importedAssets, approvedAssets].flatMap((item) => item.error ? [item.error] : []),
  });
}`;

const newHealth = `async function health(service: DbClient) {
  const [productCount, totalAssets, pendingCatalog, pendingPrimary, importedAssets, verifiedPrimary, approvedAssets] = await Promise.all([
    countRows(service, "products", (query) => query.eq("is_published", true)),
    countRows(service, "media_assets"),
    countRows(service, "media_assets", (query) => query.contains("tags", ["import:published-catalog"]).eq("verification_status", "pending")),
    countRows(service, "media_assets", (query) => query.contains("tags", ["import:published-catalog", "kind:primary"]).eq("verification_status", "pending")),
    countRows(service, "media_assets", (query) => query.contains("tags", ["catalog-bootstrap"]).eq("verification_status", "verified")),
    countRows(service, "media_assets", (query) => query.contains("tags", ["catalog-bootstrap", "kind:primary"]).eq("verification_status", "verified")),
    countRows(service, "media_assets", (query) => query.contains("tags", ["catalog-bootstrap"]).eq("social_approved", true)),
  ]);
  const checks = [productCount, totalAssets, pendingCatalog, pendingPrimary, importedAssets, verifiedPrimary, approvedAssets];
  return json({
    ok: true,
    database_ready: checks.every((item) => item.error === null),
    published_products: productCount.count,
    media_assets: totalAssets.count,
    pending_catalog_assets: pendingCatalog.count,
    pending_primary_assets: pendingPrimary.count,
    imported_catalog_assets: importedAssets.count,
    verified_primary_assets: verifiedPrimary.count,
    approved_catalog_assets: approvedAssets.count,
    max_batch: MAX_BATCH,
    policy: "Technical verification and owner social approval are separate. Primary-first mode covers one hero image per published product before gallery media.",
    errors: checks.flatMap((item) => item.error ? [item.error] : []),
  });
}`;
if (!backend.includes(oldHealth)) throw new Error("Health block anchor not found");
backend = backend.replace(oldHealth, newHealth);

backend = backend.replace(
`async function preview(service: DbClient, body: JsonRecord) {
  const offset = clamp(body.offset, 0, 100_000, 0);
  const limit = clamp(body.limit, 1, MAX_BATCH, 8);
  const candidates = await loadCandidates(service);`,
`async function preview(service: DbClient, body: JsonRecord) {
  const offset = clamp(body.offset, 0, 100_000, 0);
  const limit = clamp(body.limit, 1, MAX_BATCH, 8);
  const mode = mediaMode(body.mode);
  const candidates = await loadCandidates(service, mode);`,
);
backend = backend.replace(
`    total_candidates: candidates.length,
    offset,`,
`    total_candidates: candidates.length,
    mode,
    offset,`,
);
backend = backend.replace(
`async function importBatch(service: DbClient, body: JsonRecord) {
  const offset = clamp(body.offset, 0, 100_000, 0);
  const limit = clamp(body.limit, 1, MAX_BATCH, 8);
  const candidates = await loadCandidates(service);`,
`async function importBatch(service: DbClient, body: JsonRecord) {
  const offset = clamp(body.offset, 0, 100_000, 0);
  const limit = clamp(body.limit, 1, MAX_BATCH, 8);
  const mode = mediaMode(body.mode);
  const candidates = await loadCandidates(service, mode);`,
);
backend = backend.replace(
`    total_candidates: candidates.length,
    offset,
    processed: slice.length,`,
`    total_candidates: candidates.length,
    mode,
    offset,
    processed: slice.length,`,
);

const oldLoader = `async function loadCandidates(service: DbClient): Promise<Candidate[]> {`;
const newLoader = `async function loadCandidates(service: DbClient, mode: "primary" | "all" = "primary"): Promise<Candidate[]> {`;
if (!backend.includes(oldLoader)) throw new Error("Candidate loader anchor not found");
backend = backend.replace(oldLoader, newLoader);

const oldReturn = `  return [...grouped.values()].sort((left, right) => left.productNames[0].localeCompare(right.productNames[0]) || left.position - right.position || left.source.localeCompare(right.source));
}`;
const newReturn = `  const candidates = [...grouped.values()];
  const selected = mode === "primary" ? candidates.filter((candidate) => candidate.position === 1) : candidates;
  return selected.sort((left, right) => left.productNames[0].localeCompare(right.productNames[0]) || left.position - right.position || left.source.localeCompare(right.source));
}`;
if (!backend.includes(oldReturn)) throw new Error("Candidate return anchor not found");
backend = backend.replace(oldReturn, newReturn);

const clampAnchor = `function clamp(value: unknown, minimum: number, maximum: number, fallback: number) {`;
const modeHelper = `function mediaMode(value: unknown): "primary" | "all" {
  return value === "all" ? "all" : "primary";
}

`;
if (!backend.includes(clampAnchor)) throw new Error("Clamp helper anchor not found");
backend = backend.replace(clampAnchor, `${modeHelper}${clampAnchor}`);
writeFileSync(backendPath, backend);

const frontendPath = "src/components/admin/CatalogMediaBootstrapPanel.tsx";
let frontend = readFileSync(frontendPath, "utf8");
frontend = frontend.replace(
`  media_assets?: number;
  imported_catalog_assets?: number;
  approved_catalog_assets?: number;`,
`  media_assets?: number;
  pending_catalog_assets?: number;
  pending_primary_assets?: number;
  imported_catalog_assets?: number;
  verified_primary_assets?: number;
  approved_catalog_assets?: number;`,
);
frontend = frontend.replace(
`  offset?: number;
  next_offset?: number;`,
`  mode?: "primary" | "all";
  offset?: number;
  next_offset?: number;`,
);
frontend = frontend.replace(
`  const [offset, setOffset] = useState(0);
  const [busy, setBusy]`,
`  const [offset, setOffset] = useState(0);
  const [mode, setMode] = useState<"primary" | "all">("primary");
  const [busy, setBusy]`,
);
frontend = frontend.replaceAll(
`body: { action: "preview", offset, limit: BATCH_SIZE },`,
`body: { action: "preview", mode, offset, limit: BATCH_SIZE },`,
);
frontend = frontend.replaceAll(
`body: { action: "import_batch", offset, limit: BATCH_SIZE },`,
`body: { action: "import_batch", mode, offset, limit: BATCH_SIZE },`,
);
frontend = frontend.replace(
`if (!window.confirm(\`Import and technically verify the next \${BATCH_SIZE} first-party catalog images? They will remain blocked from social use until you approve them.\`)) return;`,
`if (!window.confirm(\`Import and technically verify the next \${BATCH_SIZE} \${mode === "primary" ? "primary product" : "catalog"} images? Existing pending rows will be upgraded in place and remain blocked from social use until you approve them.\`)) return;`,
);
frontend = frontend.replace(
`      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Metric icon={<Images size={13} />} label="Published products" value={health?.published_products} />
        <Metric icon={<Database size={13} />} label="Media Library" value={health?.media_assets} />
        <Metric icon={<BadgeCheck size={13} />} label="Catalog verified" value={health?.imported_catalog_assets} />
        <Metric icon={<ShieldCheck size={13} />} label="Social approved" value={health?.approved_catalog_assets} />
      </div>`,
`      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
        <Metric icon={<Images size={13} />} label="Published products" value={health?.published_products} />
        <Metric icon={<Database size={13} />} label="Media Library" value={health?.media_assets} />
        <Metric icon={<Eye size={13} />} label="Pending catalog" value={health?.pending_catalog_assets} />
        <Metric icon={<Images size={13} />} label="Pending primary" value={health?.pending_primary_assets} />
        <Metric icon={<BadgeCheck size={13} />} label="Verified primary" value={health?.verified_primary_assets} />
        <Metric icon={<ShieldCheck size={13} />} label="Social approved" value={health?.approved_catalog_assets} />
      </div>`,
);

const buttonsAnchor = `      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void scan()}`;
const buttonsReplacement = `      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex border border-border/60 p-1">
          <button type="button" onClick={() => { setMode("primary"); setOffset(0); setPreview(null); }} disabled={busy !== null} className={\`min-h-9 px-3 text-[9px] uppercase tracking-[0.13em] \${mode === "primary" ? "bg-cyan-500 text-slate-950" : "text-muted-foreground"}\`}>Primary first</button>
          <button type="button" onClick={() => { setMode("all"); setOffset(0); setPreview(null); }} disabled={busy !== null} className={\`min-h-9 px-3 text-[9px] uppercase tracking-[0.13em] \${mode === "all" ? "bg-cyan-500 text-slate-950" : "text-muted-foreground"}\`}>All media</button>
        </div>
        <button type="button" onClick={() => void scan()}`;
if (!frontend.includes(buttonsAnchor)) throw new Error("Frontend button anchor not found");
frontend = frontend.replace(buttonsAnchor, buttonsReplacement);
frontend = frontend.replaceAll(`Scan next {BATCH_SIZE}`, `{mode === "primary" ? "Scan primary" : "Scan media"} {BATCH_SIZE}`);
frontend = frontend.replaceAll(`Import next {BATCH_SIZE}`, `{mode === "primary" ? "Import primary" : "Import media"} {BATCH_SIZE}`);
frontend = frontend.replace(
`Current scan offset: {offset}. Imports are atomic per file; a failed source does not roll back successful files in the same small batch.`,
`Current mode: {mode === "primary" ? "primary product images" : "all catalog media"} · offset {offset}. Imports are atomic per file; a failed source does not roll back successful files in the same small batch.`,
);
frontend = frontend.replace(
`Preview · {preview.total_candidates || 0} unique catalog sources`,
`Preview · {preview.total_candidates || 0} {preview.mode === "primary" ? "primary product" : "catalog"} sources`,
);
writeFileSync(frontendPath, frontend);

const publishingPath = "src/components/admin/SocialPublishingCenter.tsx";
let publishing = readFileSync(publishingPath, "utf8");
publishing = publishing.replace(
`  const dueCount = useMemo(() => queue.filter((item) => item.delivery_mode === "automatic" && item.publish_approved_at && (!item.next_attempt_at || new Date(item.next_attempt_at).getTime() <= Date.now())).length, [queue]);`,
`  const dueCount = useMemo(() => queue.filter((item) => item.delivery_mode === "automatic" && item.publish_approved_at && (!item.next_attempt_at || new Date(item.next_attempt_at).getTime() <= Date.now())).length, [queue]);
  const verifiedAccountCount = useMemo(() => accounts.filter((account) => account.verification_status === "verified" && account.enabled).length, [accounts]);`,
);
const errorAnchor = `      {health?.error && <div className="m-4 md:m-5 border border-destructive/35 bg-destructive/[0.05] p-4 text-sm text-destructive">{health.error}</div>}`;
const errorReplacement = `${errorAnchor}
      {!loading && !backendError && accounts.length > 0 && verifiedAccountCount === 0 && <div className="m-4 md:m-5 border border-amber-500/35 bg-amber-500/[0.05] p-4 flex items-start gap-3"><Unplug size={17} className="text-amber-300 shrink-0 mt-0.5" /><div><p className="text-sm text-amber-200">External publishing is blocked.</p><p className="text-xs text-foreground/55 mt-1">No platform account is both verified and enabled. Draft generation, review and media preparation can continue; automatic delivery cannot.</p></div></div>}`;
if (!publishing.includes(errorAnchor)) throw new Error("Publishing warning anchor not found");
publishing = publishing.replace(errorAnchor, errorReplacement);
publishing = publishing.replace(
`              <div className="mt-3 flex flex-wrap gap-1.5">{Object.entries(account.capabilities || {}).filter(([, value]) => value).map(([key]) => <span key={key} className="border border-border/60 px-2 py-1 text-[8px] uppercase tracking-[0.12em]">{key}</span>)}</div>`,
`              <p className="text-[8px] uppercase tracking-[0.13em] text-muted-foreground mt-3">Adapter capability — not connection proof</p><div className="mt-1.5 flex flex-wrap gap-1.5">{Object.entries(account.capabilities || {}).filter(([, value]) => value).map(([key]) => <span key={key} className="border border-border/60 px-2 py-1 text-[8px] uppercase tracking-[0.12em]">{key}</span>)}</div>`,
);
writeFileSync(publishingPath, publishing);
