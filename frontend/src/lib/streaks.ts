import { addDays, parseDateOnly, toDateKey } from "./dates";

/**
 * Consecutive-day streaks over a set of "YYYY-MM-DD" dates.
 * Returns [current, longest]. Current counts the run ending today or
 * yesterday (so it stays alive on a day not yet logged); 0 if the most
 * recent activity is older than yesterday. Longest is the longest run.
 * Port of backend/streaks.py::compute_streak.
 */
export function computeStreak(dates: Set<string>, todayKey: string): [number, number] {
  if (dates.size === 0) return [0, 0];

  const ordered = [...dates].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < ordered.length; i += 1) {
    const prev = parseDateOnly(ordered[i - 1]);
    const cur = parseDateOnly(ordered[i]);
    const consecutive = toDateKey(addDays(prev, 1)) === toDateKey(cur);
    run = consecutive ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  let current = 0;
  const today = parseDateOnly(todayKey);
  const yesterdayKey = toDateKey(addDays(today, -1));
  let cursorKey = dates.has(todayKey) ? todayKey : dates.has(yesterdayKey) ? yesterdayKey : null;
  if (cursorKey) {
    let cursor = parseDateOnly(cursorKey);
    while (dates.has(toDateKey(cursor))) {
      current += 1;
      cursor = addDays(cursor, -1);
    }
  }

  return [current, longest];
}
