import type { StreakDay } from "../types";
import { addDays, formatShortWeekdayDate, monthLabel, parseDateOnly, startOfWeek, toDateKey } from "./dates";

export type CalendarCell =
  | { kind: "future"; key: string }
  | {
      kind: "day";
      key: string;
      status: StreakDay["status"] | "empty";
      level: 0 | 1 | 2 | 3 | 4;
      isToday: boolean;
      label: string;
      day: StreakDay | null;
    };

export type CalendarModel = {
  weeks: CalendarCell[][];
  monthLabels: Array<{ weekIndex: number; label: string }>;
  weekdayLabels: string[];
};

function levelFor(day: StreakDay): 0 | 2 | 3 | 4 {
  if (day.status !== "submitted") return 0;
  const minutes = day.duration_minutes;
  if (minutes == null) return 2;
  if (minutes >= 120) return 4;
  if (minutes >= 90) return 3;
  return 2;
}

function cellLabel(key: string, status: string, day: StreakDay | null): string {
  const base = `${formatShortWeekdayDate(key)} · ${status}`;
  if (day?.status === "submitted" && day.duration_minutes != null) {
    return `${base} · ${day.duration_minutes} min`;
  }
  return base;
}

/**
 * Week-column contribution grid, Monday-start, anchored on the server's
 * "today" (never the browser clock — the backend day boundary is its own
 * timezone).
 */
export function buildCalendar(history: StreakDay[], todayKey: string, weeks = 26): CalendarModel {
  const byDate = new Map(history.map((day) => [day.date, day]));
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
      const entry = byDate.get(key) ?? null;
      const status = entry?.status ?? "empty";
      column.push({
        kind: "day",
        key,
        status,
        level: entry ? levelFor(entry) : 0,
        isToday: key === todayKey,
        label: cellLabel(key, status, entry),
        day: entry,
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
