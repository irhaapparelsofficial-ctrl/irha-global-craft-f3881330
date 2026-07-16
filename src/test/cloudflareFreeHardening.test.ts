import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/cloudflare-free-zone-hardening.yml"),
  "utf8",
);

describe("Cloudflare free zone hardening", () => {
  it("is owner-only and applies only the three exact free settings", () => {
    expect(workflow).toContain("/harden-cloudflare-free-zone");
    expect(workflow).toContain("github.event.comment.user.login == 'irhaapparelsofficial-ctrl'");
    expect(workflow).toContain("set_setting ssl strict");
    expect(workflow).toContain("set_setting always_use_https on");
    expect(workflow).toContain("set_setting automatic_https_rewrites on");
  });

  it("keeps risky or unrelated controls read-only", () => {
    expect(workflow).toContain('api GET "/zones/$zone_id/dnssec"');
    expect(workflow).toContain("DNS records changed: `false`");
    expect(workflow).toContain("HSTS changed: `false`");
    expect(workflow).toContain("Cache rules changed: `false`");
    expect(workflow).not.toContain("api PATCH \"/zones/$zone_id/dnssec");
    expect(workflow).not.toContain("set_setting security_header");
    expect(workflow).not.toContain("set_setting cache");
  });
});
