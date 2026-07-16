import { normalizeCommitSha } from "./release-identity";

const EXPLICIT_SOURCE_KEYS = ["SOURCE_COMMIT_SHA", "SOURCE_SHA"] as const;
const PROVIDER_EVENT_KEYS = [
  "GITHUB_SHA",
  "CF_PAGES_COMMIT_SHA",
  "VERCEL_GIT_COMMIT_SHA",
  "LOVABLE_GIT_COMMIT_SHA",
] as const;

export function preferExplicitSourceIdentity(
  env: Record<string, string | undefined> = process.env,
): Record<string, string | undefined> {
  const explicitSource = EXPLICIT_SOURCE_KEYS
    .map((key) => normalizeCommitSha(env[key]))
    .find((value): value is string => Boolean(value));

  if (!explicitSource) return env;

  const resolved = { ...env, SOURCE_COMMIT_SHA: explicitSource };
  for (const key of PROVIDER_EVENT_KEYS) {
    resolved[key] = undefined;
  }
  return resolved;
}
