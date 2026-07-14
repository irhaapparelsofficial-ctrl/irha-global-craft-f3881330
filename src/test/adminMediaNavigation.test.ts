import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("admin Media Library navigation", () => {
  it("exposes Media Library in desktop search, mobile Products group, and the page router", () => {
    const shell = source("src/components/admin/AdminShell.tsx");
    const admin = source("src/pages/Admin.tsx");

    expect(shell).toContain('| "products" | "media" | "categories" | "catalogues"');
    expect(shell).toContain('key: "media", label: "Media Library"');
    expect(shell).toContain('views: ["products", "media", "categories", "catalogues"]');
    expect(admin).toContain('import MediaLibraryPanel from "@/components/admin/MediaLibraryPanel";');
    expect(admin).toContain('case "media": return <MediaLibraryPanel />;');
  });
});
