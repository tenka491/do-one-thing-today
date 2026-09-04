// Pure functions that derive streak / best-day stats from the `days` map of the
// v2 schema. Kept dependency-free so they can be unit-tested in isolation.
//
// `days` shape: { "YYYY-MM-DD": { tasks: [{ completed, ... }] } }

const DAY_MS = 86400000;

// YYYY-MM-DD for the given Date using its *local* calendar day. Deliberately
// not `toISOString().split("T")[0]` — that reads UTC, which shifts the date
// for anyone not on UTC (e.g. still "yesterday" in UTC at 7pm US Eastern).
// This is the single source of truth for "what day is it" — App.vue imports
// it rather than defining its own, so the two can't drift out of sync again.
export function dateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Number of days between two YYYY-MM-DD strings (a - b). Treating both as UTC
// midnight anchors is safe here regardless of the caller's time zone — it's
// just calendar arithmetic on two date-only strings, not a real UTC instant.
const dayDiff = (a, b) =>
  Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY_MS);

// Sorted list of dates that have at least one completed task.
export function countingDays(days) {
  return Object.keys(days)
    .filter((date) => (days[date]?.tasks ?? []).some((t) => t.completed))
    .sort();
}

// Consecutive run of counting days ending at `todayStr` or yesterday. Returns 0
// when the most recent counting day is older than yesterday (streak is broken).
export function currentStreak(days, todayStr = dateStr()) {
  const counting = countingDays(days);
  if (counting.length === 0) return 0;

  const last = counting[counting.length - 1];
  const gap = dayDiff(todayStr, last);
  if (gap > 1) return 0;

  let streak = 1;
  for (let i = counting.length - 1; i > 0; i--) {
    if (dayDiff(counting[i], counting[i - 1]) === 1) streak++;
    else break;
  }
  return streak;
}

// Longest consecutive run of counting days anywhere in the history.
export function bestStreak(days) {
  const counting = countingDays(days);
  if (counting.length === 0) return 0;

  let best = 1;
  let run = 1;
  for (let i = 1; i < counting.length; i++) {
    if (dayDiff(counting[i], counting[i - 1]) === 1) run++;
    else run = 1;
    if (run > best) best = run;
  }
  return best;
}

// The day with the most completed tasks. Ties resolve to the most recent date.
// Returns null when nothing has ever been completed.
export function bestDay(days) {
  let winner = null;
  for (const date of Object.keys(days).sort()) {
    const count = (days[date]?.tasks ?? []).filter((t) => t.completed).length;
    if (count > 0 && (winner === null || count >= winner.count)) {
      winner = { date, count };
    }
  }
  return winner;
}
