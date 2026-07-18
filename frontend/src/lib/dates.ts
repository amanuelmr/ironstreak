export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Monday-start week. */
export function startOfWeek(date: Date): Date {
  const day = date.getDay(); // 0 = Sunday
  const offset = (day + 6) % 7; // days since Monday
  return addDays(date, -offset);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parseDateOnly(value));
}

export function formatLongDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(
    parseDateOnly(value),
  );
}

export function formatShortWeekdayDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(
    parseDateOnly(value),
  );
}

export function formatTime(value: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { month: "short" }).format(date);
}
