import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("admin lead alerts launcher", () => {
  it("keeps the admin launcher mounted through the admin-only runtime", () => {
    const app = read("src/App.tsx");
    const runtime = read("src/components/admin/AdminRuntime.tsx");
    const main = read("src/main.tsx");

    expect(app).toContain('const AdminRuntime = lazy(() => import("@/components/admin/AdminRuntime"))');
    expect(app).toContain('if (!pathname.startsWith("/admin")) return null');
    expect(runtime).toContain('import AdminBuyerActionsLauncher from "@/components/admin/AdminBuyerActionsLauncher"');
    expect(runtime).toContain("<AdminBuyerActionsLauncher />");
    expect(main).not.toContain("AdminBuyerActionsLauncher");
  });

  it("exposes lead alerts without changing admin routing", () => {
    const launcher = read("src/components/admin/AdminBuyerActionsLauncher.tsx");
    expect(launcher).toContain('import LeadEngineAlertsPanel from "@/components/admin/LeadEngineAlertsPanel"');
    expect(launcher).toContain("Lead Alerts");
    expect(launcher).toContain("<LeadEngineAlertsPanel />");
    expect(launcher).toContain('aria-label="Lead alerts and duplicate review"');
  });

  it("keeps admin verification and escape-close behavior", () => {
    const launcher = read("src/components/admin/AdminBuyerActionsLauncher.tsx");
    expect(launcher).toContain('.eq("role", "admin")');
    expect(launcher).toContain('event.key === "Escape"');
    expect(launcher).toContain("setAlertsOpen(false)");
    expect(launcher).toContain("setOpen(false)");
  });
});
