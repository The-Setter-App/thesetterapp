import { MONTH_NAMES } from "@/components/calendar/calendarUtils";

const MONTH_SLUGS = MONTH_NAMES.map((name) => name.toLowerCase());
const MONTH_SLUG_SET = new Set(MONTH_SLUGS);

export function getCalendarMonthSlug(date: Date): string {
  return MONTH_SLUGS[date.getMonth()] || MONTH_SLUGS[0];
}

export function isCalendarMonthSlug(value: string): boolean {
  return MONTH_SLUG_SET.has(value.toLowerCase());
}

export function parseCalendarMonthSlug(input: {
  month: string;
  year: number;
}): Date | null {
  const slug = input.month.trim().toLowerCase();
  if (!isCalendarMonthSlug(slug)) return null;
  const monthIndex = MONTH_SLUGS.indexOf(slug);
  if (monthIndex < 0) return null;
  return new Date(input.year, monthIndex, 1);
}

export function toCalendarMonthPath(date: Date): string {
  return `/calendar/${getCalendarMonthSlug(date)}`;
}
