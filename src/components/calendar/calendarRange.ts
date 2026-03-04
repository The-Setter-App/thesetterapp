import type { CalendarViewMode } from "@/components/calendar/CalendarToolbar";
import {
  getMonthGridDays,
  getWeekDays,
} from "@/components/calendar/calendarUtils";

export interface CalendarVisibleRange {
  fromIso: string;
  toIso: string;
}

function startOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );
}

function addDays(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

export function getCalendarVisibleRange(
  currentDate: Date,
  viewMode: CalendarViewMode,
): CalendarVisibleRange {
  if (viewMode === "day") {
    const from = startOfDay(currentDate);
    const to = addDays(from, 1);
    return { fromIso: from.toISOString(), toIso: to.toISOString() };
  }

  if (viewMode === "week") {
    const weekDays = getWeekDays(currentDate);
    const from = startOfDay(weekDays[0]);
    const to = addDays(from, 7);
    return { fromIso: from.toISOString(), toIso: to.toISOString() };
  }

  const monthDays = getMonthGridDays(
    currentDate.getFullYear(),
    currentDate.getMonth(),
  );
  const from = startOfDay(monthDays[0]);
  const to = addDays(from, 42);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}
