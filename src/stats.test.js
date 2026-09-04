import { describe, it, expect } from "vitest";
import { countingDays, currentStreak, bestStreak, bestDay, dateStr } from "./stats.js";

// Terse builders for the `days` map: day([true, false]) => one completed, one not.
const day = (flags) => ({ tasks: flags.map((completed) => ({ completed })) });

describe("dateStr", () => {
  it("formats using the Date's local calendar fields, not toISOString/UTC", () => {
    // Construct via local (y, m, d) components rather than an ISO string, so
    // this exercises exactly what regressed: reading getFullYear/getMonth/
    // getDate instead of converting through UTC.
    const d = new Date(2026, 0, 15); // Jan 15, 2026, local midnight
    expect(dateStr(d)).toBe("2026-01-15");
    expect(dateStr(d)).toBe(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  });

  it("pads single-digit month and day", () => {
    expect(dateStr(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("defaults to the current date when called with no argument", () => {
    expect(dateStr()).toBe(dateStr(new Date()));
  });
});

describe("countingDays", () => {
  it("is empty for no days", () => {
    expect(countingDays({})).toEqual([]);
  });

  it("excludes days with no completed task", () => {
    const days = {
      "2026-01-01": day([false, false]),
      "2026-01-02": day([]),
    };
    expect(countingDays(days)).toEqual([]);
  });

  it("returns only completed days, sorted ascending", () => {
    const days = {
      "2026-01-03": day([true]),
      "2026-01-01": day([true, false]),
      "2026-01-02": day([false]),
    };
    expect(countingDays(days)).toEqual(["2026-01-01", "2026-01-03"]);
  });
});

describe("currentStreak", () => {
  it("is 0 for empty history", () => {
    expect(currentStreak({}, "2026-01-10")).toBe(0);
  });

  it("counts a single completed day that is today", () => {
    expect(currentStreak({ "2026-01-10": day([true]) }, "2026-01-10")).toBe(1);
  });

  it("counts a consecutive run ending today", () => {
    const days = {
      "2026-01-08": day([true]),
      "2026-01-09": day([true]),
      "2026-01-10": day([true]),
    };
    expect(currentStreak(days, "2026-01-10")).toBe(3);
  });

  it("still counts a run that ends yesterday (today not done yet)", () => {
    const days = {
      "2026-01-08": day([true]),
      "2026-01-09": day([true]),
    };
    expect(currentStreak(days, "2026-01-10")).toBe(2);
  });

  it("is 0 when the last completed day is older than yesterday", () => {
    const days = {
      "2026-01-07": day([true]),
      "2026-01-08": day([true]),
    };
    expect(currentStreak(days, "2026-01-10")).toBe(0);
  });

  it("stops at the first gap when walking back", () => {
    const days = {
      "2026-01-05": day([true]),
      "2026-01-06": day([true]),
      // gap on the 7th
      "2026-01-08": day([true]),
      "2026-01-09": day([true]),
      "2026-01-10": day([true]),
    };
    expect(currentStreak(days, "2026-01-10")).toBe(3);
  });

  it("ignores non-counting days between completed ones", () => {
    const days = {
      "2026-01-09": day([false]),
      "2026-01-10": day([true]),
    };
    expect(currentStreak(days, "2026-01-10")).toBe(1);
  });
});

describe("bestStreak", () => {
  it("is 0 for empty history", () => {
    expect(bestStreak({})).toBe(0);
  });

  it("is 1 for a lone completed day", () => {
    expect(bestStreak({ "2026-01-01": day([true]) })).toBe(1);
  });

  it("returns the longest run among several", () => {
    const days = {
      "2026-01-01": day([true]),
      "2026-01-02": day([true]),
      // gap
      "2026-01-05": day([true]),
      "2026-01-06": day([true]),
      "2026-01-07": day([true]),
      "2026-01-08": day([true]),
      // gap
      "2026-01-20": day([true]),
    };
    expect(bestStreak(days)).toBe(4);
  });
});

describe("bestDay", () => {
  it("is null when nothing was ever completed", () => {
    expect(bestDay({ "2026-01-01": day([false, false]) })).toBeNull();
  });

  it("picks the day with the most completed tasks", () => {
    const days = {
      "2026-01-01": day([true, false]),
      "2026-01-02": day([true, true, true]),
      "2026-01-03": day([true, true]),
    };
    expect(bestDay(days)).toEqual({ date: "2026-01-02", count: 3 });
  });

  it("breaks ties toward the most recent date", () => {
    const days = {
      "2026-01-02": day([true, true]),
      "2026-01-05": day([true, true]),
      "2026-01-03": day([true]),
    };
    expect(bestDay(days)).toEqual({ date: "2026-01-05", count: 2 });
  });

  it("counts only completed tasks, not the day's total", () => {
    const days = { "2026-01-01": day([true, false, false, true]) };
    expect(bestDay(days)).toEqual({ date: "2026-01-01", count: 2 });
  });
});
