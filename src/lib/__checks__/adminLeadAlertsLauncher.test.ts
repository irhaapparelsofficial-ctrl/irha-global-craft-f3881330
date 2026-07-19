import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

/**
 * The buyer-actions launcher (CRM lead alerts + duplicate review) is legacy
 * CRM tooling. The primary website-operations admin no longer mounts it, but
 * the component stays in the repo for rollback/history. This contract now
 * asserts (a) AdminRuntime remains admin-only and (b) the launcher component
 * is preserved so rollback is possible.
 */
describe("admin lead alerts launcher (legacy, retained for rollback)", () => {
  it("keeps AdminRuntime admin-only and does not mount buyer-actions in the primary path", () => {
    const app = read("src/App.tsx");
    const runtime = read("src/components/admin/AdminRuntime.tsx");
    const main = read("src/main.tsx");

    expect(app).toContain('const AdminRuntime = lazy(() => import("@/components/admin/AdminRuntime"))');
    expect(app).toContain('if (!pathname.startsWith("/admin")) return null');
    expect(runtime).not.toContain("<AdminBuyerActionsLauncher />");
    expect(main).not.toContain("AdminBuyerActionsLauncher");
  });

  it("preserves the buyer-actions launcher component for rollback", () => {
    const launcher = read("src/components/admin/AdminBuyerActionsLauncher.tsx");
    expect(launcher).toContain('import LeadEngineAlertsPanel from "@/components/admin/LeadEngineAlertsPanel"');
    expect(launcher).toContain("Lead Alerts");
    expect(launcher).toContain("<LeadEngineAlertsPanel />");
    expect(launcher).toContain('aria-label="Lead alerts and duplicate review"');
    expect(launcher).toContain('.eq("role", "admin")');
    expect(launcher).toContain('event.key === "Escape"');
  });
});
