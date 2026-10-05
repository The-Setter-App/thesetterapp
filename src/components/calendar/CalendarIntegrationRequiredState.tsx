import ScoopEmptyState from "@/components/ui/ScoopEmptyState";

interface CalendarIntegrationRequiredStateProps {
  canManageIntegration: boolean;
}

export default function CalendarIntegrationRequiredState({
  canManageIntegration,
}: CalendarIntegrationRequiredStateProps) {
  return (
    <ScoopEmptyState
      title="Calendly integration required"
      description={
        canManageIntegration
          ? "Connect Calendly in Settings > Integration to load real booked calls in this calendar."
          : "Ask your team owner to connect Calendly in Settings > Integration to enable the calendar feed."
      }
      action={
        canManageIntegration
          ? {
              label: "Open Integration Settings",
              href: "/settings/integration",
            }
          : undefined
      }
    />
  );
}
