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
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function canonicalJson(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.result?.rows)) return payload.result.rows;
  return [];
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
    throw new ManifestError("MALFORMED_RESPONSE", "Supabase Management API returned malformed JSON");
  }
  if (!response.ok) {
    throw new ManifestError("MANAGEMENT_API_FAILURE", `Supabase Management API request failed (${response.status})`);
  }
  return payload;
}

async function databaseQuery(projectId, accessToken, query) {
  const payload = await managementRequest(`/v1/projects/${projectId}/database/query`, accessToken, {
    method: "POST",
    body: JSON.stringify({ query, read_only: true }),
  });
  return extractRows(payload);
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
    registries[classification] = {
      path,
      raw,
      parsed,
      file_sha256: sha256(raw),
    };
    combinedRaw += raw;
  }
  return { registries, classification_sha256: sha256(combinedRaw) };
}

function expectedDeployedFunctions(registries) {
  const expected = new Map();
  for (const classification of REGISTRY_ORDER) {
    if (!DEPLOYED_CLASSES.has(classification)) continue;
    for (const row of registries[classification].parsed.functions) {
      const [name, version, verifyJwt, sourceHash] = row;
      if (expected.has(name)) throw new ManifestError("DUPLICATE_FUNCTION", `Duplicate function ${name}`);
      expected.set(name, {
        classification,
        version,
        verify_jwt: verifyJwt,
        source_sha256: sourceHash,
      });
    }
  }
  return expected;
}

