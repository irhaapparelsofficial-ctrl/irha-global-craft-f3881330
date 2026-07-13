import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const DIST_DIR = resolve("dist");
const SITE_URL = "https://irhaapparels.com";

const REDIRECTS = [
  { from: "/buyer-trust-center", to: "/buyer-trust" },
  { from: "/buyer-trust-centre", to: "/buyer-trust" },
  { from: "/buyer-resources", to: "/resources" },
  { from: "/buyer-faq", to: "/faq" },
  { from: "/shipping-returns", to: "/resources#shipping-questions", canonical: "/resources" },
  {
    from: "/products/d22ac15e-d657-4a4c-804c-fb8697ceb050/plush-bathrobe-sleep-robe",
    to: "/products/leisure-nightwear/plush-bathrobe-sleep-robe",
  },
] as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function documentFor(from: string, to: string, canonicalPath = to): string {
  const absoluteTarget = `${SITE_URL}${to}`;
  const absoluteCanonical = `${SITE_URL}${canonicalPath.split("#")[0]}`;
  const scriptTarget = JSON.stringify(to).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Redirecting | Irha Apparels</title>
    <meta name="robots" content="noindex,follow" />
    <link rel="canonical" href="${escapeHtml(absoluteCanonical)}" />
    <meta http-equiv="refresh" content="0;url=${escapeHtml(absoluteTarget)}" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; object-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'none'" />
    <script>window.location.replace(${scriptTarget});</script>
  </head>
  <body style="background:#0a0a0a;color:#f5f1e8;font-family:Arial,sans-serif;padding:48px 24px">
    <main style="max-width:760px;margin:0 auto">
      <p style="color:#c9a45c;letter-spacing:.16em;text-transform:uppercase;font-size:12px">Irha Apparels</p>
      <h1>Page moved</h1>
      <p>This older address has moved to the current verified page.</p>
      <p><a href="${escapeHtml(to)}" style="color:#e8c477">Continue to the current page</a></p>
      <small data-irha-static-redirect="${escapeHtml(from)}">Redirect target: ${escapeHtml(to)}</small>
    </main>
  </body>
</html>`;
}

async function main() {
  await readFile(join(DIST_DIR, "index.html"), "utf8");

  for (const redirect of REDIRECTS) {
    const outputPath = join(DIST_DIR, redirect.from.slice(1), "index.html");
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(
      outputPath,
      documentFor(redirect.from, redirect.to, "canonical" in redirect ? redirect.canonical : redirect.to),
      "utf8",
    );

    const output = await readFile(outputPath, "utf8");
    if (!output.includes(`data-irha-static-redirect="${redirect.from}"`)) {
      throw new Error(`Static redirect marker is missing for ${redirect.from}`);
    }
    if (!output.includes('name="robots" content="noindex,follow"')) {
      throw new Error(`Static redirect noindex guard is missing for ${redirect.from}`);
    }
  }

  console.log(`Generated ${REDIRECTS.length} static legacy redirect documents`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
