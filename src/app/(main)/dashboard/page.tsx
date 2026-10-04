import DashboardClient from "@/components/dashboard/DashboardClient";
import DashboardViewerState from "@/components/dashboard/DashboardViewerState";
import { requireCurrentUser } from "@/lib/currentUser";
import { getCachedDashboardSnapshot } from "@/lib/dashboard/snapshotCache";
import { getUserDisplayName } from "@/lib/userRepository";
import { requireInboxWorkspaceContext } from "@/lib/workspace";

export default async function DashboardPage() {
  const { user } = await requireCurrentUser();
  const displayName = getUserDisplayName(user);

  if (user.role === "viewer") {
    return (
      <DashboardViewerState
        displayName={displayName}
        avatarSrc={user.profileImageBase64 || "/images/no_profile.jpg"}
      />
    );
  }

  const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();
  const snapshot = await getCachedDashboardSnapshot(workspaceOwnerEmail);

  return <DashboardClient displayName={displayName} snapshot={snapshot} />;
}
