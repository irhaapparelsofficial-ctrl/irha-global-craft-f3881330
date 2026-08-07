import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "supabase/functions/pinterest-operator/index.ts"), "utf8");
const helper = readFileSync(resolve(process.cwd(), "supabase/functions/pinterest-operator/pinterest.ts"), "utf8");

describe("Pinterest operator control", () => {
  it("keeps one-time operator authentication and the existing bounded actions", () => {
    expect(source).toContain('if (!/^[A-Za-z0-9_-]{40,120}$/.test(operatorToken))');
    expect(source).toContain('.eq("token_hash", tokenHash)');
    expect(source).toContain('job.action === "inventory"');
    expect(source).toContain('job.action === "update_one"');
    expect(source).toContain('job.action === "update_missing"');
    expect(source).not.toContain('job.action === "inspect_one"');
  });

  it("patches only alt text and returns safe ownership diagnostics", () => {
    expect(source).toContain('body: JSON.stringify({ alt_text: altText })');
    expect(source).toContain('board_owner_username: pin.board_owner?.username || null');
    expect(source).toContain('is_owner: typeof pin.is_owner === "boolean" ? pin.is_owner : null');
    expect(source).toContain('is_removable: typeof pin.is_removable === "boolean" ? pin.is_removable : null');
    expect(source).toContain('creative_type: pin.creative_type || null');
    expect(source).toContain('parent_pin_id: pin.parent_pin_id || null');
  });

  it("captures sanitized Pinterest API failures without returning credentials", () => {
    expect(source).toContain('api_status: status');
    expect(source).toContain('api_code: apiCode');
    expect(source).toContain('api_message: apiMessage');
    expect(source).toContain('sanitizeApiValue(record.message)');
    expect(source).not.toContain('access_token_cipher');
    expect(source).not.toContain('refresh_token_cipher');
    expect(source).not.toContain('console.log(token');
  });

  it("keeps encrypted OAuth token handling in the helper", () => {
    expect(helper).toContain('from("pinterest_oauth_credentials")');
    expect(helper).toContain('decryptSecret(data.access_token_cipher');
    expect(helper).toContain('refreshAccessToken(refreshToken)');
    expect(helper).not.toContain('console.log');
  });
});
