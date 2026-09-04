import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { load, save, makeTask } from "./storage.js";

// Must match STORAGE_KEY in storage.js (not exported).
const KEY = "do-one-thing-today";

// Minimal in-memory localStorage; storage.js only uses these four methods.
function makeLocalStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

let ls;
beforeEach(() => {
  ls = makeLocalStorage();
  vi.stubGlobal("localStorage", ls);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const EMPTY_V2 = { version: 2, days: {}, meta: { bestStreakFloor: 0 } };

describe("load", () => {
  it("returns a fresh v2 state when nothing is stored", () => {
    expect(load()).toEqual(EMPTY_V2);
  });

  it("passes a valid v2 blob through", () => {
    const stored = {
      version: 2,
      days: { "2026-01-01": { tasks: [] } },
      meta: { bestStreakFloor: 4 },
    };
    ls.setItem(KEY, JSON.stringify(stored));
    expect(load()).toEqual(stored);
  });

  it("fills in missing meta on a partial v2 blob", () => {
    ls.setItem(KEY, JSON.stringify({ version: 2, days: {} }));
    expect(load().meta).toEqual({ bestStreakFloor: 0 });
  });

  it("returns a fresh v2 state on corrupt JSON without throwing", () => {
    ls.setItem(KEY, "{not valid json");
    expect(load()).toEqual(EMPTY_V2);
  });

  it("returns a fresh v2 state when the stored value is a non-object primitive, without throwing", () => {
    ls.setItem(KEY, JSON.stringify(42));
    expect(load()).toEqual(EMPTY_V2);
  });

  it("returns a fresh v2 state when the stored value is null", () => {
    ls.setItem(KEY, JSON.stringify(null));
    expect(load()).toEqual(EMPTY_V2);
  });

  describe("v1 -> v2 migration", () => {
    it("carries today's task and seeds a synthetic previous day", () => {
      ls.setItem(
        KEY,
        JSON.stringify({
          savedDate: "2026-01-10",
          task: "ship it",
          completed: true,
          streak: 5,
          lastCompletedDate: "2026-01-09",
        })
      );

      const state = load();
      expect(state.version).toBe(2);
      expect(state.meta.bestStreakFloor).toBe(5);

      const todays = state.days["2026-01-10"].tasks;
      expect(todays).toHaveLength(1);
      expect(todays[0].text).toBe("ship it");
      expect(todays[0].completed).toBe(true);
      expect(typeof todays[0].completedAt).toBe("number");

      const seeded = state.days["2026-01-09"].tasks;
      expect(seeded).toHaveLength(1);
      expect(seeded[0].text).toBe("(previous task)");
      expect(seeded[0].completed).toBe(true);
    });

    it("preserves an incomplete task and its null completedAt", () => {
      ls.setItem(
        KEY,
        JSON.stringify({
          savedDate: "2026-01-10",
          task: "not done",
          completed: false,
          streak: 0,
        })
      );

      const state = load();
      expect(Object.keys(state.days)).toEqual(["2026-01-10"]);
      expect(state.days["2026-01-10"].tasks[0].completed).toBe(false);
      expect(state.days["2026-01-10"].tasks[0].completedAt).toBeNull();
      expect(state.meta.bestStreakFloor).toBe(0);
    });

    it("does not seed a synthetic task when that day already has a completed one", () => {
      ls.setItem(
        KEY,
        JSON.stringify({
          savedDate: "2026-01-10",
          task: "done today",
          completed: true,
          streak: 2,
          lastCompletedDate: "2026-01-10",
        })
      );

      const tasks = load().days["2026-01-10"].tasks;
      expect(tasks).toHaveLength(1);
      expect(tasks[0].text).toBe("done today");
    });

    it("appends a synthetic task when the shared day's task is not completed", () => {
      ls.setItem(
        KEY,
        JSON.stringify({
          savedDate: "2026-01-10",
          task: "still working",
          completed: false,
          streak: 1,
          lastCompletedDate: "2026-01-10",
        })
      );

      const tasks = load().days["2026-01-10"].tasks;
      expect(tasks).toHaveLength(2);
      expect(tasks.map((t) => t.text)).toEqual([
        "still working",
        "(previous task)",
      ]);
      expect(tasks[1].completed).toBe(true);
    });

    it("treats a bare { streak } blob as v1 and applies the floor", () => {
      ls.setItem(KEY, JSON.stringify({ streak: 3 }));
      const state = load();
      expect(state.version).toBe(2);
      expect(state.days).toEqual({});
      expect(state.meta.bestStreakFloor).toBe(3);
    });
  });
});

describe("save / load round-trip", () => {
  it("restores exactly what was saved", () => {
    const state = {
      version: 2,
      days: {
        "2026-02-01": {
          tasks: [makeTask("a", true), makeTask("b", false)],
        },
      },
      meta: { bestStreakFloor: 7 },
    };
    save(state);
    expect(load()).toEqual(state);
  });
});

describe("makeTask", () => {
  it("stamps completedAt only when completed", () => {
    expect(typeof makeTask("x", true).completedAt).toBe("number");
    expect(makeTask("x", false).completedAt).toBeNull();
  });

  it("sets the passed text and completed flag", () => {
    const t = makeTask("write tests", false);
    expect(t.text).toBe("write tests");
    expect(t.completed).toBe(false);
    expect(typeof t.createdAt).toBe("number");
  });

  it("generates a distinct id each call", () => {
    expect(makeTask("x", false).id).not.toBe(makeTask("x", false).id);
  });
});