function verifyLiveFunctions(functionPayload, expected) {
  const live = (functionPayload.functions ?? [])
    .filter((fn) => fn.status === "ACTIVE")
    .map((fn) => ({
      name: String(fn.slug ?? fn.name),
      version: Number(fn.version),
      verify_jwt: Boolean(fn.verify_jwt),
      source_sha256: String(fn.ezbr_sha256 ?? ""),
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
  for (const fn of live) {
    if (!expected.has(fn.name)) throw new ManifestError("EDGE_UNEXPLAINED", `Unexplained live function: ${fn.name}`);
  }
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
  if (forbidden.some((pattern) => pattern.test(serialized))) {
    throw new ManifestError("SECRET_OUTPUT", "Secret-bearing manifest output was rejected");
  }
}

async function buildManifest(root, accessToken) {
  const projectId = required(process.env.SUPABASE_PROJECT_ID ?? EXPECTED_PROJECT_ID, "SUPABASE_PROJECT_ID");
  if (projectId !== EXPECTED_PROJECT_ID) throw new ManifestError("PROJECT_MISMATCH", "Unexpected Supabase project identity");

  const project = await managementRequest(`/v1/projects/${projectId}`, accessToken);
  if (project.id !== projectId || project.status !== "ACTIVE_HEALTHY") {
    throw new ManifestError("PROJECT_IDENTITY_FAILURE", "Supabase project identity or health verification failed");
  }

  const inventorySql = readFileSync(resolve(root, "scripts/supabase/export-deployment-manifest.sql"), "utf8");
  const inventoryRows = await databaseQuery(projectId, accessToken, inventorySql);
  if (inventoryRows.length !== 1) throw new ManifestError("INVENTORY_FAILURE", "Canonical database inventory did not return exactly one row");
  const inventory = inventoryRows[0].jsonb_build_object ?? inventoryRows[0].result ?? Object.values(inventoryRows[0])[0];
  if (!inventory?.database || !inventory?.cron || !inventory?.storage || !inventory?.browser_exposure) {
    throw new ManifestError("INVENTORY_SHAPE", "Canonical database inventory shape is invalid");
  }

  const functionPayload = await managementRequest(`/v1/projects/${projectId}/functions`, accessToken);
  const { registries, classification_sha256 } = loadRegistries(root);
  const expectedFunctions = expectedDeployedFunctions(registries);
  const liveFunctions = verifyLiveFunctions(functionPayload, expectedFunctions);
  const configSha256 = verifyConfig(root, expectedFunctions, registries.F4);

  const typesPath = "src/integrations/supabase/types.ts";
  const types = readFileSync(resolve(root, typesPath), "utf8");
  if (!types.includes("export type Database") || types.includes("private:") || types.includes("vault:")) {
    throw new ManifestError("TYPE_SCOPE_FAILURE", "Generated types do not match the approved public-only scope");
  }

  const provenancePath = "supabase/deployment-parity/migration-provenance.json";
  const provenanceRaw = readFileSync(resolve(root, provenancePath), "utf8");
  const provenance = JSON.parse(provenanceRaw);
  if (provenance.payload?.totals?.live !== inventory.database.live_migrations.count || provenance.payload?.totals?.P5 !== 0) {
    throw new ManifestError("PROVENANCE_DRIFT", "Migration provenance ledger does not match live migration history");
  }

  const serializationPath = "supabase/deployment-parity/SERIALIZATION.md";
  const serializationRaw = readFileSync(resolve(root, serializationPath), "utf8");
  const registrySummary = Object.fromEntries(
    [...REGISTRY_ORDER, "F5"].map((classification) => {
      if (classification === "F5") return [classification, { count: 0, file_sha256: null, path: null }];
      const registry = registries[classification];
      return [classification, {
        count: registry.parsed.functions.length,
        file_sha256: registry.file_sha256,
        path: registry.path,
      }];
    }),
  );

  const notificationDispatcher = liveFunctions.find((fn) => fn.name === "notification-dispatcher");
  if (!notificationDispatcher || notificationDispatcher.version !== 7 || notificationDispatcher.verify_jwt !== false || notificationDispatcher.source_sha256 !== "62da00683ce93174c7850f38640ba279ea5baa6de77129045a1670681e153ec7") {
    throw new ManifestError("DISPATCHER_REGRESSION", "notification-dispatcher authentication/source contract drifted");
  }

  const privateExposure = Object.entries(inventory.browser_exposure)
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
      supabase_organization_id: String(project.organization_id ?? ""),
      supabase_region: String(project.region ?? ""),
      supabase_status: String(project.status),
    },
    database: inventory.database,
    browser_exposure: {
      ...inventory.browser_exposure,
      private_schema_client_exposure: privateExposure,
    },
    cron: inventory.cron,
    storage: {
      ...inventory.storage,
      object_level_inventory_performed: false,
    },
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
        tables: inventory.database.public.tables,
        views: inventory.database.public.views,
        function_signatures: inventory.database.public.function_signatures,
        enums: inventory.database.public.enums,
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
        version: notificationDispatcher.version,
        verify_jwt: notificationDispatcher.verify_jwt,
        source_sha256: notificationDispatcher.source_sha256,
        custom_auth_required: true,
        single_use_scheduler_authorization: true,
      },
      sealed_stub_count: registries.F3.parsed.functions.length,
      unexplained_f5_count: 0,
      secret_values_in_manifest: false,
    },
    serialization_contract: {
      path: serializationPath,
      sha256: sha256(serializationRaw),
    },
  };

  if (payload.browser_exposure.private_schema_client_exposure) {
    throw new ManifestError("PRIVATE_SCHEMA_EXPOSURE", "A private schema is exposed to a browser role");
  }
  if (payload.cron.count !== 8 || payload.cron.active_count !== 8) {
    throw new ManifestError("CRON_DRIFT", "Expected all eight cron jobs to remain active");
  }
  if (payload.database.live_migrations.count !== 374) {
    throw new ManifestError("MIGRATION_COUNT_DRIFT", "Expected 374 live migrations");
  }

  const canonicalPayload = canonicalJson(payload);
  return canonicalize({
    ...payload,
    manifest_sha256: sha256(canonicalPayload),
  });
}

async function main() {
  const root = process.cwd();
  const accessToken = required(process.env.SUPABASE_ACCESS_TOKEN, "SUPABASE_ACCESS_TOKEN");
  const outputPath = resolve(root, process.env.SUPABASE_MANIFEST_OUTPUT ?? "supabase/deployment-parity/manifest.json");
  const mode = process.env.SUPABASE_MANIFEST_MODE ?? "verify";
  const manifest = await buildManifest(root, accessToken);
  const serialized = canonicalJson(manifest);
  rejectSecretBearingOutput(serialized);

  if (mode === "write") {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (mode === "verify") {
    if (!existsSync(outputPath)) throw new ManifestError("MISSING_MANIFEST", "Committed deployment manifest is missing");
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new ManifestError("MANIFEST_DRIFT", "Committed deployment manifest does not match live state");
    }
  } else {
    throw new ManifestError("INVALID_MODE", `Unsupported SUPABASE_MANIFEST_MODE ${mode}`);
  }

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
