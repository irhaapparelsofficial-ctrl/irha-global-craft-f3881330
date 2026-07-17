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

  it("reserves only compact mobile safe space for the contact dock", () => {
    const layout = read("src/components/layout/Layout.tsx");
    expect(layout).toContain("pb-[calc(5rem+env(safe-area-inset-bottom))]");
  });

  it("shows one clear live-support entry with AI and human handoff", () => {
    const layout = read("src/components/layout/Layout.tsx");
    const dock = read("src/components/sections/StickyMobileCTA.tsx");
    const guide = read("src/components/LiveChat.tsx");
    const human = read("src/components/HumanLiveChatPro.tsx");

    expect(layout).toContain("<LiveChat />");
    expect(layout).toContain("<HumanLiveChat />");
    expect(dock).toContain("Live support");
    expect(dock).toContain("AI guide + human team");
    expect(dock).not.toContain("WhatsApp");
    expect(dock).toContain('pathname.startsWith("/admin")');
    expect(dock).toContain('pathname.startsWith("/inquiry")');
    expect(dock).toContain("supportOpened");
    expect(guide).toContain("Irha Live Support");
    expect(guide).toContain("Human Team");
    expect(guide).toContain("new CustomEvent(OPEN_HUMAN_EVENT)");
    expect(human).toContain("hidden min-h-12");
    expect(human).toContain("md:inline-flex");
  });
});
