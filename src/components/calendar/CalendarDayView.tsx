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
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      {/* ── Day Header ── */}
      <div className="flex items-center gap-3 border-b border-[#E8E8EC] px-5 py-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${
            today ? "bg-[#8771FF] text-white" : "bg-[#F3F0FF] text-[#6d5ed6]"
          }`}
        >
          {currentDate.getDate()}
        </span>
        <div>
          <p className="text-sm font-semibold text-[#101011]">{dayLabel}</p>
          <p className="text-xs text-[#606266]">
            {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}{" "}
            scheduled
          </p>
        </div>
      </div>

      {/* ── Scrollable Time Grid ── */}
      <div className="flex flex-1 overflow-y-auto bg-[#F8F7FF]">
        {/* Time gutter */}
        <div className="min-h-full w-[60px] shrink-0 border-r border-[#E8E8EC] bg-[#F8F7FF]">
          {hours.map((h) => (
            <div key={h} style={{ height: HOUR_HEIGHT }} className="relative">
              <span
                className={`absolute right-3 text-[11px] font-medium text-[#9A9CA2] ${h === START_HOUR ? "top-1" : "-top-[7px]"}`}
              >
                {formatHour(h)}
              </span>
            </div>
          ))}
        </div>

        {/* Single day column */}
        <div
          className={`relative min-h-full flex-1 ${today ? "bg-[#FBFAFF]" : "bg-[#F8F7FF]"}`}
        >
          {hours.map((h) => (
            <div
              key={h}
              style={{ height: HOUR_HEIGHT }}
              className="border-b border-[#F0F0F4]"
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
                className={`absolute z-10 flex cursor-pointer flex-col overflow-hidden rounded-lg border px-3 py-2 text-left transition-shadow hover:shadow-md ${c.bgClass} ${c.borderClass}`}
                style={{
                  top: pos.top,
                  height: pos.height,
                  left: `calc(${leftPct}% + 2px)`,
                  width: `calc(${colPct}% - 4px)`,
                }}
              >
                <span
                  className={`block truncate text-xs font-bold leading-tight ${c.textClass}`}
                >
                  {ev.leadName}
                </span>
                <span className="block truncate text-[11px] font-medium leading-tight text-[#606266]">
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
