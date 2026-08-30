import { redirect } from "next/navigation";
import CalendarCacheWarmupWorker from "@/components/calendar/CalendarCacheWarmupWorker";
import InboxCacheWarmupWorker from "@/components/inbox/InboxCacheWarmupWorker";
import InboxSseBridge from "@/components/inbox/InboxSseBridge";
import Sidebar from "@/components/layout/Sidebar";
import LeadsCacheWarmupWorker from "@/components/leads/LeadsCacheWarmupWorker";
import { ToastProvider } from "@/components/ui/Toast";
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
    <ToastProvider>
      <div className="fixed inset-0 flex overflow-hidden bg-[#F0F2F6]">
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
        <div className="ml-[76px] flex-1 overflow-hidden">
          <div className="mt-4 mr-4 mb-4 h-[calc(100%-32px)] overflow-hidden rounded-2xl border border-[#F0F2F6] bg-white">
            {children}
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
