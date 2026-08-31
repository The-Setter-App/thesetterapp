import { redirect } from "next/navigation";
import BlockedUsersSettingsContent from "@/components/settings/BlockedUsersSettingsContent";
import { listBlockedUsernames } from "@/lib/blockedUsernamesRepository";
import { canAccessBlockedUsersSettings } from "@/lib/permissions";
import { requireWorkspaceContext } from "@/lib/workspace";

export default async function SettingsBlockedUsersPage() {
  const context = await requireWorkspaceContext();
  if (!canAccessBlockedUsersSettings(context.user.role)) {
    redirect("/settings/profile");
  }

  const initialBlockedUsernames = await listBlockedUsernames(
    context.workspaceOwnerEmail,
  );

  return (
    <BlockedUsersSettingsContent
      initialBlockedUsernames={initialBlockedUsernames}
    />
  );
}
