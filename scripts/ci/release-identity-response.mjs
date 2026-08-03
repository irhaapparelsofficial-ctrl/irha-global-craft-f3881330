export function classifyBuildIdentityResponse({
  status,
  body,
  headers = "",
  expectedSha,
  expectedFingerprint,
  allowChallenge = false,
}) {
  const normalizedStatus = Number(status);
  const headerText = String(headers || "");
  const bodyText = String(body || "");
  const explicitChallenge = normalizedStatus === 403 && (
    /^cf-mitigated:\s*challenge\s*$/im.test(headerText) ||
    (/^server:\s*cloudflare\s*$/im.test(headerText) && bodyText.includes("Just a moment..."))
  );

  if (explicitChallenge) {
    return allowChallenge
      ? { ok: true, classification: "challenge-limited", reason: null }
      : { ok: false, classification: "challenge", reason: "challenge-not-allowed" };
  }

  if (normalizedStatus !== 200) {
    return { ok: false, classification: "http-failure", reason: `status-${normalizedStatus}` };
  }

  let payload;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return { ok: false, classification: "invalid-json", reason: "invalid-json" };
  }

  if (payload?.source_commit !== expectedSha) {
    return { ok: false, classification: "stale-or-wrong-release", reason: "wrong-sha" };
  }
  if (payload?.source_identity_state !== "verified") {
    return { ok: false, classification: "invalid-release-state", reason: "identity-not-verified" };
  }
  if (payload?.build_fingerprint !== expectedFingerprint) {
    return { ok: false, classification: "stale-or-wrong-release", reason: "wrong-fingerprint" };
  }

  return { ok: true, classification: "exact-release", reason: null };
}
