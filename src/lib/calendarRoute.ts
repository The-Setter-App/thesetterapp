import { MONTH_NAMES } from "@/components/calendar/calendarUtils";

const MONTH_SLUGS = MONTH_NAMES.map((name) => name.toLowerCase());
const MONTH_SLUG_SET = new Set(MONTH_SLUGS);
const CALENDAR_YEAR_PATTERN = /^\d{4}$/;

export interface CalendarMonthRouteParams {
  month: string;
  year: number;
}

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

export function parseCalendarYear(value: string): number | null {
  const normalized = value.trim();
  if (!CALENDAR_YEAR_PATTERN.test(normalized)) return null;

  const year = Number.parseInt(normalized, 10);
  if (!Number.isInteger(year)) return null;
  if (year < 1970 || year > 9999) return null;
  return year;
}

export function parseCalendarMonthRoute(
  input: CalendarMonthRouteParams,
): Date | null {
  return parseCalendarMonthSlug(input);
}

export function parseCalendarPathname(pathname: string | null): Date | null {
  if (!pathname?.startsWith("/calendar")) return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "calendar") return null;
  if (segments.length < 3) return null;

  const year = parseCalendarYear(segments[1] ?? "");
  if (year === null) return null;

  return parseCalendarMonthRoute({
    year,
    month: segments[2] ?? "",
  });
}

export function toCalendarMonthPath(date: Date): string {
  return `/calendar/${date.getFullYear()}/${getCalendarMonthSlug(date)}`;
}

export function getCurrentCalendarPath(): string {
  return toCalendarMonthPath(new Date());
}
