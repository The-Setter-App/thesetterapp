"use client";

import type { CalendarEvent } from "@/components/calendar/calendarEventModel";
import { EVENT_TYPE_CONFIG } from "@/components/calendar/calendarEventModel";
import {
  computeOverlapLayout,
  END_HOUR,
  getEventStyle,
  HOUR_HEIGHT,
  START_HOUR,
} from "@/components/calendar/calendarTimeGrid";
import {
  DAY_NAMES,
  formatHour,
  isToday,
  MONTH_NAMES,
  toDateKey,
} from "@/components/calendar/calendarUtils";
import { PAGE_GUTTER_CLASS } from "@/components/layout/pageGutter";

interface Props {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export default function CalendarDayView({
  currentDate,
  events,
  onEventClick,
}: Props) {
  const dayKey = toDateKey(currentDate);
  const dayEvents = events.filter((e) => e.date === dayKey);
  const today = isToday(currentDate);
  const layout = computeOverlapLayout(dayEvents);

  const hours: number[] = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h);

  const dayLabel = `${DAY_NAMES[currentDate.getDay()]}, ${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getDate()}`;

  return (
    <div className="flex flex-1 flex-col overflow-hidden border-t border-[#F0F2F6] bg-white">
      {/* ── Day Header ── */}
      <div
        className={`${PAGE_GUTTER_CLASS} flex items-center gap-3 border-b border-[#F0F2F6] py-3`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-semibold tabular-nums ${
            today ? "bg-[#8771FF] text-white" : "bg-[#F3F0FF] text-[#8771FF]"
          }`}
        >
          {currentDate.getDate()}
        </span>
        <div>
          <p className="text-[0.9375rem] font-semibold text-[#101011]">
            {dayLabel}
          </p>
          <p className="text-xs text-[#9A9CA2]">
            {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}{" "}
            scheduled
          </p>
        </div>
      </div>

      {/* ── Scrollable Time Grid ── */}
      <div className="flex flex-1 overflow-y-auto bg-white">
        {/* Time gutter */}
        <div className="min-h-full w-[60px] shrink-0 border-r border-[#F0F2F6] bg-white">
          {hours.map((h) => (
            <div key={h} style={{ height: HOUR_HEIGHT }} className="relative">
              <span
                className={`absolute right-3 text-[11px] font-medium text-[#9A9CA2] tabular-nums ${h === START_HOUR ? "top-1" : "-top-[7px]"}`}
              >
                {formatHour(h)}
              </span>
            </div>
          ))}
        </div>

        {/* Single day column */}
        <div
          className={`relative min-h-full flex-1 ${today ? "bg-[#FBFAFF]" : "bg-white"}`}
        >
          {hours.map((h) => (
            <div
              key={h}
              style={{ height: HOUR_HEIGHT }}
              className="border-b border-[#F4F5F8]"
            />
          ))}

          {/* Current time indicator */}
          {today && <CurrentTimeLine />}

          {/* Event chips — side by side when overlapping */}
          {dayEvents.map((ev) => {
            const pos = getEventStyle(ev.startHour, ev.duration);
            if (!pos) return null;
            const c = EVENT_TYPE_CONFIG[ev.type];
            const ol = layout.get(ev.id);
            if (!ol) return null;

            const colPct = 100 / ol.totalColumns;
            const leftPct = ol.column * colPct;

            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => onEventClick(ev)}
                className={`absolute z-10 flex cursor-pointer flex-col overflow-hidden rounded-xl border px-3 py-2 text-left outline-none transition-opacity duration-100 [@media(hover:hover)]:hover:opacity-80 ${c.bgClass} ${c.borderClass}`}
                style={{
                  top: pos.top,
                  height: pos.height,
                  left: `calc(${leftPct}% + 2px)`,
                  width: `calc(${colPct}% - 4px)`,
                }}
              >
                <span
                  className={`block truncate text-[0.8125rem] font-semibold leading-tight ${c.textClass}`}
                >
                  {ev.leadName}
                </span>
                <span className="mt-0.5 block truncate text-[11px] leading-tight text-[#606266]">
                  {ev.assignedTo}
                  {ev.amount ? ` · ${ev.amount}` : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Red line showing current time */
function CurrentTimeLine() {
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  const top = (h - START_HOUR) * HOUR_HEIGHT;
  if (top < 0) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
      style={{ top }}
    >
      <div className="-ml-1 h-2.5 w-2.5 rounded-full bg-red-500" />
      <div className="h-[2px] flex-1 bg-red-500" />
    </div>
  );
}
