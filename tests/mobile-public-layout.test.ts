import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("mobile public layout", () => {
  it("uses compact horizontal collection cards before the tablet breakpoint", () => {
    const categories = read("src/components/sections/HomeCategoryUniverse.tsx");
    expect(categories).toContain("grid-cols-[42%_58%]");
    expect(categories).toContain("min-h-[176px]");
    expect(categories).toContain("sm:block");
    expect(categories).toContain("object-contain p-2 sm:p-5");
    expect(categories).toContain("line-clamp-2");
  });

  it("reserves mobile content space for the compact contact dock", () => {
    const layout = read("src/components/layout/Layout.tsx");
    expect(layout).toContain("pb-[calc(5.75rem+env(safe-area-inset-bottom))]");
  });

  it("mounts one human chat without duplicate mobile WhatsApp or AI launchers", () => {
    const layout = read("src/components/layout/Layout.tsx");
    const dock = read("src/components/sections/StickyMobileCTA.tsx");
    const human = read("src/components/HumanLiveChat.tsx");
    expect(layout).toContain("<HumanLiveChat />");
    expect(layout).not.toContain("<LiveChat />");
    expect(dock).toContain("Live Chat");
    expect(dock).not.toContain("WhatsApp");
    expect(human).toContain("hidden min-h-12");
    expect(human).toContain("md:inline-flex");
  });
});
