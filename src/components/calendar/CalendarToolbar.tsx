"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTH_NAMES } from "@/components/calendar/calendarUtils";
import { PAGE_GUTTER_CLASS } from "@/components/layout/pageGutter";
import SegmentedControl from "@/components/ui/SegmentedControl";

export type CalendarViewMode = "month" | "week" | "day";

interface CalendarToolbarProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onNavigate: (direction: -1 | 0 | 1) => void;
}

const VIEW_MODE_OPTIONS: { value: CalendarViewMode; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
];

const STEP_LABELS: Record<CalendarViewMode, string> = {
  month: "month",
  week: "week",
  day: "day",
};

const STEP_BUTTON_CLASS =
  "inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F5F8] text-[#606266] outline-none transition-[transform,background-color,color] duration-100 ease-out active:scale-[0.94] [@media(hover:hover)]:hover:bg-[#ECEEF3] [@media(hover:hover)]:hover:text-[#101011]";

export default function CalendarToolbar({
  currentDate,
  viewMode,
  onViewModeChange,
  onNavigate,
}: CalendarToolbarProps) {
  const month = MONTH_NAMES[currentDate.getMonth()];
  const year = currentDate.getFullYear();
  const stepLabel = STEP_LABELS[viewMode];

  return (
    <div
      className={`${PAGE_GUTTER_CLASS} flex shrink-0 flex-col gap-3 pb-4 pt-4 sm:flex-row sm:items-center sm:justify-between`}
    >
      {/* On phones the month takes its own line so the buttons keep their
          size; from `sm` up everything sits on one row. */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="w-full text-xl font-semibold tracking-[-0.02em] text-[#101011] sm:mr-1 sm:w-auto sm:min-w-[9.5rem]">
          {month}{" "}
          <span className="font-normal text-[#9A9CA2] tabular-nums">
            {year}
          </span>
        </h2>
        <button
          type="button"
          onClick={() => onNavigate(-1)}
          aria-label={`Previous ${stepLabel}`}
          className={STEP_BUTTON_CLASS}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate(1)}
          aria-label={`Next ${stepLabel}`}
          className={STEP_BUTTON_CLASS}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate(0)}
          className="inline-flex h-9 items-center rounded-full bg-[#F4F5F8] px-4 text-xs font-semibold text-[#101011] outline-none transition-[transform,background-color] duration-100 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:bg-[#ECEEF3]"
        >
          Today
        </button>
      </div>

      <div className="w-full sm:w-56">
        <SegmentedControl
          ariaLabel="Calendar view"
          value={viewMode}
          onChange={onViewModeChange}
          options={VIEW_MODE_OPTIONS}
        />
      </div>
    </div>
  );
}
