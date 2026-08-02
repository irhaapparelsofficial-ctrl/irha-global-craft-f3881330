#!/usr/bin/env node
import { writeFile } from "node:fs/promises";

const API = "https://api.cloudflare.com/client/v4";
const RULE_DESCRIPTION = "Irha HTML and release identity bypass";
const ZONE_NAME = process.env.CLOUDFLARE_ZONE_NAME?.trim() || "irhaapparels.com";
const PROJECT_NAME = process.env.CLOUDFLARE_PROJECT_NAME?.trim() || "";
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || "";
const TOKEN = process.env.CLOUDFLARE_API_TOKEN?.trim() || "";

const CACHE_PHASE = "http_request_cache_settings";
const HOST_EXPRESSION =
  '(http.host eq "irhaapparels.com" or http.host eq "www.irhaapparels.com")';
const SAFE_STATIC_EXPRESSION = [
  'starts_with(http.request.uri.path, "/assets/")',
  'starts_with(http.request.uri.path, "/responsive/")',
  'starts_with(http.request.uri.path, "/thumbnails/")',
  'starts_with(http.request.uri.path, "/media/")',
  'starts_with(http.request.uri.path, "/catalogs/")',
  'ends_with(http.request.uri.path, ".avif")',
  'ends_with(http.request.uri.path, ".webp")',
  'ends_with(http.request.uri.path, ".jpg")',
  'ends_with(http.request.uri.path, ".jpeg")',
  'ends_with(http.request.uri.path, ".png")',
  'ends_with(http.request.uri.path, ".gif")',
  'ends_with(http.request.uri.path, ".svg")',
  'ends_with(http.request.uri.path, ".ico")',
  'ends_with(http.request.uri.path, ".woff")',
  'ends_with(http.request.uri.path, ".woff2")',
  'ends_with(http.request.uri.path, ".css")',
  '(ends_with(http.request.uri.path, ".js") and http.request.uri.path ne "/sw.js" and http.request.uri.path ne "/agent-webmcp.js")',
  'ends_with(http.request.uri.path, ".pdf")',
].join(" or ");
const CACHE_BYPASS_EXPRESSION = `${HOST_EXPRESSION} and not (${SAFE_STATIC_EXPRESSION})`;

