"use client";

import CalendarEventCard from "@/components/calendar/CalendarEventCard";
import type { CalendarEvent } from "@/components/calendar/calendarEventModel";
import {
  DAY_NAMES,
  getMonthGridDays,
  isToday,
  toDateKey,
} from "@/components/calendar/calendarUtils";

interface CalendarMonthGridProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
}

const MAX_VISIBLE_EVENTS = 2;

export default function CalendarMonthGrid({
  currentDate,
  events,
  onEventClick,
  onDayClick,
}: CalendarMonthGridProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getMonthGridDays(year, month);

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const existing = eventsByDate.get(event.date) ?? [];
    existing.push(event);
    eventsByDate.set(event.date, existing);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b border-[#F0F2F6] bg-white">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-[#9A9CA2]"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6 overflow-hidden">
        {days.map((day) => {
          const key = toDateKey(day);
          const dayEvents = eventsByDate.get(key) ?? [];
          const isCurrentMonth = day.getMonth() === month;
          const dayIsToday = isToday(day);
          const overflowCount = Math.max(
            0,
            dayEvents.length - MAX_VISIBLE_EVENTS,
          );

          return (
            <button
              key={key}
              type="button"
              onClick={() => onDayClick(day)}
              className={`group flex flex-col border-b border-r border-[#F0F2F6] p-1.5 text-left transition-colors hover:bg-[#FAFAFE] md:p-2 ${
                isCurrentMonth ? "bg-white" : "bg-[#FAFBFD]"
              }`}
            >
              <span
                className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors md:h-7 md:w-7 md:text-sm ${
                  dayIsToday
                    ? "bg-[#8771FF] text-white"
                    : isCurrentMonth
                      ? "text-[#101011] group-hover:bg-[#F3F0FF] group-hover:text-[#6d5ed6]"
                      : "text-[#C4C6CC]"
                }`}
              >
                {day.getDate()}
              </span>

              {/* Events */}
              <div className="flex min-h-0 flex-1 flex-col gap-0.5">
                {dayEvents.slice(0, MAX_VISIBLE_EVENTS).map((event) => (
                  <CalendarEventCard
                    key={event.id}
                    event={event}
                    variant="month"
                    onClick={onEventClick}
                  />
                ))}
                {overflowCount > 0 ? (
                  <span className="mt-0.5 text-[10px] font-semibold text-[#8771FF]">
                    +{overflowCount} more
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
