import { redirect } from "next/navigation";
import TagsSettingsContent from "@/components/settings/TagsSettingsContent";
import { canAccessTagsSettings } from "@/lib/permissions";
import { listWorkspaceAssignableTags } from "@/lib/tagsRepository";
import { requireWorkspaceContext } from "@/lib/workspace";

export default async function SettingsTagsPage() {
  const context = await requireWorkspaceContext();
  if (!canAccessTagsSettings(context.user.role)) {
    redirect("/settings/profile");
  }

  const initialTags = await listWorkspaceAssignableTags(
    context.workspaceOwnerEmail,
  );

  return (
    <TagsSettingsContent
      currentUser={{
        email: context.user.email,
        displayName: context.user.displayName,
      }}
      initialTags={initialTags}
    />
  );
}