function required(name, value) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function cf(method, endpoint, body, { allow404 = false } = {}) {
  required("CLOUDFLARE_API_TOKEN", TOKEN);
  const response = await fetch(`${API}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { success: false, errors: [{ message: text.slice(0, 500) }] };
  }

  if (allow404 && response.status === 404) return { status: 404, payload };
  if (!response.ok || payload?.success !== true) {
    const errors = JSON.stringify(payload?.errors ?? []);
    throw new Error(`Cloudflare API ${method} ${endpoint} failed (${response.status}): ${errors}`);
  }
  return { status: response.status, payload };
}

async function resolveZone() {
  const query = new URLSearchParams({ name: ZONE_NAME, status: "active", per_page: "5" });
  if (ACCOUNT_ID) query.set("account.id", ACCOUNT_ID);
  const { payload } = await cf("GET", `/zones?${query.toString()}`);
  if (!Array.isArray(payload.result) || payload.result.length !== 1) {
    throw new Error(`Expected exactly one active Cloudflare zone for ${ZONE_NAME}`);
  }
  return payload.result[0];
}

async function getPhaseEntrypoint(zoneId, phase) {
  return cf(
    "GET",
    `/zones/${zoneId}/rulesets/phases/${phase}/entrypoint`,
    undefined,
    { allow404: true },
  );
}

async function bestEffortPhase(zoneId, phase) {
  try {
    const result = await getPhaseEntrypoint(zoneId, phase);
    return { available: result.status !== 404, status: result.status, result: result.payload?.result ?? null };
  } catch (error) {
    return { available: false, status: null, error: String(error.message || error).slice(0, 600), result: null };
  }
}

async function bestEffort(endpoint) {
  try {
    const { payload } = await cf("GET", endpoint);
    return { available: true, result: payload.result };
  } catch (error) {
    return { available: false, error: String(error.message || error).slice(0, 600) };
  }
}

function compactRule(rule, index) {
  return {
    index,
    id: rule.id ?? null,
    enabled: rule.enabled !== false,
    description: rule.description ?? "",
    action: rule.action ?? "",
    expression: rule.expression ?? "",
    action_parameters: rule.action_parameters ?? null,
  };
}

function cacheHazards(cacheRules, pageRules) {
  const hazards = [];

  for (const rule of cacheRules) {
    if (rule.enabled === false) continue;
    if (rule.action !== "set_cache_settings") continue;
    const params = rule.action_parameters ?? {};
    if (params.cache === true) {
      hazards.push({
        kind: "cache-rule-cache-eligible",
        id: rule.id ?? null,
        description: rule.description ?? "",
        expression: rule.expression ?? "",
        edge_ttl: params.edge_ttl ?? null,
        browser_ttl: params.browser_ttl ?? null,
        cache_key: params.cache_key ?? null,
      });
    }
  }

  for (const pageRule of pageRules) {
    if (pageRule.status && pageRule.status !== "active") continue;
    const settings = Array.isArray(pageRule.actions) ? pageRule.actions : [];
    const cacheEverything = settings.some(
      (item) => item?.id === "cache_level" && String(item?.value).toLowerCase() === "cache_everything",
    );
    if (cacheEverything) {
      hazards.push({
        kind: "page-rule-cache-everything",
        id: pageRule.id ?? null,
        targets: pageRule.targets ?? [],
        actions: settings,
      });
    }
  }

  return hazards;
}

async function audit(outPath) {
  const zone = await resolveZone();
  const zoneId = zone.id;

  const [
    project,
    deployments,
    dns,
    pageRules,
    workerRoutes,
    cacheEntrypoint,
    customFirewall,
    managedFirewall,
    configRules,
    originRules,
    redirectRules,
    transformRules,
    browserCacheTtl,
    cacheLevel,
    securityLevel,
    browserCheck,
    botFightMode,
  ] = await Promise.all([
    ACCOUNT_ID && PROJECT_NAME
      ? bestEffort(`/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}`)
      : Promise.resolve({ available: false, error: "project/account not configured" }),
    ACCOUNT_ID && PROJECT_NAME
      ? bestEffort(`/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deployments?per_page=10`)
      : Promise.resolve({ available: false, error: "project/account not configured" }),
    bestEffort(`/zones/${zoneId}/dns_records?per_page=100`),
    bestEffort(`/zones/${zoneId}/pagerules?per_page=100`),
    bestEffort(`/zones/${zoneId}/workers/routes`),
    getPhaseEntrypoint(zoneId, CACHE_PHASE),
    bestEffortPhase(zoneId, "http_request_firewall_custom"),
    bestEffortPhase(zoneId, "http_request_firewall_managed"),
    bestEffortPhase(zoneId, "http_config_settings"),
    bestEffortPhase(zoneId, "http_request_origin"),
    bestEffortPhase(zoneId, "http_request_dynamic_redirect"),
    bestEffortPhase(zoneId, "http_request_transform"),
    bestEffort(`/zones/${zoneId}/settings/browser_cache_ttl`),
    bestEffort(`/zones/${zoneId}/settings/cache_level`),
    bestEffort(`/zones/${zoneId}/settings/security_level`),
    bestEffort(`/zones/${zoneId}/settings/browser_check`),
    bestEffort(`/zones/${zoneId}/settings/bot_fight_mode`),
  ]);

  const cacheRules =
    cacheEntrypoint.status === 404
      ? []
      : (cacheEntrypoint.payload?.result?.rules ?? []).map(compactRule);
  const legacyPageRules = pageRules.available && Array.isArray(pageRules.result) ? pageRules.result : [];
  const bypassIndex = cacheRules.findIndex((rule) => rule.description === RULE_DESCRIPTION);
  const bypassRule = bypassIndex >= 0 ? cacheRules[bypassIndex] : null;

  const snapshot = {
    schema_version: 1,
    captured_at: new Date().toISOString(),
    zone: {
      name: zone.name,
      status: zone.status,
      plan: zone.plan?.name ?? null,
    },
    pages: {
      project_available: project.available,
      project: project.available
        ? {
            name: project.result?.name ?? null,
            production_branch: project.result?.production_branch ?? null,
            domains: project.result?.domains ?? [],
            subdomain: project.result?.subdomain ?? null,
          }
        : { error: project.error },
      deployments: deployments.available
        ? (Array.isArray(deployments.result) ? deployments.result : [])
            .slice(0, 10)
            .map((deployment) => ({
              id: deployment.id ?? null,
              short_id: deployment.short_id ?? null,
              environment: deployment.environment ?? null,
              url: deployment.url ?? null,
              created_on: deployment.created_on ?? null,
              latest_stage: deployment.latest_stage ?? null,
              deployment_trigger: deployment.deployment_trigger
                ? {
                    type: deployment.deployment_trigger.type ?? null,
                    metadata: {
                      branch: deployment.deployment_trigger.metadata?.branch ?? null,
                      commit_hash: deployment.deployment_trigger.metadata?.commit_hash ?? null,
                    },
                  }
                : null,
            }))
        : { error: deployments.error },
    },
    dns: dns.available
      ? (Array.isArray(dns.result) ? dns.result : []).map((record) => ({
          id: record.id ?? null,
          type: record.type ?? null,
          name: record.name ?? null,
          content: record.content ?? null,
          proxied: record.proxied ?? null,
        }))
      : { error: dns.error },
    page_rules: pageRules.available ? legacyPageRules : { error: pageRules.error },
    worker_routes: workerRoutes.available ? workerRoutes.result : { error: workerRoutes.error },
    cache_rules: {
      available: cacheEntrypoint.status !== 404,
      ruleset_id: cacheEntrypoint.payload?.result?.id ?? null,
      rules: cacheRules,
      irha_bypass_rule: bypassRule,
      irha_bypass_is_last: bypassIndex >= 0 && bypassIndex === cacheRules.length - 1,
    },
    other_rulesets: {
      firewall_custom: customFirewall.available ? customFirewall.result : { error: customFirewall.error ?? "not configured" },
      firewall_managed: managedFirewall.available ? managedFirewall.result : { error: managedFirewall.error ?? "not configured" },
      config: configRules.available ? configRules.result : { error: configRules.error ?? "not configured" },
      origin: originRules.available ? originRules.result : { error: originRules.error ?? "not configured" },
      redirect: redirectRules.available ? redirectRules.result : { error: redirectRules.error ?? "not configured" },
      transform: transformRules.available ? transformRules.result : { error: transformRules.error ?? "not configured" },
    },
    zone_settings: {
      browser_cache_ttl: browserCacheTtl.available ? browserCacheTtl.result?.value ?? null : "unavailable",
      cache_level: cacheLevel.available ? cacheLevel.result?.value ?? null : "unavailable",
      security_level: securityLevel.available ? securityLevel.result?.value ?? null : "unavailable",
      browser_check: browserCheck.available ? browserCheck.result?.value ?? null : "unavailable",
      bot_fight_mode: botFightMode.available ? botFightMode.result?.value ?? null : "unavailable",
    },
    detected_cache_hazards: cacheHazards(cacheRules, legacyPageRules),
    intended_cache_bypass: {
      description: RULE_DESCRIPTION,
      expression: CACHE_BYPASS_EXPRESSION,
      action: "set_cache_settings",
      action_parameters: { cache: false },
    },
  };

  await writeFile(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    zone: snapshot.zone,
    pages_domains: snapshot.pages.project?.domains ?? [],
    cache_hazard_count: snapshot.detected_cache_hazards.length,
    bypass_present: Boolean(bypassRule),
    bypass_is_last: snapshot.cache_rules.irha_bypass_is_last,
    browser_cache_ttl: snapshot.zone_settings.browser_cache_ttl,
    cache_level: snapshot.zone_settings.cache_level,
    security_level: snapshot.zone_settings.security_level,
    browser_check: snapshot.zone_settings.browser_check,
    bot_fight_mode: snapshot.zone_settings.bot_fight_mode,
    out: outPath,
  }, null, 2)}\n`);
  return snapshot;
}

