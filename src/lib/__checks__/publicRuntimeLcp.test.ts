import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const mainSource = readFileSync("src/main.tsx", "utf8");
const appSource = readFileSync("src/App.tsx", "utf8");
const paintSource = readFileSync("src/lib/staticShellPaint.ts", "utf8");
const adminRuntimeSource = readFileSync("src/components/admin/AdminRuntime.tsx", "utf8");

describe("public runtime and initial paint performance contract", () => {
  it("keeps admin-only modules and admin CSS out of the public entry bundle", () => {
    expect(mainSource).not.toContain("AdminBuyerActionsLauncher");
    expect(mainSource).not.toContain("AdminLiveChatLauncher");
    expect(mainSource).not.toContain("AdminLiveChatNotification");
    expect(mainSource).not.toContain("admin-mobile-focus.css");

    expect(appSource).toContain('const AdminRuntime = lazy(() => import("@/components/admin/AdminRuntime"))');
    expect(appSource).toContain('if (!pathname.startsWith("/admin")) return null');
    expect(adminRuntimeSource).toContain('import "@/admin-mobile-focus.css"');
    expect(adminRuntimeSource).toContain("<AdminLiveChatLauncher />");
    expect(adminRuntimeSource).not.toContain("<AdminLiveChatNotification />");
  });

  it("preloads critical home and Germany route chunks before replacing the static shell", () => {
    expect(mainSource).toContain('if (pathname === "/") return import("./pages/Home")');
    expect(mainSource).toContain('return import("./pages/BuyerIntentLandingPage")');
    expect(mainSource).toContain('"/de/bekleidungshersteller-deutschland"');
    expect(mainSource).toContain('"/custom-sportswear-manufacturer-germany"');
    expect(mainSource).toContain('"/de/sportbekleidung-hersteller"');
    expect(mainSource).toContain('"/leather-apparel-manufacturer-germany"');
    expect(mainSource).toContain('"/de/lederbekleidung-hersteller"');

    const paintIndex = mainSource.indexOf("await allowStaticShellPaint()");
    const clearIndex = mainSource.indexOf("rootElement.replaceChildren()");
    expect(paintIndex).toBeGreaterThan(-1);
    expect(clearIndex).toBeGreaterThan(paintIndex);
    expect(mainSource).toContain('import { allowStaticShellPaint } from "./lib/staticShellPaint"');
    expect(paintSource).toContain('typeof target.requestAnimationFrame === "function"');
    expect(paintSource).toContain("target.setTimeout(resolve, 0)");
  });

  it("retains a bounded fallback when critical chunk preloading fails or stalls", () => {
    expect(mainSource).toContain("INITIAL_ROUTE_PRELOAD_TIMEOUT_MS = 1_800");
    expect(mainSource).toContain("Promise.race");
    expect(mainSource).toContain("initialRoute.catch(() => undefined)");
  });
});
