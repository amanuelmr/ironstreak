import type { ActivityDay } from "../types";
import { addDays, formatShortWeekdayDate, monthLabel, parseDateOnly, startOfWeek, toDateKey } from "./dates";

export type CalendarCell =
  | { kind: "future"; key: string }
  | {
      kind: "day";
      key: string;
      level: 0 | 1 | 2 | 3 | 4;
      isToday: boolean;
      label: string;
    };

export type CalendarModel = {
  weeks: CalendarCell[][];
  monthLabels: Array<{ weekIndex: number; label: string }>;
  weekdayLabels: string[];
};

function levelFor(minutes: number, entryCount: number): 0 | 1 | 2 | 3 | 4 {
  if (entryCount === 0) return 0;
  if (minutes >= 120) return 4;
  if (minutes >= 60) return 3;
  if (minutes >= 30) return 2;
  if (minutes > 0) return 1;
  return 2; // logged something but no minutes recorded
}

function cellLabel(key: string, day: ActivityDay | undefined): string {
  const base = formatShortWeekdayDate(key);
  if (!day) return `${base} · no activity`;
  const bits = [`${day.entry_count} ${day.entry_count === 1 ? "entry" : "entries"}`];
  if (day.minutes > 0) bits.push(`${day.minutes} min`);
  return `${base} · ${bits.join(" · ")}`;
}

/**
 * Week-column contribution grid, Monday-start, anchored on the server's
 * "today". Intensity reflects total logged minutes across all challenges.
 */
export function buildCalendar(activity: ActivityDay[], todayKey: string, weeks = 26): CalendarModel {
  const byDate = new Map(activity.map((day) => [day.date, day]));
  const anchor = parseDateOnly(todayKey);
  const gridStart = addDays(startOfWeek(anchor), -(weeks - 1) * 7);

  const columns: CalendarCell[][] = [];
  for (let w = 0; w < weeks; w += 1) {
    const column: CalendarCell[] = [];
    for (let d = 0; d < 7; d += 1) {
      const date = addDays(gridStart, w * 7 + d);
      const key = toDateKey(date);
      if (date > anchor) {
        column.push({ kind: "future", key });
        continue;
      }
      const day = byDate.get(key);
      column.push({
        kind: "day",
        key,
        level: day ? levelFor(day.minutes, day.entry_count) : 0,
        isToday: key === todayKey,
        label: cellLabel(key, day),
      });
    }
    columns.push(column);
  }

  const monthLabels: Array<{ weekIndex: number; label: string }> = [];
  let previousMonth = -1;
  let lastLabelIndex = -Infinity;
  columns.forEach((column, weekIndex) => {
    const top = addDays(gridStart, weekIndex * 7);
    const month = top.getMonth();
    if (month !== previousMonth) {
      previousMonth = month;
      if (weekIndex - lastLabelIndex >= 3) {
        monthLabels.push({ weekIndex, label: monthLabel(top) });
        lastLabelIndex = weekIndex;
      }
    }
  });

  return {
    weeks: columns,
    monthLabels,
    weekdayLabels: ["Mon", "", "Wed", "", "Fri", "", ""],
  };
}
