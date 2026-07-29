import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  OWNER_SUPABASE_PUBLISHABLE_KEY,
  OWNER_SUPABASE_URL,
} from "../src/integrations/supabase/ownerRuntime";

const DIST_DIR = resolve("dist");
const MANIFEST_PATH = join(DIST_DIR, "seo-route-manifest.json");
const EVIDENCE_PATH = join(DIST_DIR, "seo-evidence", "build-seo-acceptance.json");
const AUTHORITATIVE_SCHEMA_PATTERN = /<script\b[^>]*data-irha-authoritative-seo="true"[^>]*>([\s\S]*?)<\/script>/i;

type ManifestRoute = {
  path: string;
  routeType: string;
};

type Manifest = {
  blogArticleCount: number;
  routes: ManifestRoute[];
};

type BlogPost = {
  slug: string;
  published_at: string | null;
  updated_at: string;
};

type JsonObject = Record<string, unknown>;

function routeHtmlPath(path: string): string {
  return path === "/" ? join(DIST_DIR, "index.html") : join(DIST_DIR, path.slice(1), "index.html");
}

async function fetchPublishedPosts(): Promise<BlogPost[]> {
  const fields = "slug,published_at,updated_at";
  const url = `${OWNER_SUPABASE_URL}/rest/v1/blog_posts?select=${encodeURIComponent(fields)}&is_published=eq.true&order=sort_order.asc,updated_at.desc`;
  const response = await fetch(url, {
    headers: {
      apikey: OWNER_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${OWNER_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Could not fetch verified article dates: ${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<BlogPost[]>;
}

function findArticle(value: unknown): JsonObject | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findArticle(item);
      if (match) return match;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as JsonObject;
  const type = record["@type"];
  if (type === "Article" || type === "BlogPosting") return record;
  for (const child of Object.values(record)) {
    const match = findArticle(child);
    if (match) return match;
  }
  return null;
}

function updateArticleSchema(route: ManifestRoute, post: BlogPost) {
  if (!post.published_at) throw new Error(`Published article has no published_at value: ${post.slug}`);
  const htmlPath = routeHtmlPath(route.path);
  const html = readFileSync(htmlPath, "utf8");
  const match = html.match(AUTHORITATIVE_SCHEMA_PATTERN);
  if (!match) throw new Error(`Authoritative JSON-LD is missing for ${route.path}`);

  const schema = JSON.parse(match[1]) as unknown;
  const article = findArticle(schema);
  if (!article) throw new Error(`Article JSON-LD is missing for ${route.path}`);
  article.datePublished = post.published_at;
  article.dateModified = post.updated_at;

  const serialized = JSON.stringify(schema).replace(/</g, "\\u003c");
  const output = html.replace(AUTHORITATIVE_SCHEMA_PATTERN, (block) => block.replace(match[1], serialized));
  writeFileSync(htmlPath, output);

  const verified = JSON.parse(serialized) as unknown;
  const verifiedArticle = findArticle(verified);
  if (verifiedArticle?.datePublished !== post.published_at || verifiedArticle?.dateModified !== post.updated_at) {
    throw new Error(`Article dates did not persist for ${route.path}`);
  }
}

async function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
  const articleRoutes = manifest.routes.filter((route) => route.routeType === "resource-article");
  const posts = await fetchPublishedPosts();
  const postBySlug = new Map(posts.map((post) => [post.slug, post]));

  if (articleRoutes.length !== manifest.blogArticleCount || posts.length !== manifest.blogArticleCount) {
    throw new Error(`Article inventory mismatch: manifest routes ${articleRoutes.length}, manifest count ${manifest.blogArticleCount}, published posts ${posts.length}`);
  }

  for (const route of articleRoutes) {
    const slug = route.path.split("/").filter(Boolean).at(-1);
    const post = slug ? postBySlug.get(slug) : undefined;
    if (!post) throw new Error(`No published post record for ${route.path}`);
    updateArticleSchema(route, post);
  }

  const evidence = JSON.parse(readFileSync(EVIDENCE_PATH, "utf8")) as JsonObject;
  evidence.articleDatePublishedCount = articleRoutes.length;
  evidence.articleDatePublishedErrors = 0;
  writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Sealed verified datePublished/dateModified values for ${articleRoutes.length} article routes`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
