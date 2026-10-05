import {
  type CalendarEvent,
  type CalendarEventType,
  EVENT_TYPE_CONFIG,
} from "@/components/calendar/calendarEventModel";

interface CalendarTypeLegendProps {
  events: CalendarEvent[];
}

// Explains the colours on the calendar. Only the types actually in view are
// listed, and with a single type there is nothing to tell apart, so the
// legend is left out.
export default function CalendarTypeLegend({
  events,
}: CalendarTypeLegendProps) {
  const typeCounts = new Map<CalendarEventType, number>();
  for (const event of events) {
    typeCounts.set(event.type, (typeCounts.get(event.type) ?? 0) + 1);
  }

  if (typeCounts.size < 2) return null;

  return (
    <section>
      <h3 className="mb-2.5 text-sm font-semibold text-[#101011]">
        Event types
      </h3>
      <ul className="space-y-2">
        {[...typeCounts.entries()].map(([type, count]) => {
          const config = EVENT_TYPE_CONFIG[type];
          return (
            <li key={type} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-[0.8125rem] text-[#101011]">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${config.dotClass}`}
                />
                <span className="truncate">{config.label}</span>
              </span>
              <span className="text-xs font-semibold text-[#606266] tabular-nums">
                {count}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
