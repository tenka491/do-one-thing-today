// Display-only preferences (which stat blocks are visible). Kept separate from
// storage.js's `do-one-thing-today` data blob — this is UI state, not tracked
// history, so it gets its own key and no schema/migration concerns.

const KEY = "do-one-thing-today:prefs";
const DEFAULTS = {
  showStreak: true,
  showBest: true,
  showBestDay: true,
  showHistory: true,
  showCompleted: true,
};

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Quota errors etc. are non-fatal for a display preference.
  }
}
