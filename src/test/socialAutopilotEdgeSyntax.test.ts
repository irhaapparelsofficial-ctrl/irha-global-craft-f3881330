import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as ts from "typescript";
import { describe, expect, it } from "vitest";

describe("social-autopilot Edge Function source", () => {
  it("has no TypeScript syntax diagnostics before Supabase bundling", () => {
    const filePath = resolve(process.cwd(), "supabase/functions/social-autopilot/index.ts");
    const source = readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
    const result = ts.transpileModule(source, {
      fileName: filePath,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    });

    const errors = (result.diagnostics ?? [])
      .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
      .map((diagnostic) => {
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        if (diagnostic.start === undefined) return message;
        const position = sourceFile.getLineAndCharacterOfPosition(diagnostic.start);
        return `${position.line + 1}:${position.character + 1} ${message}`;
      });

    expect(errors).toEqual([]);
  });
});
