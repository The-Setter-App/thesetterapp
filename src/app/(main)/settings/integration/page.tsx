import { redirect } from "next/navigation";
import CalendlyIntegrationSection from "@/components/settings/integrations/CalendlyIntegrationSection";
import { requireCurrentSettingsUser } from "@/lib/currentSettingsUser";
import {
  canAccessIntegrationSettings,
  getDefaultSettingsRoute,
} from "@/lib/permissions";

interface SettingsIntegrationPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

function readSearchParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function SettingsIntegrationPage({
  searchParams,
}: SettingsIntegrationPageProps) {
  const { user } = await requireCurrentSettingsUser();
  if (!canAccessIntegrationSettings(user.role)) {
    redirect(getDefaultSettingsRoute(user.role));
  }

  // Calendly sends the owner back here with the outcome in the query string.
  const params = await searchParams;
  const calendlySuccess = readSearchParam(params.calendly_success);
  const calendlyError = readSearchParam(params.calendly_error);

  return (
    <CalendlyIntegrationSection
      initialSuccessMessage={
        calendlySuccess === "connected" ? "Calendly connected." : ""
      }
      initialErrorMessage={calendlyError}
    />
  );
}
