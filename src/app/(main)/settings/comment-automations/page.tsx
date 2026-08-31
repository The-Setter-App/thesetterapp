import { redirect } from "next/navigation";
import CommentAutomationsSettingsContent from "@/components/settings/CommentAutomationsSettingsContent";
import { listCommentAutomations } from "@/lib/commentAutomationsRepository";
import { canAccessCommentAutomationsSettings } from "@/lib/permissions";
import { requireWorkspaceContext } from "@/lib/workspace";

export default async function SettingsCommentAutomationsPage() {
  const context = await requireWorkspaceContext();
  if (!canAccessCommentAutomationsSettings(context.user.role)) {
    redirect("/settings/profile");
  }

  const initialAutomations = await listCommentAutomations(
    context.workspaceOwnerEmail,
  );

  return (
    <CommentAutomationsSettingsContent
      initialAutomations={initialAutomations}
    />
  );
}
