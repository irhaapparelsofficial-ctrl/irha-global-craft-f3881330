import { describe, expect, it } from "vitest";
import {
  isDeferredBackendError,
  isExpectedGatewayProbe,
  redactRuntimeMessage,
  validateRuntimeIdentity,
} from "@/lib/runtimeSafety";

describe("runtime safety", () => {
  it("accepts a matching HTTPS Supabase identity", () => {
    expect(validateRuntimeIdentity({
      projectId: "pvzjiozismyxqrzmtfbi",
      url: "https://pvzjiozismyxqrzmtfbi.supabase.co",
    })).toEqual([]);
  });

  it("rejects mismatched or unsafe runtime identities", () => {
    expect(validateRuntimeIdentity({ projectId: "short", url: "http://example.com/path" }).join(" "))
      .toMatch(/project ID|HTTPS|match|path/i);
  });

  it("redacts tokens and sensitive query values", () => {
    const message = redactRuntimeMessage("Bearer abc.def.ghi?token=secret-value sb_secret_example");
    expect(message).not.toContain("abc.def.ghi");
    expect(message).not.toContain("secret-value");
    expect(message).not.toContain("sb_secret_example");
    expect(message).toContain("[redacted]");
  });

  it("classifies deferred backend errors without hiding other failures", () => {
    expect(isDeferredBackendError("Edge Function not found")).toBe(true);
    expect(isDeferredBackendError("relation does not exist")).toBe(true);
    expect(isDeferredBackendError("permission denied for table inquiries")).toBe(false);
  });

  it("accepts only the non-writing invalid-action gateway contract", () => {
    expect(isExpectedGatewayProbe(400, "Unsupported action")).toBe(true);
    expect(isExpectedGatewayProbe(200, "ok")).toBe(false);
    expect(isExpectedGatewayProbe(500, "Unsupported action")).toBe(false);
  });
});
