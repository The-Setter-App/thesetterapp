/** Pure date helpers for calendar grid generation. */

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export { DAY_NAMES, MONTH_NAMES };

/** Returns a YYYY-MM-DD key string for a given date */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Returns the day cells (42 = 6 rows × 7 cols) for a calendar month grid */
export function getMonthGridDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay(); // 0 = Sun
  const gridStart = new Date(year, month, 1 - startOffset);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(
      new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + i,
      ),
    );
  }
  return days;
}

/** Returns the 7 days of the week containing the given date */
export function getWeekDays(date: Date): Date[] {
  const dayOfWeek = date.getDay();
  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - dayOfWeek,
  );

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
    );
  }
  return days;
}

/** Returns hours array 0–23 for day/week time grids */
export function getHours(): number[] {
  return Array.from({ length: 24 }, (_, i) => i);
}

/** Formats hour number to display string, e.g. 0 → "12 AM", 13.5 → "1:30 PM" */
export function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const suffix = h < 12 ? "AM" : "PM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0
    ? `${display} ${suffix}`
    : `${display}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Returns true if two dates are the same calendar day */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Returns true if a date is today */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/** Navigate months: returns a new Date offset by `delta` months */
export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/** Navigate weeks: returns a new Date offset by `delta` weeks */
export function addWeeks(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + delta * 7);
  return d;
}

/** Navigate days: returns a new Date offset by `delta` days */
export function addDays(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}
