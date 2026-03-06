import { redirect } from "next/navigation";
import IntegrationHubTable from "@/components/settings/IntegrationHubTable";
import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import { requireCurrentSettingsUser } from "@/lib/currentSettingsUser";

interface SettingsIntegrationPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

function normalizeSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

export default async function SettingsIntegrationPage({
  searchParams,
}: SettingsIntegrationPageProps) {
  const { user } = await requireCurrentSettingsUser();
  if (user.role !== "owner") {
    redirect(user.role === "viewer" ? "/settings/profile" : "/settings/team");
  }

  const params = await searchParams;
  const calendlySuccess = normalizeSearchParam(params.calendly_success);
  const calendlyError = normalizeSearchParam(params.calendly_error);
  const initialSuccessMessage =
    calendlySuccess === "connected" ? "Calendly connected successfully." : "";
  const initialErrorMessage = calendlyError || "";

  return (
    <div className="mx-auto w-full max-w-5xl">
      <SettingsSectionCard
        title="Integration hub"
        description="Manage workspace integrations and configure connection settings."
      >
        <div className="px-4 py-6 md:px-8">
          <IntegrationHubTable
            initialSuccessMessage={initialSuccessMessage}
            initialErrorMessage={initialErrorMessage}
          />
        </div>
      </SettingsSectionCard>
    </div>
  );
}
