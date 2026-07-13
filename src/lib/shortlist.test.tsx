import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  shortlistProductPath,
  type ShortlistItem,
  useCompare,
  useShortlist,
} from "@/lib/shortlist";

const COMPARE_KEY = "irha_compare_v1";
const SHORTLIST_KEY = "irha_shortlist_v1";

function item(index: number, overrides: Partial<ShortlistItem> = {}): ShortlistItem {
  return {
    slug: `product-${index}`,
    name: `Product ${index}`,
    categorySlug: "sportswear",
    categoryName: "Sportswear",
    addedAt: index,
    ...overrides,
  };
}

describe("guest shortlist storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("limits compare to four newest unique products", async () => {
    const { result } = renderHook(() => useCompare());
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      result.current.add(item(1));
      result.current.add(item(2));
      result.current.add(item(3));
      result.current.add(item(4));
      result.current.add(item(5));
    });

    await waitFor(() => {
      expect(result.current.items.map((value) => value.slug)).toEqual([
        "product-5",
        "product-4",
        "product-3",
        "product-2",
      ]);
    });

    act(() => result.current.add(item(3, { name: "Updated Product 3" })));

    await waitFor(() => {
      expect(result.current.items).toHaveLength(4);
      expect(result.current.items[0]).toMatchObject({ slug: "product-3", name: "Updated Product 3" });
      expect(result.current.items.filter((value) => value.slug === "product-3")).toHaveLength(1);
    });
  });

  it("ignores malformed and non-array browser storage", async () => {
    localStorage.setItem(SHORTLIST_KEY, JSON.stringify({ slug: "not-an-array" }));
    const { result, unmount } = renderHook(() => useShortlist());
    await waitFor(() => expect(result.current.items).toEqual([]));
    unmount();

    localStorage.setItem(SHORTLIST_KEY, JSON.stringify([
      null,
      { name: "Missing slug" },
      item(1),
    ]));
    const next = renderHook(() => useShortlist());
    await waitFor(() => expect(next.result.current.items.map((value) => value.slug)).toEqual(["product-1"]));
  });

  it("builds encoded product links and falls back safely for legacy entries", () => {
    expect(shortlistProductPath({ categorySlug: "bavarian wear", slug: "men's lederhosen" }))
      .toBe("/products/bavarian%20wear/men's%20lederhosen");
    expect(shortlistProductPath({ slug: "legacy-product" })).toBe("/products");
    expect(shortlistProductPath({ categorySlug: "sportswear", slug: "" })).toBe("/products");
  });

  it("clears only the requested list", async () => {
    localStorage.setItem(COMPARE_KEY, JSON.stringify([item(1)]));
    localStorage.setItem(SHORTLIST_KEY, JSON.stringify([item(2)]));

    const compare = renderHook(() => useCompare());
    const shortlist = renderHook(() => useShortlist());
    await waitFor(() => expect(compare.result.current.items).toHaveLength(1));
    await waitFor(() => expect(shortlist.result.current.items).toHaveLength(1));

    act(() => compare.result.current.clear());

    await waitFor(() => expect(compare.result.current.items).toEqual([]));
    expect(JSON.parse(localStorage.getItem(SHORTLIST_KEY) || "[]")).toHaveLength(1);
  });
});
