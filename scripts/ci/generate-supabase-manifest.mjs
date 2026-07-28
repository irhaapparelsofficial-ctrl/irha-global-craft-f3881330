import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXPECTED_PROJECT_ID = "pvzjiozismyxqrzmtfbi";
const EXPECTED_REPOSITORY = "irhaapparelsofficial-ctrl/irha-global-craft-f3881330";
const PRODUCTION_ORIGIN = "https://irhaapparels.com";
const MANAGEMENT_API = "https://api.supabase.com";
const REGISTRY_ORDER = ["F1", "F2", "F3", "F4", "F6"];
const DEPLOYED_CLASSES = new Set(["F1", "F2", "F3", "F6"]);

class ManifestError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ManifestError";
    this.code = code;
  }
}

function required(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new ManifestError("MISSING_INPUT", `${label} is required`);
  return normalized;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

function normalizeRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.result?.rows)) return payload.result.rows;
  return [];
}

function normalizeFunctions(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.functions)) return payload.functions;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  return [];
}

function safeApiDetail(payload, accessToken) {
  const value = payload?.message ?? payload?.error ?? payload?.msg ?? payload;
  return String(typeof value === "string" ? value : JSON.stringify(value))
    .replaceAll(accessToken, "[REDACTED]")
    .replace(/(?:sb_secret_|sbp_)[A-Za-z0-9_-]+/g, "[REDACTED]")
    .slice(0, 500);
}

