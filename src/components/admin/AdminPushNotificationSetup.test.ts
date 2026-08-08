import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/admin/AdminPushNotificationSetup.tsx", "utf8");

describe("owner push notification recovery", () => {
  it("self-heals a missing local subscription only after notification permission was already granted", () => {
    expect(source).toContain('Notification.permission === "granted"');
    expect(source).toContain("(!isIos() || isStandalone())");
    expect(source).toContain("localSubscription = await ready.pushManager.subscribe({");
    expect(source).toContain("await syncBackendSubscription(localSubscription);");
  });

  it("keeps the initial permission prompt inside the explicit enable action", () => {
    const prompts = source.match(/Notification\.requestPermission\(\)/g) ?? [];
    expect(prompts).toHaveLength(1);
    expect(source.indexOf("Notification.requestPermission()"))
      .toBeGreaterThan(source.indexOf("const enable = useCallback"));
  });

  it("repairs server-side subscription drift without deleting other owner devices", () => {
    expect(source).toContain("let storedSubscription = await readBackendSubscription");
    expect(source).toContain("if (!storedSubscription?.enabled");
    expect(source).not.toContain(".delete()");
  });

  it("keeps the iPhone setup control touchable above fixed admin overlays", () => {
    expect(source).toContain('data-owner-alert-setup-action="true"');
    expect(source).toContain("onTouchEnd=");
    expect(source).toContain("pointer-events-auto");
    expect(source).toContain("touch-manipulation");
    expect(source).toContain("z-[110]");
  });

  it("never silently ignores a missing push configuration after a tap", () => {
    expect(source).toContain("Push configuration unavailable");
    expect(source).toContain("Tap received. Connecting this iPhone to owner alerts");
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
  });
});
