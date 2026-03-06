import { redirect } from "next/navigation";
import CalendarPageClient from "@/components/calendar/CalendarPageClient";
import {
  parseCalendarMonthRoute,
  parseCalendarYear,
  toCalendarMonthPath,
} from "@/lib/calendarRoute";

export default async function CalendarMonthPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const { year: yearParam, month } = await params;
  const year = parseCalendarYear(yearParam);
  const initialDate =
    year === null
      ? null
      : parseCalendarMonthRoute({
          month,
          year,
        });

  if (!initialDate) {
    redirect(toCalendarMonthPath(new Date()));
  }

  return <CalendarPageClient initialDate={initialDate} />;
}
