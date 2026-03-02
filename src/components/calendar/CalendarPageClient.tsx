"use client";

import { useMemo, useState } from "react";
import CalendarDayView from "@/components/calendar/CalendarDayView";
import { generateMockEvents } from "@/components/calendar/calendarMockData";
import type { CalendarEvent } from "@/components/calendar/calendarMockData";
import CalendarMonthGrid from "@/components/calendar/CalendarMonthGrid";
import CalendarSidebar from "@/components/calendar/CalendarSidebar";
import CalendarToolbar from "@/components/calendar/CalendarToolbar";
import type { CalendarViewMode } from "@/components/calendar/CalendarToolbar";
import {
    addDays,
    addMonths,
    addWeeks,
} from "@/components/calendar/calendarUtils";
import CalendarWeekView from "@/components/calendar/CalendarWeekView";
import PageHeader from "@/components/layout/PageHeader";

export default function CalendarPageClient() {
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    const events = useMemo(() => generateMockEvents(), []);

    const handleNavigate = (direction: -1 | 0 | 1) => {
        if (direction === 0) {
            setCurrentDate(new Date());
            return;
        }
        switch (viewMode) {
            case "month":
                setCurrentDate((prev) => addMonths(prev, direction));
                break;
            case "week":
                setCurrentDate((prev) => addWeeks(prev, direction));
                break;
            case "day":
                setCurrentDate((prev) => addDays(prev, direction));
                break;
        }
    };

    const handleDayClick = (date: Date) => {
        setCurrentDate(date);
        setViewMode("day");
    };

    const handleEventClick = (event: CalendarEvent) => {
        setSelectedEvent(event);
    };

    const handleCloseEventDetail = () => {
        setSelectedEvent(null);
    };

    const handleDateSelect = (date: Date) => {
        setCurrentDate(date);
    };

    const todayEventsCount = events.filter((e) => {
        const d = new Date();
        const todayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return e.date === todayKey;
    }).length;

    return (
        <div className="flex h-full min-h-screen w-full flex-col bg-white text-[#101011]">
            <PageHeader
                title="Calendar"
                description="All calls, outcomes, and revenue across your team in one place."
                titleBadge={
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F0FF] px-2.5 py-1 text-xs font-semibold text-[#8771FF]">
                        {todayEventsCount} today
                    </span>
                }
            />

            <CalendarToolbar
                currentDate={currentDate}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onNavigate={handleNavigate}
            />

            <div className="flex min-h-0 flex-1 overflow-hidden">
                {/* Main calendar area */}
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    {viewMode === "month" ? (
                        <CalendarMonthGrid
                            currentDate={currentDate}
                            events={events}
                            onEventClick={handleEventClick}
                            onDayClick={handleDayClick}
                        />
                    ) : viewMode === "week" ? (
                        <CalendarWeekView
                            currentDate={currentDate}
                            events={events}
                            onEventClick={handleEventClick}
                        />
                    ) : (
                        <CalendarDayView
                            currentDate={currentDate}
                            events={events}
                            onEventClick={handleEventClick}
                        />
                    )}
                </div>

                {/* Sidebar */}
                <CalendarSidebar
                    currentDate={currentDate}
                    events={events}
                    onDateSelect={handleDateSelect}
                    selectedEvent={selectedEvent}
                    onCloseEventDetail={handleCloseEventDetail}
                />
            </div>
        </div>
    );
}
