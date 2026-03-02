"use client";

import { CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, Clock } from "lucide-react";
import { MONTH_NAMES } from "@/components/calendar/calendarUtils";

export type CalendarViewMode = "month" | "week" | "day";

interface CalendarToolbarProps {
    currentDate: Date;
    viewMode: CalendarViewMode;
    onViewModeChange: (mode: CalendarViewMode) => void;
    onNavigate: (direction: -1 | 0 | 1) => void;
}

const VIEW_MODE_META: Record<CalendarViewMode, { label: string; icon: typeof LayoutGrid }> = {
    month: { label: "Month", icon: LayoutGrid },
    week: { label: "Week", icon: CalendarDays },
    day: { label: "Day", icon: Clock },
};

export default function CalendarToolbar({
    currentDate,
    viewMode,
    onViewModeChange,
    onNavigate,
}: CalendarToolbarProps) {
    const month = MONTH_NAMES[currentDate.getMonth()];
    const year = currentDate.getFullYear();

    return (
        <div className="border-b border-[#F0F2F6] bg-white px-4 py-3 md:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Left: navigation */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => onNavigate(0)}
                        className="inline-flex h-9 items-center rounded-xl border border-[#E8E8EC] bg-white px-4 text-xs font-semibold text-[#101011] shadow-sm transition-all hover:border-[#8771FF] hover:bg-[#F8F7FF] hover:text-[#6d5ed6] active:scale-[0.97]"
                    >
                        Today
                    </button>

                    <div className="flex items-center">
                        <button
                            type="button"
                            onClick={() => onNavigate(-1)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-l-xl border border-[#E8E8EC] bg-white text-[#606266] transition-all hover:bg-[#F8F7FF] hover:text-[#8771FF] active:scale-[0.97]"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => onNavigate(1)}
                            className="-ml-px inline-flex h-9 w-9 items-center justify-center rounded-r-xl border border-[#E8E8EC] bg-white text-[#606266] transition-all hover:bg-[#F8F7FF] hover:text-[#8771FF] active:scale-[0.97]"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <h2 className="text-sm font-bold text-[#101011] md:text-base">
                        {month} {year}
                    </h2>
                </div>

                {/* Right: view mode switcher — segmented control */}
                <div className="inline-flex h-10 items-center rounded-xl border border-[#E8E8EC] bg-[#F5F5F7] p-1 shadow-sm">
                    {(["month", "week", "day"] as CalendarViewMode[]).map((mode) => {
                        const isActive = mode === viewMode;
                        const meta = VIEW_MODE_META[mode];
                        const Icon = meta.icon;

                        return (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => onViewModeChange(mode)}
                                className={`relative inline-flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-all ${isActive
                                        ? "bg-white text-[#101011] shadow-sm"
                                        : "text-[#606266] hover:text-[#101011]"
                                    }`}
                            >
                                <Icon size={13} className={isActive ? "text-[#8771FF]" : ""} />
                                {meta.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
