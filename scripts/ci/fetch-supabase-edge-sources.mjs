import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectId = process.env.SUPABASE_PROJECT_ID?.trim();
const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const planPath = resolve(
  process.cwd(),
  process.env.SEC_M03_PARITY_REFRESH_PLAN ||
    "supabase/reconciliation/sec-m03-parity-refresh.json",
);
const outputDirectory = resolve(
  process.env.SEC_M03_LIVE_FUNCTION_DIRECTORY ||
    "/tmp/sec-m03-live-functions",
);

if (!projectId) throw new Error("SUPABASE_PROJECT_ID is required");
if (!accessToken) throw new Error("SUPABASE_ACCESS_TOKEN is required");

const plan = JSON.parse(await readFile(planPath, "utf8"));
if (plan.project_id !== projectId || !Array.isArray(plan.functions)) {
  throw new Error("Parity refresh plan identity is invalid");
}

await mkdir(outputDirectory, { recursive: true });
const baseUrl = `https://api.supabase.com/v1/projects/${projectId}/functions`;
const headers = { Authorization: `Bearer ${accessToken}` };

for (const entry of plan.functions) {
  const functionName = entry?.name;
  if (typeof functionName !== "string" || functionName.length === 0) {
    throw new Error("Parity refresh plan contains an invalid function name");
  }

  const metadataResponse = await fetch(`${baseUrl}/${functionName}`, {
    headers: { ...headers, "Content-Type": "application/json" },
  });
  if (!metadataResponse.ok) {
    throw new Error(
      `Failed to fetch metadata for ${functionName}: ${metadataResponse.status}`,
    );
  }
  const metadata = await metadataResponse.json();

  const bodyResponse = await fetch(`${baseUrl}/${functionName}/body`, {
    headers: { ...headers, Accept: "multipart/form-data" },
  });
  if (!bodyResponse.ok) {
    throw new Error(
      `Failed to fetch source body for ${functionName}: ${bodyResponse.status}`,
    );
  }
  const contentType = bodyResponse.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    throw new Error(
      `Unexpected source content type for ${functionName}: ${contentType || "missing"}`,
    );
  }

  const formData = await bodyResponse.formData();
  const files = [];
  for (const [fieldName, value] of formData.entries()) {
    if (typeof value === "string") continue;
    const filename = value.name || fieldName;
    files.push({ name: filename, content: await value.text() });
  }
  if (files.length === 0) {
    throw new Error(`No source files returned for ${functionName}`);
  }
  files.sort((left, right) => left.name.localeCompare(right.name));

  const output = {
    ...metadata,
    files,
  };
  await writeFile(
    resolve(outputDirectory, `${functionName}.json`),
    `${JSON.stringify(output, null, 2)}\n`,
    "utf8",
  );
}

console.log(
  `Fetched authenticated metadata and multipart source for ${plan.functions.length} functions.`,
);
