import { redirect } from "next/navigation";
import DistributionSettingsContent from "@/components/settings/DistributionSettingsContent";
import { canAccessDistributionSettings } from "@/lib/permissions";
import {
  isRoundRobinEnabled,
  listRoundRobinMembers,
} from "@/lib/roundRobinRepository";
import { requireWorkspaceContext } from "@/lib/workspace";

export default async function SettingsDistributionPage() {
  const context = await requireWorkspaceContext();
  if (!canAccessDistributionSettings(context.user.role)) {
    redirect("/settings/profile");
  }

  const [initialEnabled, initialMembers] = await Promise.all([
    isRoundRobinEnabled(context.workspaceOwnerEmail),
    listRoundRobinMembers(context.workspaceOwnerEmail),
  ]);

  return (
    <DistributionSettingsContent
      initialEnabled={initialEnabled}
      initialMembers={initialMembers}
    />
  );
}
