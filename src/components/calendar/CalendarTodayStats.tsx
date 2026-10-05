import {
  CalendarClock,
  Clock,
  DollarSign,
  type LucideIcon,
  Phone,
} from "lucide-react";
import type { CalendarEvent } from "@/components/calendar/calendarEventModel";

interface CalendarTodayStatsProps {
  events: CalendarEvent[];
  todayKey: string;
}

interface TodayStat {
  label: string;
  value: string;
  icon: LucideIcon;
}

function sumPipeline(events: CalendarEvent[]): number {
  return events
    .filter((event) => event.amount && event.status !== "cancelled")
    .reduce((sum, event) => {
      const amount = Number.parseFloat(
        event.amount?.replace(/[$,]/g, "") ?? "0",
      );
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
}

export default function CalendarTodayStats({
  events,
  todayKey,
}: CalendarTodayStatsProps) {
  const todayEvents = events.filter((event) => event.date === todayKey);
  const countByStatus = (status: CalendarEvent["status"]) =>
    todayEvents.filter((event) => event.status === status).length;

  const stats: TodayStat[] = [
    {
      label: "Events",
      value: todayEvents.length.toLocaleString(),
      icon: Phone,
    },
    {
      label: "Confirmed",
      value: countByStatus("confirmed").toLocaleString(),
      icon: CalendarClock,
    },
    {
      label: "Pending",
      value: countByStatus("pending").toLocaleString(),
      icon: Clock,
    },
    {
      // Deal value across every event in view, not just today's.
      label: "Pipeline",
      value: `$${sumPipeline(events).toLocaleString()}`,
      icon: DollarSign,
    },
  ];

  return (
    <section>
      <h3 className="mb-2.5 text-sm font-semibold text-[#101011]">Today</h3>
      <dl className="grid grid-cols-2 gap-2">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl bg-[#F8F7FF] p-3">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#8771FF]">
              <Icon size={13} aria-hidden="true" />
            </span>
            <dd className="mt-2 truncate text-lg font-semibold leading-none tracking-[-0.02em] text-[#101011] tabular-nums">
              {value}
            </dd>
            <dt className="mt-1 text-[11px] text-[#606266]">{label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