async function managementRequest(path, accessToken, options = {}) {
  const response = await fetch(`${MANAGEMENT_API}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new ManifestError("MALFORMED_RESPONSE", `Supabase Management API returned malformed JSON for ${path}`);
  }
  if (!response.ok) {
    throw new ManifestError(
      "MANAGEMENT_API_FAILURE",
      `Supabase Management API ${path} failed (${response.status}): ${safeApiDetail(payload, accessToken)}`,
    );
  }
  return payload;
}

async function databaseQuery(projectId, accessToken, query, label) {
  const payload = await managementRequest(`/v1/projects/${projectId}/database/query`, accessToken, {
    method: "POST",
    body: JSON.stringify({ query, read_only: true }),
  });
  const rows = normalizeRows(payload);
  if (rows.length !== 1) {
    throw new ManifestError("INVENTORY_FAILURE", `${label} returned ${rows.length} rows instead of one`);
  }
  return rows[0];
}

async function loadDatabaseInventory(projectId, accessToken) {
  const counts = await databaseQuery(projectId, accessToken, `
select jsonb_build_object(
  'public', jsonb_build_object(
    'tables', (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')),
    'views', (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('v','m')),
    'function_signatures', (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'),
    'distinct_function_names', (select count(distinct p.proname)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'),
    'enums', (select count(*)::int from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typtype='e'),
    'triggers', (select count(*)::int from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal),
    'indexes', (select count(*)::int from pg_index i join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'),
    'constraints', (select count(*)::int from pg_constraint con join pg_namespace n on n.oid=con.connamespace where n.nspname='public'),
    'rls_enabled_tables', (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and c.relrowsecurity),
    'policies', (select count(*)::int from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public')
  ),
  'live_migrations', (
    select jsonb_build_object('count',count(*)::int,'min_version',min(version),'max_version',max(version))
    from supabase_migrations.schema_migrations
  )
) as value;
`, "database counts");

  const digestA = await databaseQuery(projectId, accessToken, `
select jsonb_build_object(
  'columns', encode(extensions.digest(coalesce((
    select string_agg(concat_ws('|',table_name,ordinal_position,column_name,data_type,udt_name,is_nullable,coalesce(column_default,'')), E'\\n' order by table_name,ordinal_position)
    from information_schema.columns where table_schema='public'
  ),''),'sha256'),'hex'),
  'constraints', encode(extensions.digest(coalesce((
    select string_agg(concat_ws('|',c.relname,con.conname,con.contype,pg_get_constraintdef(con.oid,true)), E'\\n' order by c.relname,con.conname)
    from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=con.connamespace where n.nspname='public'
  ),''),'sha256'),'hex')
) as value;
`, "column and constraint digests");

  const digestB = await databaseQuery(projectId, accessToken, `
select jsonb_build_object(
  'functions', encode(extensions.digest(coalesce((
    select string_agg(concat_ws('|',p.proname,pg_get_function_identity_arguments(p.oid),pg_get_function_result(p.oid),l.lanname,p.prosecdef,p.provolatile,encode(extensions.digest(pg_get_functiondef(p.oid),'sha256'),'hex')), E'\\n' order by p.proname,pg_get_function_identity_arguments(p.oid))
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname='public'
  ),''),'sha256'),'hex'),
  'indexes', encode(extensions.digest(coalesce((
    select string_agg(pg_get_indexdef(i.indexrelid), E'\\n' order by ic.relname)
    from pg_index i join pg_class c on c.oid=i.indrelid join pg_class ic on ic.oid=i.indexrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
  ),''),'sha256'),'hex')
) as value;
`, "function and index digests");

  const digestC = await databaseQuery(projectId, accessToken, `
select jsonb_build_object(
  'migrations', encode(extensions.digest(coalesce((
    select string_agg(concat_ws('|',version,name,encode(extensions.digest(convert_to(array_to_string(statements,E'\\n-- IRHA-MIGRATION-STATEMENT-BOUNDARY --\\n'),'UTF8'),'sha256'),'hex')), E'\\n' order by version)
    from supabase_migrations.schema_migrations
  ),''),'sha256'),'hex'),
  'policies', encode(extensions.digest(coalesce((
    select string_agg(concat_ws('|',c.relname,p.polname,p.polcmd,array_to_string(p.polroles,','),coalesce(pg_get_expr(p.polqual,p.polrelid),''),coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'')), E'\\n' order by c.relname,p.polname)
    from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
  ),''),'sha256'),'hex'),
  'triggers', encode(extensions.digest(coalesce((
    select string_agg(pg_get_triggerdef(t.oid,true), E'\\n' order by c.relname,t.tgname)
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal
  ),''),'sha256'),'hex')
) as value;
`, "migration, policy and trigger digests");

  return {
    ...counts.value,
    canonical_digests_sha256: {
      ...digestA.value,
      ...digestB.value,
      ...digestC.value,
    },
  };
}

async function loadCronInventory(projectId, accessToken) {
  const row = await databaseQuery(projectId, accessToken, `
select jsonb_build_object(
  'count',count(*)::int,
  'active_count',count(*) filter(where active)::int,
  'canonical_sha256',encode(extensions.digest(coalesce(string_agg(concat_ws('|',jobid,jobname,schedule,active),E'\\n' order by jobid),''),'sha256'),'hex'),
  'jobs',coalesce(jsonb_agg(jsonb_build_object('jobid',jobid,'jobname',jobname,'schedule',schedule,'active',active) order by jobid),'[]'::jsonb)
) as value from cron.job;
`, "cron inventory");
  return row.value;
}

async function loadStorageInventory(projectId, accessToken) {
  const row = await databaseQuery(projectId, accessToken, `
select jsonb_build_object(
  'bucket_count',count(*)::int,
  'canonical_sha256',encode(extensions.digest(coalesce(string_agg(concat_ws('|',id,public,coalesce(file_size_limit::text,''),coalesce(array_to_string(allowed_mime_types,','),'')),E'\\n' order by id),''),'sha256'),'hex'),
  'buckets',coalesce(jsonb_agg(jsonb_build_object('name',id,'public',public,'file_size_limit',file_size_limit,'allowed_mime_types',allowed_mime_types) order by id),'[]'::jsonb)
) as value from storage.buckets;
`, "Storage inventory");
  return row.value;
}

async function loadBrowserExposure(projectId, accessToken) {
  const row = await databaseQuery(projectId, accessToken, `
select jsonb_build_object(
  'public_schema_usage',jsonb_build_object('anon',has_schema_privilege('anon','public','USAGE'),'authenticated',has_schema_privilege('authenticated','public','USAGE')),
  'private_schema_usage',jsonb_build_object('anon',case when to_regnamespace('private') is null then false else has_schema_privilege('anon','private','USAGE') end,'authenticated',case when to_regnamespace('private') is null then false else has_schema_privilege('authenticated','private','USAGE') end),
  'vault_schema_usage',jsonb_build_object('anon',case when to_regnamespace('vault') is null then false else has_schema_privilege('anon','vault','USAGE') end,'authenticated',case when to_regnamespace('vault') is null then false else has_schema_privilege('authenticated','vault','USAGE') end),
  'legacy_schema_usage',jsonb_build_object('anon',case when to_regnamespace('legacy') is null then false else has_schema_privilege('anon','legacy','USAGE') end,'authenticated',case when to_regnamespace('legacy') is null then false else has_schema_privilege('authenticated','legacy','USAGE') end),
  'migration_archive_schema_usage',jsonb_build_object('anon',case when to_regnamespace('migration_archive') is null then false else has_schema_privilege('anon','migration_archive','USAGE') end,'authenticated',case when to_regnamespace('migration_archive') is null then false else has_schema_privilege('authenticated','migration_archive','USAGE') end)
) as value;
`, "browser schema exposure");
  return row.value;
}

function loadRegistries(root) {
  const registries = {};
  let combinedRaw = "";
  for (const classification of REGISTRY_ORDER) {
    const path = `supabase/deployment-parity/functions-${classification.toLowerCase()}.json`;
    const raw = readFileSync(resolve(root, path), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed.classification !== classification || !Array.isArray(parsed.functions)) {
      throw new ManifestError("INVALID_REGISTRY", `Invalid ${classification} registry`);
    }
    registries[classification] = { path, raw, parsed, file_sha256: sha256(raw) };
    combinedRaw += raw;
  }
  return { registries, classification_sha256: sha256(combinedRaw) };
}

function expectedDeployedFunctions(registries) {
  const expected = new Map();
  for (const classification of REGISTRY_ORDER) {
    if (!DEPLOYED_CLASSES.has(classification)) continue;
    for (const [name, version, verifyJwt, sourceHash] of registries[classification].parsed.functions) {
      if (expected.has(name)) throw new ManifestError("DUPLICATE_FUNCTION", `Duplicate function ${name}`);
      expected.set(name, { classification, version, verify_jwt: verifyJwt, source_sha256: sourceHash });
    }
  }
  return expected;
}

function verifyLiveFunctions(functionPayload, expected) {
  const live = normalizeFunctions(functionPayload)
    .filter((fn) => fn.status === "ACTIVE")
    .map((fn) => ({
      name: String(fn.slug ?? fn.name),
      version: Number(fn.version),
      verify_jwt: Boolean(fn.verify_jwt),
      source_sha256: String(fn.ezbr_sha256 ?? fn.source_sha256 ?? ""),
      status: String(fn.status),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (live.length !== 87 || expected.size !== 87) {
    throw new ManifestError("EDGE_COUNT_DRIFT", `Expected 87 live and represented functions; found live=${live.length}, represented=${expected.size}`);
  }
  const liveByName = new Map(live.map((fn) => [fn.name, fn]));
  for (const [name, representation] of expected) {
    const deployed = liveByName.get(name);
    if (!deployed) throw new ManifestError("EDGE_MISSING", `Live function missing: ${name}`);
    if (deployed.version !== representation.version) throw new ManifestError("EDGE_VERSION_DRIFT", `Version mismatch: ${name}`);
    if (deployed.verify_jwt !== representation.verify_jwt) throw new ManifestError("EDGE_AUTH_DRIFT", `verify_jwt mismatch: ${name}`);
    if (deployed.source_sha256 !== representation.source_sha256) throw new ManifestError("EDGE_SOURCE_DRIFT", `Source hash mismatch: ${name}`);
  }
  for (const fn of live) if (!expected.has(fn.name)) throw new ManifestError("EDGE_UNEXPLAINED", `Unexplained live function: ${fn.name}`);
  return live;
}

function verifyConfig(root, expected, f4Registry) {
  const config = readFileSync(resolve(root, "supabase/config.toml"), "utf8");
  for (const [name, representation] of expected) {
    const section = `[functions.${name}]\nverify_jwt = ${representation.verify_jwt}`;
    if (!config.includes(section)) throw new ManifestError("CONFIG_DRIFT", `Missing or incorrect config entry: ${name}`);
  }
  for (const row of f4Registry.parsed.functions) {
    if (!config.includes(`[functions.${row[0]}]`)) throw new ManifestError("CONFIG_F4_DRIFT", `Missing repository-only config entry: ${row[0]}`);
  }
  return sha256(config);
}

function rejectSecretBearingOutput(serialized) {
  const forbidden = [
    /sb_secret_[A-Za-z0-9_-]+/,
    /service_role\s*[:=]\s*["']?[A-Za-z0-9._-]{20,}/i,
    /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /authorization\s*[:=]\s*["']?bearer\s+[A-Za-z0-9._-]{20,}/i,
  ];
  if (forbidden.some((pattern) => pattern.test(serialized))) throw new ManifestError("SECRET_OUTPUT", "Secret-bearing manifest output was rejected");
}

async function buildManifest(root, accessToken) {
  const projectId = required(process.env.SUPABASE_PROJECT_ID ?? EXPECTED_PROJECT_ID, "SUPABASE_PROJECT_ID");
  if (projectId !== EXPECTED_PROJECT_ID) throw new ManifestError("PROJECT_MISMATCH", "Unexpected Supabase project identity");
  const project = await managementRequest(`/v1/projects/${projectId}`, accessToken);
  if (project.id !== projectId || project.status !== "ACTIVE_HEALTHY") throw new ManifestError("PROJECT_IDENTITY_FAILURE", "Supabase project identity or health verification failed");

  const [database, cron, storage, browserExposure, functionPayload] = await Promise.all([
    loadDatabaseInventory(projectId, accessToken),
    loadCronInventory(projectId, accessToken),
    loadStorageInventory(projectId, accessToken),
    loadBrowserExposure(projectId, accessToken),
    managementRequest(`/v1/projects/${projectId}/functions`, accessToken),
  ]);

  const { registries, classification_sha256 } = loadRegistries(root);
  const expectedFunctions = expectedDeployedFunctions(registries);
  const liveFunctions = verifyLiveFunctions(functionPayload, expectedFunctions);
  const configSha256 = verifyConfig(root, expectedFunctions, registries.F4);

  const typesPath = "src/integrations/supabase/types.ts";
  const types = readFileSync(resolve(root, typesPath), "utf8");
  if (!types.includes("export type Database") || types.includes("private:") || types.includes("vault:")) throw new ManifestError("TYPE_SCOPE_FAILURE", "Generated types do not match the approved public-only scope");

  const provenancePath = "supabase/deployment-parity/migration-provenance.json";
  const provenanceRaw = readFileSync(resolve(root, provenancePath), "utf8");
  const provenance = JSON.parse(provenanceRaw);
  if (provenance.payload?.totals?.live !== database.live_migrations.count || provenance.payload?.totals?.P5 !== 0) throw new ManifestError("PROVENANCE_DRIFT", "Migration provenance ledger does not match live migration history");

  const serializationPath = "supabase/deployment-parity/SERIALIZATION.md";
  const serializationRaw = readFileSync(resolve(root, serializationPath), "utf8");
  const registrySummary = Object.fromEntries([...REGISTRY_ORDER, "F5"].map((classification) => {
    if (classification === "F5") return [classification, { count: 0, file_sha256: null, path: null }];
    const registry = registries[classification];
    return [classification, { count: registry.parsed.functions.length, file_sha256: registry.file_sha256, path: registry.path }];
  }));

  const dispatcher = liveFunctions.find((fn) => fn.name === "notification-dispatcher");
  if (!dispatcher || dispatcher.version !== 8 || dispatcher.verify_jwt !== false || dispatcher.source_sha256 !== "2b4525d022b0788c3bb6b2bf25923c90c35807a3e2b6065671b2eb90f00f1a48") throw new ManifestError("DISPATCHER_REGRESSION", "notification-dispatcher authentication/source contract drifted");

  const privateExposure = Object.entries(browserExposure)
    .filter(([name]) => name !== "public_schema_usage")
    .some(([, grants]) => grants.anon || grants.authenticated);

  const payload = {
    schema_version: 2,
    execution_id: "IA-SEC-E002R",
    goal_lock: "IRHA-PRODUCTION-SECURITY-01",
    identity: {
      repository: EXPECTED_REPOSITORY,
      production_origin: PRODUCTION_ORIGIN,
      supabase_project_id: projectId,
      supabase_organization_id: String(project.organization_id ?? project.organization?.id ?? ""),
      supabase_region: String(project.region ?? ""),
      supabase_status: String(project.status),
    },
    database,
    browser_exposure: { ...browserExposure, private_schema_client_exposure: privateExposure },
    cron,
    storage: { ...storage, object_level_inventory_performed: false },
    edge_functions: {
      deployed_count: liveFunctions.length,
      live_inventory_sha256: sha256(canonicalJson(liveFunctions)),
      classification_sha256,
      registries: registrySummary,
      config_toml_sha256: configSha256,
      config_parity: true,
    },
    generated_types: {
      approved_schema: "public",
      committed_file: typesPath,
      sha256: sha256(types),
      totals: {
        tables: database.public.tables,
        views: database.public.views,
        function_signatures: database.public.function_signatures,
        enums: database.public.enums,
      },
      private_schemas_excluded: true,
      freshness_gate: "official Supabase CLI public-schema generation and byte-for-byte comparison",
    },
    migration_provenance: {
      path: provenancePath,
      file_sha256: sha256(provenanceRaw),
      canonical_payload_sha256: provenance.canonical_payload_sha256,
      totals: provenance.payload.totals,
    },
    security_invariants: {
      notification_dispatcher: {
        version: dispatcher.version,
        verify_jwt: dispatcher.verify_jwt,
        source_sha256: dispatcher.source_sha256,
        custom_auth_required: true,
        single_use_scheduler_authorization: true,
      },
      sealed_stub_count: registries.F3.parsed.functions.length,
      unexplained_f5_count: 0,
      secret_values_in_manifest: false,
    },
    serialization_contract: { path: serializationPath, sha256: sha256(serializationRaw) },
  };

  if (privateExposure) throw new ManifestError("PRIVATE_SCHEMA_EXPOSURE", "A private schema is exposed to a browser role");
  if (cron.count !== 8 || cron.active_count !== 8) throw new ManifestError("CRON_DRIFT", "Expected all eight cron jobs to remain active");
  if (database.live_migrations.count !== 375) throw new ManifestError("MIGRATION_COUNT_DRIFT", "Expected 375 live migrations");
  return canonicalize({ ...payload, manifest_sha256: sha256(canonicalJson(payload)) });
}

async function main() {
  const root = process.cwd();
  const accessToken = required(process.env.SUPABASE_ACCESS_TOKEN, "SUPABASE_ACCESS_TOKEN");
  const outputPath = resolve(root, process.env.SUPABASE_MANIFEST_OUTPUT ?? "supabase/deployment-parity/manifest.json");
  const mode = process.env.SUPABASE_MANIFEST_MODE ?? "verify";
  const manifest = await buildManifest(root, accessToken);
  const serialized = canonicalJson(manifest);
  rejectSecretBearingOutput(serialized);
  if (mode === "write") writeFileSync(outputPath, serialized, "utf8");
  else if (mode === "verify") {
    if (!existsSync(outputPath)) throw new ManifestError("MISSING_MANIFEST", "Committed deployment manifest is missing");
    if (readFileSync(outputPath, "utf8") !== serialized) throw new ManifestError("MANIFEST_DRIFT", "Committed deployment manifest does not match live state");
  } else throw new ManifestError("INVALID_MODE", `Unsupported SUPABASE_MANIFEST_MODE ${mode}`);
  console.log(JSON.stringify({
    project_id: manifest.identity.supabase_project_id,
    tables: manifest.database.public.tables,
    views: manifest.database.public.views,
    function_signatures: manifest.database.public.function_signatures,
    migrations: manifest.database.live_migrations.count,
    edge_functions: manifest.edge_functions.deployed_count,
    cron_jobs: manifest.cron.count,
    buckets: manifest.storage.bucket_count,
    types_sha256: manifest.generated_types.sha256,
    migration_provenance_sha256: manifest.migration_provenance.canonical_payload_sha256,
    manifest_sha256: manifest.manifest_sha256,
    mode,
  }));
}

main().catch((error) => {
  const code = error instanceof ManifestError ? error.code : "UNEXPECTED_FAILURE";
  console.error(`${code}: ${error.message}`);
  process.exitCode = 1;
});
