import Link from "next/link";
import { redirect } from "next/navigation";
import { canAccessInbox } from "@/lib/permissions";
import { requireCurrentUser } from "@/lib/currentUser";
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
      <div className="flex h-full flex-1 items-center justify-center bg-white px-6">
        <div className="text-center text-[#606266]">
          <h3 className="text-lg font-semibold text-[#101011]">
            No connected accounts yet
          </h3>
          <p className="mt-1 text-sm text-[#606266]">
            Connect your Instagram account in Settings to start using Inbox.
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-[#8771FF] px-4 text-sm font-medium text-white transition-colors hover:bg-[#6d5ed6]"
          >
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 items-center justify-center bg-white">
      <div className="text-center text-[#606266]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F3F0FF]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-8 w-8 text-[#8771FF]"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-[#101011]">
          Select a conversation
        </h3>
        <p className="mt-1 text-sm text-[#606266]">
          Choose a chat from the sidebar to start messaging.
        </p>
      </div>
    </div>
  );
}
