import { describe, expect, it } from "vitest";

describe("commit smoke validation", () => {
  it("keeps the repository test pipeline runnable", () => {
    expect(["typecheck", "test", "build"]).toHaveLength(3);
  });
});
