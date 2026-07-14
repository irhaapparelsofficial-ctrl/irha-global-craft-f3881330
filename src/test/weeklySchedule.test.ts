import { describe, expect, it } from "vitest";
import { nextFutureWeeklyOccurrence } from "@/lib/weeklySchedule";

describe("weekly schedule safety", () => {
  it("keeps a future slot unchanged", () => {
    const result = nextFutureWeeklyOccurrence(
      "2026-07-15T08:00:00.000Z",
      new Date("2026-07-14T10:00:00.000Z"),
    );
    expect(result?.toISOString()).toBe("2026-07-15T08:00:00.000Z");
  });

  it("moves a past weekday slot to its next weekly occurrence", () => {
    const result = nextFutureWeeklyOccurrence(
      "2026-07-13T08:00:00.000Z",
      new Date("2026-07-14T10:00:00.000Z"),
    );
    expect(result?.toISOString()).toBe("2026-07-20T08:00:00.000Z");
  });

  it("returns null for invalid dates", () => {
    expect(nextFutureWeeklyOccurrence("not-a-date")).toBeNull();
  });
});
