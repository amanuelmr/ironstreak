import { addDays, parseDateOnly, startOfWeek, toDateKey } from "./dates";

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

function weekKeyOf(dateKey: string): string {
  return toDateKey(startOfWeek(parseDateOnly(dateKey)));
}

/**
 * Rolling weekly-frequency streak: weeks are Monday-start buckets (same grid the
 * contribution calendar uses). A completed week "qualifies" once it has at least
 * `timesPerWeek` distinct logged days. The current, still-in-progress week is never
 * required to already qualify — mirroring how computeStreak doesn't require today to
 * be logged yet — but counts early if it already does. Returns [current, longest] in weeks.
 */
export function computeWeeklyStreak(
  dates: Set<string>,
  todayKey: string,
  timesPerWeek: number,
): [number, number] {
  if (dates.size === 0 || timesPerWeek < 1) return [0, 0];

  const counts = new Map<string, number>();
  for (const date of dates) {
    const week = weekKeyOf(date);
    counts.set(week, (counts.get(week) ?? 0) + 1);
  }

  const todayWeek = weekKeyOf(todayKey);
  const nextWeek = (week: string) => toDateKey(addDays(parseDateOnly(week), 7));
  const prevWeek = (week: string) => toDateKey(addDays(parseDateOnly(week), -7));

  const completedWeeks = [...counts.keys()].filter((week) => week < todayWeek).sort();
  let longest = 0;
  let run = 0;
  let last: string | null = null;
  for (const week of completedWeeks) {
    const qualifies = (counts.get(week) ?? 0) >= timesPerWeek;
    if (!qualifies) {
      run = 0;
      last = week;
      continue;
    }
    run = last !== null && week === nextWeek(last) ? run + 1 : 1;
    longest = Math.max(longest, run);
    last = week;
  }

  let current = 0;
  let cursor = prevWeek(todayWeek);
  while ((counts.get(cursor) ?? 0) >= timesPerWeek) {
    current += 1;
    cursor = prevWeek(cursor);
  }
  if ((counts.get(todayWeek) ?? 0) >= timesPerWeek) current += 1;
  longest = Math.max(longest, current);

  return [current, longest];
}
