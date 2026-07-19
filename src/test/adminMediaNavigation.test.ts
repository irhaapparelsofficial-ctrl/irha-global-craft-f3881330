import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

/**
 * Media Library must remain reachable from the primary website-operations
 * admin navigation and the Admin router.
 */
describe("admin Media Library navigation", () => {
  it("exposes Media Library in primary nav, search and the page router", () => {
    const shell = source("src/components/admin/AdminShell.tsx");
    const admin = source("src/pages/Admin.tsx");

    expect(shell).toContain('key: "media", label: "Media Library"');
    expect(admin).toContain('import MediaLibraryPanel from "@/components/admin/MediaLibraryPanel";');
    expect(admin).toContain('case "media": return <MediaLibraryPanel />;');
  });
});
