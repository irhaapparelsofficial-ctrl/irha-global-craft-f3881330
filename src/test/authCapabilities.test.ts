import { describe, expect, it } from "vitest";
import {
  buildAuthRedirect,
  friendlyAuthError,
  isRecoveryLocation,
  parseAuthSettings,
} from "@/lib/authCapabilities";
import { isOwnerEmail, OWNER_EMAIL } from "@/config/ownerIdentity";

describe("auth capabilities", () => {
  it("reads public Supabase provider settings truthfully", () => {
    const capabilities = parseAuthSettings({
      disable_signup: true,
      mailer_autoconfirm: false,
      external: { email: false, google: true },
    });
    expect(capabilities.status).toBe("ready");
    expect(capabilities.emailEnabled).toBe(false);
    expect(capabilities.googleEnabled).toBe(true);
    expect(capabilities.signupDisabled).toBe(true);
  });

  it("does not assume providers when settings are incomplete", () => {
    const capabilities = parseAuthSettings({ external: {} });
    expect(capabilities.emailEnabled).toBe(false);
    expect(capabilities.googleEnabled).toBe(false);
    expect(capabilities.signupDisabled).toBeNull();
  });

  it("rejects malformed settings payloads", () => {
    expect(() => parseAuthSettings(null)).toThrow(/invalid response/i);
  });

  it("creates only same-origin secure auth redirects", () => {
    expect(buildAuthRedirect("https://irhaapparels.com/path?ignored=1", "/auth?mode=recovery"))
      .toBe("https://irhaapparels.com/auth?mode=recovery");
    expect(buildAuthRedirect("http://localhost:5173", "/admin"))
      .toBe("http://localhost:5173/admin");
    expect(() => buildAuthRedirect("http://example.com", "/auth")).toThrow(/HTTPS/);
  });

  it("recognizes recovery mode in query or auth fragment", () => {
    expect(isRecoveryLocation("?mode=recovery", "")).toBe(true);
    expect(isRecoveryLocation("", "#type=recovery&access_token=redacted")).toBe(true);
    expect(isRecoveryLocation("?mode=login", "")).toBe(false);
  });

  it("maps known provider failures without exposing raw backend errors", () => {
    expect(friendlyAuthError(new Error("Email logins are disabled"), "password")).toMatch(/disabled/i);
    expect(friendlyAuthError(new Error("Unsupported provider: missing OAuth secret"), "google")).toMatch(/not fully configured/i);
    expect(friendlyAuthError(new Error("Invalid login credentials"), "password")).toMatch(/not accepted/i);
  });

  it("matches only the exact normalized owner email", () => {
    expect(isOwnerEmail(`  ${OWNER_EMAIL.toUpperCase()} `)).toBe(true);
    expect(isOwnerEmail("another@example.com")).toBe(false);
    expect(isOwnerEmail(null)).toBe(false);
  });
});