async function ensurePolicy() {
  const zone = await resolveZone();
  const zoneId = zone.id;
  let phase = await getPhaseEntrypoint(zoneId, CACHE_PHASE);

  if (phase.status === 404) {
    const created = await cf("POST", `/zones/${zoneId}/rulesets`, {
      name: "Irha zone cache settings",
      description: "Zone-level cache settings managed by the production release workflow.",
      kind: "zone",
      phase: CACHE_PHASE,
      rules: [],
    });
    phase = { status: created.status, payload: created.payload };
  }

  const rulesetId = required("cache ruleset id", phase.payload?.result?.id);
  const rules = phase.payload?.result?.rules ?? [];
  const existingIndex = rules.findIndex((rule) => rule.description === RULE_DESCRIPTION);
  const existing = existingIndex >= 0 ? rules[existingIndex] : null;
  const definition = {
    action: "set_cache_settings",
    action_parameters: { cache: false },
    expression: CACHE_BYPASS_EXPRESSION,
    description: RULE_DESCRIPTION,
    enabled: true,
  };

  let result;
  if (existing?.id) {
    const existingIsLast = existingIndex === rules.length - 1;
    result = await cf(
      "PATCH",
      `/zones/${zoneId}/rulesets/${rulesetId}/rules/${existing.id}`,
      existingIsLast ? definition : { ...definition, position: { after: "" } },
    );
  } else {
    result = await cf(
      "POST",
      `/zones/${zoneId}/rulesets/${rulesetId}/rules`,
      { ...definition, position: { after: "" } },
    );
  }

  const verified = await getPhaseEntrypoint(zoneId, CACHE_PHASE);
  const verifiedRules = verified.payload?.result?.rules ?? [];
  const index = verifiedRules.findIndex((rule) => rule.description === RULE_DESCRIPTION);
  const rule = index >= 0 ? verifiedRules[index] : null;
  if (
    !rule ||
    rule.enabled === false ||
    rule.action !== "set_cache_settings" ||
    rule.action_parameters?.cache !== false ||
    rule.expression !== CACHE_BYPASS_EXPRESSION ||
    index !== verifiedRules.length - 1
  ) {
    throw new Error("Cloudflare HTML/release identity bypass rule was not verified as the final cache rule");
  }

  process.stdout.write(`${JSON.stringify({
    changed_or_reaffirmed: true,
    rule_id: rule.id ?? result.payload?.result?.id ?? null,
    ruleset_id: rulesetId,
    is_last: true,
    expression: CACHE_BYPASS_EXPRESSION,
  }, null, 2)}\n`);
}

async function purge() {
  const zone = await resolveZone();
  const response = await cf("POST", `/zones/${zone.id}/purge_cache`, { purge_everything: true });
  const purgeId = response.payload?.result?.id ?? null;
  process.stdout.write(`${JSON.stringify({
    purge_everything: true,
    purge_id: purgeId,
    completed_at: new Date().toISOString(),
    reason: "Unknown historical HTML query-string cache keys cannot be enumerated reliably.",
  }, null, 2)}\n`);
}

function usage() {
  throw new Error(
    "Usage: node scripts/ci/cloudflare-cache-consistency.mjs audit <out.json> | ensure-policy | purge",
  );
}

const [command, argument] = process.argv.slice(2);
if (command === "audit") {
  await audit(argument || "/tmp/cloudflare-cache-consistency.json");
} else if (command === "ensure-policy") {
  await ensurePolicy();
} else if (command === "purge") {
  await purge();
} else {
  usage();
}
