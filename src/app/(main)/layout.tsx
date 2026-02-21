import { redirect } from "next/navigation";
import InboxCacheWarmupWorker from "@/components/inbox/InboxCacheWarmupWorker";
import Sidebar from "@/components/layout/Sidebar";
import { requireCurrentUser } from "@/lib/currentUser";
import { getUserDisplayName, isOnboardingRequired } from "@/lib/userRepository";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireCurrentUser();
  if (isOnboardingRequired(user)) {
    redirect("/onboarding");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <InboxCacheWarmupWorker />
      <Sidebar
        role={user.role}
        displayName={getUserDisplayName(user)}
        email={user.email}
        profileImageBase64={user.profileImageBase64}
      />
      <div className="ml-16 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
