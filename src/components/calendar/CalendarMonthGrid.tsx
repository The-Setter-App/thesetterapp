"use client";

import CalendarEventCard from "@/components/calendar/CalendarEventCard";
import {
  type CalendarEvent,
  EVENT_TYPE_CONFIG,
} from "@/components/calendar/calendarEventModel";
import {
  DAY_NAMES,
  getMonthGridDays,
  isToday,
  MONTH_NAMES,
  toDateKey,
} from "@/components/calendar/calendarUtils";

interface CalendarMonthGridProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
}

const MAX_VISIBLE_EVENTS = 2;
const MAX_VISIBLE_DOTS = 3;

function getDayNumberClass(isCurrentMonth: boolean, dayIsToday: boolean) {
  if (dayIsToday) return "bg-[#8771FF] font-semibold text-white";
  if (isCurrentMonth) {
    return "font-medium text-[#101011] group-hover:bg-[#F3F0FF] group-hover:text-[#6d5ed6]";
  }
  return "font-medium text-[#C4C6CC]";
}

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
    <div className="flex flex-1 flex-col overflow-hidden border-t border-[#F0F2F6]">
      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b border-[#F0F2F6] bg-white">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="px-2 py-2 text-center text-xs font-medium text-[#9A9CA2]"
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
          const dayLabel = `${MONTH_NAMES[day.getMonth()]} ${day.getDate()}`;

          return (
            <div
              key={key}
              className="group relative flex min-h-0 flex-col border-b border-r border-[#F0F2F6] p-1.5 transition-colors duration-100 md:p-2 [&:nth-child(7n)]:border-r-0 [@media(hover:hover)]:hover:bg-[#FBFAFF]"
            >
              {/* The whole cell opens the day. It is a sibling of the event
                  buttons, not their parent, so no button sits inside another. */}
              <button
                type="button"
                onClick={() => onDayClick(day)}
                aria-label={`Open ${dayLabel}`}
                className="absolute inset-0 outline-none"
              />

              <span
                className={`pointer-events-none relative mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums transition-colors duration-100 md:h-7 md:w-7 md:text-[0.8125rem] ${getDayNumberClass(isCurrentMonth, dayIsToday)}`}
              >
                {day.getDate()}
              </span>

              {/* Phone cells are too narrow for labels, so events show as
                  dots there; tapping the day opens its full list. */}
              {dayEvents.length > 0 ? (
                <div className="pointer-events-none relative flex flex-wrap items-center gap-0.5 md:hidden">
                  {dayEvents.slice(0, MAX_VISIBLE_DOTS).map((event) => (
                    <span
                      key={event.id}
                      className={`h-1.5 w-1.5 rounded-full ${EVENT_TYPE_CONFIG[event.type].dotClass}`}
                    />
                  ))}
                  {dayEvents.length > MAX_VISIBLE_DOTS ? (
                    <span className="text-[9px] font-semibold leading-none text-[#8771FF]">
                      +{dayEvents.length - MAX_VISIBLE_DOTS}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className="pointer-events-none relative hidden min-h-0 flex-1 flex-col gap-0.5 md:flex [&>button]:pointer-events-auto">
                {dayEvents.slice(0, MAX_VISIBLE_EVENTS).map((event) => (
                  <CalendarEventCard
                    key={event.id}
                    event={event}
                    variant="month"
                    onClick={onEventClick}
                  />
                ))}
                {overflowCount > 0 ? (
                  <span className="px-1.5 text-[11px] font-semibold text-[#8771FF]">
                    +{overflowCount} more
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
