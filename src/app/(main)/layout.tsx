import { redirect } from "next/navigation";
import CalendarCacheWarmupWorker from "@/components/calendar/CalendarCacheWarmupWorker";
import InboxCacheWarmupWorker from "@/components/inbox/InboxCacheWarmupWorker";
import InboxSseBridge from "@/components/inbox/InboxSseBridge";
import Sidebar from "@/components/layout/Sidebar";
import LeadsCacheWarmupWorker from "@/components/leads/LeadsCacheWarmupWorker";
import { requireCurrentUser } from "@/lib/currentUser";
import { canAccessInbox } from "@/lib/permissions";
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
    <div className="flex h-screen overflow-hidden bg-[#F8F7FF]">
      <CalendarCacheWarmupWorker enabled={canAccessInbox(user.role)} />
      <InboxCacheWarmupWorker />
      <InboxSseBridge enabled={canAccessInbox(user.role)} />
      <LeadsCacheWarmupWorker enabled={canAccessInbox(user.role)} />
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
