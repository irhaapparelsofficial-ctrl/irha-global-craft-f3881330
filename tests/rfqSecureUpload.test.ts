import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("quick RFQ secure upload", () => {
  it("uploads buyer files through the public lead gateway", () => {
    const form = read("src/components/QuoteForm.tsx");
    expect(form).toContain("uploadPublicLeadFile");
    expect(form).toContain("Tech pack / reference files");
    expect(form).toContain("MAX_FILES = 3");
    expect(form).toContain("files: uploadedFiles");
    expect(form).toContain("uploaded_file_count: uploadedFiles.length");
  });

  it("keeps retry submissions idempotent and reuses completed uploads", () => {
    const form = read("src/components/QuoteForm.tsx");
    expect(form).toContain("inquiry_ref: inquiryRef.current");
    expect(form).toContain("submittingRef.current");
    expect(form).toContain("uploadedFilesRef.current.get(key)");
    expect(form).toContain("uploadedFilesRef.current.set(key, stored)");
  });

  it("does not force a WhatsApp redirect", () => {
    const form = read("src/components/QuoteForm.tsx");
    expect(form).toContain("Optional WhatsApp follow-up");
    expect(form).not.toContain("window.open(");
  });
});
