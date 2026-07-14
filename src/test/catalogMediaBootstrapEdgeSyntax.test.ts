import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as ts from "typescript";
import { describe, expect, it } from "vitest";

function syntaxErrors(relativePath: string) {
  const filePath = resolve(process.cwd(), relativePath);
  const source = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const result = ts.transpileModule(source, {
    fileName: filePath,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  return (result.diagnostics ?? [])
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    .map((diagnostic) => {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      if (diagnostic.start === undefined) return message;
      const position = sourceFile.getLineAndCharacterOfPosition(diagnostic.start);
      return `${position.line + 1}:${position.character + 1} ${message}`;
    });
}

describe("catalog media bootstrap Edge Function", () => {
  it("has no TypeScript syntax diagnostics before Supabase bundling", () => {
    expect(syntaxErrors("supabase/functions/catalog-media-bootstrap/index.ts")).toEqual([]);
  });

  it("keeps imported catalog assets owner-approval gated", () => {
    const source = readFileSync(resolve(process.cwd(), "supabase/functions/catalog-media-bootstrap/index.ts"), "utf8");
    expect(source).toContain('verification_status: "verified"');
    expect(source).toContain("social_approved: false");
    expect(source).toContain('action === "approve_batch"');
    expect(source).not.toContain("publish_items");
  });
});

describe("social autopilot renderer health", () => {
  it("uses the same production secret names as the render worker", () => {
    const source = readFileSync(resolve(process.cwd(), "supabase/functions/social-autopilot/index.ts"), "utf8");
    expect(source).toContain('Deno.env.get("SOCIAL_RENDER_PROVIDER_URL")');
    expect(source).toContain('Deno.env.get("SOCIAL_RENDER_PROVIDER_KEY")');
    expect(source).toContain('Deno.env.get("SOCIAL_RENDER_CALLBACK_SECRET")');
    expect(source).not.toContain('Deno.env.get("SOCIAL_RENDER_API_URL")');
    expect(source).not.toContain('Deno.env.get("SOCIAL_RENDER_API_KEY")');
  });
});
