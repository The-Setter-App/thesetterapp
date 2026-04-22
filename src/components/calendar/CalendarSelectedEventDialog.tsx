"use client";

import CalendarEventDetailsPanel from "@/components/calendar/CalendarEventDetailsPanel";
import type { CalendarEvent } from "@/components/calendar/calendarEventModel";
import type { WorkspaceCalendarCallEvent } from "@/types/calendly";

interface CalendarSelectedEventDialogProps {
  event: CalendarEvent | null;
  detail: WorkspaceCalendarCallEvent | null;
  detailLoading: boolean;
  detailError: string;
  onClose: () => void;
}

export default function CalendarSelectedEventDialog({
  event,
  detail,
  detailLoading,
  detailError,
  onClose,
}: CalendarSelectedEventDialogProps) {
  if (!event) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/45 p-3 lg:hidden">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-[#F0F2F6] bg-white shadow-xl">
        <CalendarEventDetailsPanel
          event={event}
          detail={detail}
          detailLoading={detailLoading}
          detailError={detailError}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
