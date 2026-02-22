import { Crown, Lock } from 'lucide-react';
import { getInboxConnectionState, getInboxUsers } from '@/app/actions/inbox';
import { Avatar } from '@/components/ui/Avatar';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { buildDashboardSnapshot, createEmptyDashboardSnapshot } from '@/lib/dashboard/buildSnapshot';
import { getDashboardMessageStats } from '@/lib/dashboard/messageMetrics';
import { requireCurrentUser } from '@/lib/currentUser';
import { getUserDisplayName } from '@/lib/userRepository';
import { requireInboxWorkspaceContext } from '@/lib/workspace';

export default async function DashboardPage() {
  const { user } = await requireCurrentUser();
  const displayName = getUserDisplayName(user);

  if (user.role === 'viewer') {
    return (
      <div className="min-h-screen bg-white px-4 py-8 md:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl items-center justify-center">
          <div className="w-full space-y-5">
            <div className="rounded-2xl border border-[#F0F2F6] bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-center gap-3">
                <Avatar
                  src={user.profileImageBase64 || '/images/no_profile.jpg'}
                  alt={`${displayName} avatar`}
                  size="lg"
                  className="border border-[#F0F2F6]"
                />
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-[#101011] md:text-xl">Hello, {displayName}</p>
                  <p className="mt-1 text-sm text-[#606266]">
                    You currently have Viewer access. Upgrade to unlock messaging, team tools, and advanced workspace controls.
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full rounded-3xl border border-[#F0F2F6] bg-[#F8F7FF] p-8 shadow-sm md:p-10">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D8D2FF] bg-[#F3F0FF] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#6d5ed6]">
                <Lock size={14} /> Viewer Access
              </div>

              <h1 className="text-2xl font-bold text-[#101011] md:text-3xl">Please buy a subscription</h1>
              <p className="mt-3 max-w-2xl text-sm text-[#606266] md:text-base">
                Your account is currently in Viewer mode. Upgrade to an Owner subscription to unlock inbox chat, team management,
                socials, and advanced workspace controls.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[#F0F2F6] bg-white p-4">
                  <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(135,113,255,0.1)] text-[#8771FF]">
                    <Crown size={16} />
                  </div>
                  <p className="text-sm font-semibold text-[#101011]">Owner Access</p>
                  <p className="mt-1 text-xs text-[#606266]">Connect socials and manage team roles.</p>
                </div>

                <div className="rounded-2xl border border-[#F0F2F6] bg-white p-4">
                  <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(135,113,255,0.1)] text-[#8771FF]">
                    <Lock size={16} />
                  </div>
                  <p className="text-sm font-semibold text-[#101011]">Inbox & Chat</p>
                  <p className="mt-1 text-xs text-[#606266]">Message leads and update pipeline details.</p>
                </div>

                <div className="rounded-2xl border border-[#F0F2F6] bg-white p-4">
                  <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(135,113,255,0.1)] text-[#8771FF]">
                    <Crown size={16} />
                  </div>
                  <p className="text-sm font-semibold text-[#101011]">Team Collaboration</p>
                  <p className="mt-1 text-xs text-[#606266]">Invite Setters and Closers from Settings.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const connection = await getInboxConnectionState();
  if (!connection.hasConnectedAccounts) {
    return (
      <DashboardClient
        displayName={displayName}
        snapshot={createEmptyDashboardSnapshot(false)}
      />
    );
  }

  const conversations = await getInboxUsers();
  const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();
  const messageStats = await getDashboardMessageStats(
    workspaceOwnerEmail,
    conversations.map((conversation) => conversation.id),
  );
  const snapshot = buildDashboardSnapshot(conversations, messageStats, true);

  return <DashboardClient displayName={displayName} snapshot={snapshot} />;
}
