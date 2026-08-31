import { redirect } from "next/navigation";
import AiTagsSettingsContent from "@/components/settings/AiTagsSettingsContent";
import { listWorkspaceAiTags } from "@/lib/aiTagsRepository";
import { canAccessAiTagsSettings } from "@/lib/permissions";
import { requireWorkspaceContext } from "@/lib/workspace";

export default async function SettingsAiTagsPage() {
  const context = await requireWorkspaceContext();
  if (!canAccessAiTagsSettings(context.user.role)) {
    redirect("/settings/profile");
  }

  const initialAiTags = await listWorkspaceAiTags(context.workspaceOwnerEmail);

  return <AiTagsSettingsContent initialAiTags={initialAiTags} />;
}
