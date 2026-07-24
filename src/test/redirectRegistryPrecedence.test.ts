import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("buyer-ready redirect source precedence", () => {
  it("lets the current approved registry update historical generated rows", () => {
    const source = readFileSync(
      resolve("scripts/generate-buyer-ready-redirects.ts"),
      "utf8",
    );
    const committed = source.indexOf("committedRows.forEach(add)");
    const approved = source.indexOf("approvedRows.forEach(add)");

    expect(committed).toBeGreaterThan(-1);
    expect(approved).toBeGreaterThan(committed);
  });

  it("keeps reviewed static aliases fail-closed against generated conflicts", () => {
    const source = readFileSync(
      resolve("scripts/generate-buyer-ready-redirects.ts"),
      "utf8",
    );

    expect(source).toContain("Static/generated redirect conflict");
    expect(source).toContain("staticRedirects.get(from)");
    expect(source).not.toContain("console.warn");
  });
});
