"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { CalendarEvent } from "@/components/calendar/calendarEventModel";
import {
  DAY_NAMES,
  getMonthGridDays,
  isSameDay,
  isToday,
  MONTH_NAMES,
  toDateKey,
} from "@/components/calendar/calendarUtils";

interface CalendarMiniMonthProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateSelect: (date: Date) => void;
}

const VISIBLE_DAY_COUNT = 35;

const STEP_BUTTON_CLASS =
  "inline-flex h-7 w-7 items-center justify-center rounded-full text-[#9A9CA2] outline-none transition-[transform,background-color,color] duration-100 ease-out active:scale-[0.94] [@media(hover:hover)]:hover:bg-[#F4F5F8] [@media(hover:hover)]:hover:text-[#606266]";

function getDayClass(
  isSelected: boolean,
  dayIsToday: boolean,
  isMonth: boolean,
): string {
  if (isSelected) return "bg-[#8771FF] font-semibold text-white";
  if (dayIsToday) return "bg-[#F3F0FF] font-semibold text-[#8771FF]";
  if (isMonth) {
    return "text-[#101011] [@media(hover:hover)]:hover:bg-[#F8F7FF]";
  }
  return "text-[#C4C6CC]";
}

// A small month for jumping to a date. It pages on its own, without moving
// the main calendar until a day is picked.
export default function CalendarMiniMonth({
  currentDate,
  events,
  onDateSelect,
}: CalendarMiniMonthProps) {
  const [miniMonth, setMiniMonth] = useState(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
  );

  const miniDays = getMonthGridDays(
    miniMonth.getFullYear(),
    miniMonth.getMonth(),
  );
  const datesWithEvents = new Set(events.map((event) => event.date));

  const stepMonth = (delta: -1 | 1) => {
    setMiniMonth(
      new Date(miniMonth.getFullYear(), miniMonth.getMonth() + delta, 1),
    );
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#101011]">
          {MONTH_NAMES[miniMonth.getMonth()]}{" "}
          <span className="font-normal text-[#9A9CA2] tabular-nums">
            {miniMonth.getFullYear()}
          </span>
        </h3>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => stepMonth(-1)}
            aria-label="Previous month"
            className={STEP_BUTTON_CLASS}
          >
            <ChevronLeft size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => stepMonth(1)}
            aria-label="Next month"
            className={STEP_BUTTON_CLASS}
          >
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7">
        {DAY_NAMES.map((name) => (
          <span
            key={name}
            className="text-center text-[10px] font-medium text-[#9A9CA2]"
          >
            {name.slice(0, 2)}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {miniDays.slice(0, VISIBLE_DAY_COUNT).map((day) => {
          const key = toDateKey(day);
          const isSelected = isSameDay(day, currentDate);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onDateSelect(day)}
              className={`relative mx-auto inline-flex h-8 w-8 items-center justify-center rounded-full text-xs tabular-nums outline-none transition-colors duration-100 ${getDayClass(
                isSelected,
                isToday(day),
                day.getMonth() === miniMonth.getMonth(),
              )}`}
            >
              {day.getDate()}
              {datesWithEvents.has(key) && !isSelected ? (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#8771FF]" />
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
