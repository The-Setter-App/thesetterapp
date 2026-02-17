import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireCurrentUser } from '@/lib/currentUser';
import { canAccessInbox } from '@/lib/permissions';
import { getConnectedInstagramAccounts, getWorkspaceOwnerEmail } from '@/lib/userRepository';

export default async function InboxPage() {
  const { user } = await requireCurrentUser();
  if (!canAccessInbox(user.role)) {
    redirect('/dashboard');
  }

  const workspaceOwnerEmail = await getWorkspaceOwnerEmail(user.email);
  const hasConnectedAccounts = workspaceOwnerEmail
    ? (await getConnectedInstagramAccounts(workspaceOwnerEmail)).length > 0
    : false;

  if (!hasConnectedAccounts) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white h-full px-6">
        <div className="text-center text-gray-500">
          <h3 className="text-lg font-medium text-gray-900">No connected accounts yet</h3>
          <p className="mt-1 text-sm text-gray-500">Connect your Instagram account in Settings to start using Inbox.</p>
          <Link
            href="/settings"
            className="inline-flex mt-4 px-4 py-2 text-sm font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800"
          >
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-white h-full">
      <div className="text-center text-gray-500">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">Select a conversation</h3>
        <p className="mt-1 text-sm text-gray-500">Choose a chat from the sidebar to start messaging.</p>
      </div>
    </div>
  );
}
