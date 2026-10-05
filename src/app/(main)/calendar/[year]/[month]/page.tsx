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

  // The month goes to the browser as plain numbers. A Date would be sent as a
  // UTC timestamp and read back in the viewer's timezone, where midnight on
  // the 1st is still the previous month for anyone west of UTC.
  return (
    <CalendarPageClient
      initialYear={initialDate.getFullYear()}
      initialMonthIndex={initialDate.getMonth()}
    />
  );
}
