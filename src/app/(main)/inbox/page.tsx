import { redirect } from "next/navigation";
import ScoopEmptyState from "@/components/ui/ScoopEmptyState";
import { requireCurrentUser } from "@/lib/currentUser";
import { canAccessInbox } from "@/lib/permissions";
import {
  getConnectedInstagramAccounts,
  getWorkspaceOwnerEmail,
} from "@/lib/userRepository";

export default async function InboxPage() {
  const { user } = await requireCurrentUser();
  if (!canAccessInbox(user.role)) {
    redirect("/dashboard");
  }

  const workspaceOwnerEmail = await getWorkspaceOwnerEmail(user.email);
  const hasConnectedAccounts = workspaceOwnerEmail
    ? (await getConnectedInstagramAccounts(workspaceOwnerEmail)).length > 0
    : false;

  if (!hasConnectedAccounts) {
    return (
      <ScoopEmptyState
        title="No connected accounts yet"
        description="Connect your Instagram account in Settings to start using Inbox."
        action={{ label: "Go to Settings", href: "/settings" }}
      />
    );
  }

  return (
    <ScoopEmptyState
      title="Select a conversation"
      description="Choose a chat from the sidebar to start messaging."
    />
  );
}
