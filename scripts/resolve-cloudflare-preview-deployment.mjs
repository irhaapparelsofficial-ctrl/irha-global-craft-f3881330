import { appendFile } from "node:fs/promises";

const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const project = process.env.CLOUDFLARE_PROJECT_NAME?.trim();
const branch = process.env.PREVIEW_BRANCH?.trim();
const sourceSha = process.env.GITHUB_SHA?.trim();
const envFile = process.env.GITHUB_ENV;
const aliasUrl = process.env.PREVIEW_URL?.trim();
const maxAttempts = Number.parseInt(process.env.PREVIEW_RESOLVE_ATTEMPTS ?? "24", 10);
const fixedDelayMs = Number.parseInt(process.env.PREVIEW_RESOLVE_DELAY_MS ?? "0", 10);

for (const [name, value] of Object.entries({ token, accountId, project, branch, sourceSha, envFile, aliasUrl })) {
  if (!value) throw new Error(`Missing required preview deployment input: ${name}`);
}
if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 240) {
  throw new Error(`PREVIEW_RESOLVE_ATTEMPTS must be an integer from 1 to 240, got ${process.env.PREVIEW_RESOLVE_ATTEMPTS}`);
}
if (!Number.isInteger(fixedDelayMs) || fixedDelayMs < 0 || fixedDelayMs > 30_000) {
  throw new Error(`PREVIEW_RESOLVE_DELAY_MS must be an integer from 0 to 30000, got ${process.env.PREVIEW_RESOLVE_DELAY_MS}`);
}

const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${project}/deployments?env=preview`;
let resolved = "";
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Cloudflare deployments API failed: ${response.status} ${await response.text()}`);
  const payload = await response.json();
  if (payload?.success !== true || !Array.isArray(payload?.result)) {
    throw new Error("Cloudflare deployments API returned an invalid payload");
  }
  const deployment = payload.result.find((item) => {
    const metadata = item?.deployment_trigger?.metadata ?? {};
    return metadata.branch === branch && metadata.commit_hash === sourceSha;
  });
  if (deployment?.url) {
    resolved = String(deployment.url).replace(/\/$/, "");
    break;
  }
  if (attempt < maxAttempts) {
    const delayMs = fixedDelayMs > 0 ? fixedDelayMs : attempt * 500;
    console.log(`Exact preview deployment pending for ${branch}@${sourceSha} (attempt ${attempt}/${maxAttempts})`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

if (!resolved) throw new Error(`Could not resolve exact Cloudflare preview deployment for ${branch}@${sourceSha}`);
const url = new URL(resolved);
if (url.protocol !== "https:" || !url.hostname.endsWith(`.${project}.pages.dev`)) {
  throw new Error(`Resolved preview URL has an unexpected project identity: ${resolved}`);
}
if (resolved === aliasUrl) {
  throw new Error("Exact preview resolution returned the mutable branch alias instead of an immutable deployment URL");
}

await appendFile(envFile, [
  `PREVIEW_ALIAS_URL=${aliasUrl}`,
  `PREVIEW_URL=${resolved}`,
  `CRAWL_ORIGIN=${resolved}`,
  "",
].join("\n"));
console.log(`Resolved immutable Cloudflare preview deployment: ${url.hostname}`);
