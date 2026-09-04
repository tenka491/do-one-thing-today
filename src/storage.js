// Owns everything to do with persisting app state to localStorage, including the
// one-time migration from the v1 flat blob to the v2 history schema.
//
// v2 shape:
//   {
//     version: 2,
//     days: { "YYYY-MM-DD": { tasks: [{ id, text, completed, createdAt, completedAt }] } },
//     meta: { bestStreakFloor: number }
//   }

const STORAGE_KEY = "do-one-thing-today";
const SCHEMA_VERSION = 2;

const now = () => Date.now();
const newId = () =>
  (crypto.randomUUID?.() ?? `${now()}-${Math.random().toString(36).slice(2)}`);

function emptyState() {
  return { version: SCHEMA_VERSION, days: {}, meta: { bestStreakFloor: 0 } };
}

function makeTask(text, completed) {
  return {
    id: newId(),
    text,
    completed,
    createdAt: now(),
    completedAt: completed ? now() : null,
  };
}

// v1 blob: { savedDate, task, completed, streak, lastCompletedDate }
function migrateV1toV2(old) {
  const state = emptyState();
  state.meta.bestStreakFloor = old.streak || 0;

  if (old.task && old.savedDate) {
    state.days[old.savedDate] = {
      tasks: [makeTask(old.task, !!old.completed)],
    };
  }

  // Seed a synthetic completed day so the current streak stays continuous even
  // though we can't reconstruct the individual historical days.
  const seedDate = old.lastCompletedDate;
  if (seedDate) {
    const day = state.days[seedDate];
    const alreadyCounts = day?.tasks?.some((t) => t.completed);
    if (!alreadyCounts) {
      state.days[seedDate] = {
        tasks: [...(day?.tasks ?? []), makeTask("(previous task)", true)],
      };
    }
  }

  return state;
}

export function load() {
  let parsed;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    parsed = JSON.parse(raw);
  } catch {
    return emptyState();
  }

  // Guard against valid JSON that isn't an object (e.g. a bare number or
  // string, or null) — the `in` checks below throw on non-object operands.
  if (typeof parsed !== "object" || parsed === null) {
    return emptyState();
  }

  if (parsed.version === SCHEMA_VERSION) {
    // Defensive fill-in for hand-edited / partial blobs.
    return {
      version: SCHEMA_VERSION,
      days: parsed.days ?? {},
      meta: { bestStreakFloor: 0, ...(parsed.meta ?? {}) },
    };
  }

  if (parsed.version === undefined && ("savedDate" in parsed || "streak" in parsed)) {
    return migrateV1toV2(parsed);
  }

  return emptyState();
}

export function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota errors etc. are non-fatal for an offline personal tracker.
  }
}

export { makeTask };
