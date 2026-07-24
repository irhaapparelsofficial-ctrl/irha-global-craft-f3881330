import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const PREVIEW_URL = (process.env.PREVIEW_URL || "").replace(/\/$/, "");
const EXPECTED_SOURCE_SHA = process.env.EXPECTED_SOURCE_SHA || "";
const OUTPUT_DIR = process.env.CRAWL_OUTPUT_DIR || "artifacts/preview-route-parity";
const MAX_ROUNDS = 24;
const ROUND_DELAY_MS = 10_000;
const REQUEST_TIMEOUT_MS = 20_000;
const CONCURRENCY = 24;

export function isTransientCloudflareDeploymentNotFound(status: number, body: string): boolean {
  return status === 404
    && /<title>\s*Deployment Not Found\s*<\/title>/i.test(body)
    && /Nothing is here yet/i.test(body);
}

export function sitemapPaths(xml: string): string[] {
  const paths = new Set<string>();
  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
    const value = match[1].replace(/&amp;/g, "&");
    const path = new URL(value).pathname.replace(/\/+$/, "") || "/";
    paths.add(path);
  }
  return [...paths].sort();
}

async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      output[index] = await worker(items[index]);
    }
  }));
  return output;
}

async function probe(path: string, round: number) {
  const url = new URL(path, `${PREVIEW_URL}/`);
  url.searchParams.set("preview_propagation", `${EXPECTED_SOURCE_SHA.slice(0, 12)}-${round}`);
  try {
    const response = await fetch(url, {
      redirect: "manual",
      headers: {
        "Cache-Control": "no-cache",
        "User-Agent": "IrhaPreviewPropagation/1.0 (+https://irhaapparels.com)",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = await response.text();
    if (response.status === 200) return { path, ready: true, reason: "200" };
    if (isTransientCloudflareDeploymentNotFound(response.status, body)) {
      return { path, ready: false, reason: "cloudflare-deployment-not-found" };
    }
    throw new Error(`${path} returned unexpected ${response.status}: ${body.slice(0, 180).replace(/\s+/g, " ")}`);
  } catch (error) {
    if (error instanceof Error && /returned unexpected/.test(error.message)) throw error;
    return { path, ready: false, reason: `network:${error instanceof Error ? error.message : String(error)}` };
  }
}

async function main() {
  if (!PREVIEW_URL || !/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.pages\.dev$/i.test(PREVIEW_URL)) {
    throw new Error(`Immutable PREVIEW_URL is missing or invalid: ${PREVIEW_URL || "missing"}`);
  }
  if (!EXPECTED_SOURCE_SHA || !/^[0-9a-f]{40}$/i.test(EXPECTED_SOURCE_SHA)) {
    throw new Error("EXPECTED_SOURCE_SHA must be the exact 40-character preview source commit");
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const paths = sitemapPaths(await readFile("dist/sitemap.xml", "utf8"));
  if (paths.length < 400) throw new Error(`Preview propagation inventory is unexpectedly small: ${paths.length}`);

  let pending = new Set(paths);
  let transientResponses = 0;
  let completedRound = 0;
  const reasons = new Map<string, string>();

  for (let round = 1; round <= MAX_ROUNDS && pending.size; round += 1) {
    completedRound = round;
    const results = await mapLimit([...pending], CONCURRENCY, (path) => probe(path, round));
    pending = new Set<string>();
    for (const result of results) {
      if (!result.ready) {
        pending.add(result.path);
        reasons.set(result.path, result.reason);
        if (result.reason === "cloudflare-deployment-not-found") transientResponses += 1;
      } else {
        reasons.delete(result.path);
      }
    }

    console.log(`[preview-propagation] round ${round}/${MAX_ROUNDS}: ${paths.length - pending.size}/${paths.length} canonical routes ready`);
    if (!pending.size) break;
    console.log(`[preview-propagation] pending sample: ${[...pending].slice(0, 12).map((path) => `${path} (${reasons.get(path)})`).join(", ")}`);
    await new Promise((resolve) => setTimeout(resolve, ROUND_DELAY_MS));
  }

  const evidence = {
    schemaVersion: 1,
    previewUrl: PREVIEW_URL,
    sourceCommit: EXPECTED_SOURCE_SHA,
    routeCount: paths.length,
    rounds: completedRound,
    transientDeploymentNotFoundResponses: transientResponses,
    pendingCount: pending.size,
    pending: [...pending].map((path) => ({ path, reason: reasons.get(path) || "unknown" })),
    completedAt: new Date().toISOString(),
  };
  await writeFile(`${OUTPUT_DIR}/preview-propagation.json`, `${JSON.stringify(evidence, null, 2)}\n`);

  if (pending.size) {
    throw new Error(`Immutable preview did not fully propagate after ${MAX_ROUNDS} rounds; ${pending.size} canonical routes remain unavailable`);
  }
  console.log(`[preview-propagation] all ${paths.length} canonical routes are available on the immutable deployment URL`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  main().catch(async (error) => {
    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(`${OUTPUT_DIR}/preview-propagation-error.txt`, `${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    console.error(error);
    process.exit(1);
  });
}
