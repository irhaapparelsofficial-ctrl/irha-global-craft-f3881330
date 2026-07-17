import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("taxonomy owner review workspace", () => {
  it("reads the explicit hierarchy and product assignments without using the legacy category table", () => {
    const panel = read("src/components/admin/TaxonomyOwnerReviewPanel.tsx");
    expect(panel).toContain('from("catalog_taxonomy_nodes")');
    expect(panel).toContain('from("product_taxonomy_assignments")');
    expect(panel).toContain('from("products")');
    expect(panel).toContain("Main Category → Audience → Product Type");
  });

  it("supports one-record owner review decisions but exposes no public publish action", () => {
    const panel = read("src/components/admin/TaxonomyOwnerReviewPanel.tsx");
    expect(panel).toContain('.eq("id", node.id)');
    expect(panel).toContain('.eq("product_id", assignment.product_id)');
    expect(panel).toContain("window.confirm(");
    expect(panel).toContain('nextState === "approved"');
    expect(panel).toContain('publish_state: nextState');
    expect(panel).not.toContain('publish_state: "published"');
    expect(panel).not.toContain("Approve all");
    expect(panel).not.toContain("Publish hierarchy");
  });

  it("states that publication remains a separate controlled release", () => {
    const panel = read("src/components/admin/TaxonomyOwnerReviewPanel.tsx");
    expect(panel).toContain("Public cutover stays blocked");
    expect(panel).toContain("There is no publish button in this workspace.");
    expect(panel).toContain("Public release is still a separate controlled step.");
  });

  it("is mounted inside the catalog release workspace", () => {
    const release = read("src/components/admin/CatalogReleaseStatus.tsx");
    expect(release).toContain('import TaxonomyOwnerReviewPanel from "@/components/admin/TaxonomyOwnerReviewPanel"');
    expect(release).toContain("<TaxonomyOwnerReviewPanel />");
    expect(release).toContain("Explicit catalogue hierarchy review");
  });
});
