import Link from "next/link";

interface CalendarIntegrationRequiredStateProps {
  canManageIntegration: boolean;
}

export default function CalendarIntegrationRequiredState({
  canManageIntegration,
}: CalendarIntegrationRequiredStateProps) {
  return (
    <section className="flex min-h-0 flex-1 w-full items-center justify-center bg-[#F8F7FF] px-4 py-8 md:px-6 lg:px-8">
      <div className="w-full max-w-2xl rounded-3xl border border-[#F0F2F6] bg-white p-6 shadow-sm md:p-8">
        <h2 className="text-xl font-bold text-[#101011] md:text-2xl">
          Calendly integration required
        </h2>
        <p className="mt-2 text-sm text-[#606266] md:text-base">
          {canManageIntegration
            ? "Connect Calendly in Settings > Integration to load real booked calls in this calendar."
            : "Ask your team owner to connect Calendly in Settings > Integration to enable the calendar feed."}
        </p>
        {canManageIntegration ? (
          <div className="mt-6">
            <Link
              href="/settings/integration"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#8771FF] px-5 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-[#6d5ed6] active:scale-95"
            >
              Open Integration Settings
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
