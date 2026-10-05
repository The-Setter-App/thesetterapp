import { unstable_cache } from "next/cache";
import {
  buildDashboardSnapshot,
  createEmptyDashboardSnapshot,
} from "@/lib/dashboard/buildSnapshot";
import type { TeamRosterEntry } from "@/lib/dashboard/buildTeamLeaderboard";
import {
  DASHBOARD_SNAPSHOT_CACHE_TAG,
  DASHBOARD_SNAPSHOT_TTL_SECONDS,
} from "@/lib/dashboard/cacheInvalidation";
import { getDashboardMessageStatsMapFromConversationPayload } from "@/lib/dashboard/messageMetrics";
import { getConversationsFromDb } from "@/lib/inboxRepository";
import { listWorkspaceAssignableTags } from "@/lib/tagsRepository";
import {
  getConnectedInstagramAccounts,
  getTeamMembersForOwner,
  getUser,
  getUserDisplayName,
} from "@/lib/userRepository";
import type { DashboardSnapshot } from "@/types/dashboard";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// The owner and their setters and closers, so each has a leaderboard row
// even before owning a lead.
async function loadTeamRoster(ownerEmail: string): Promise<TeamRosterEntry[]> {
  const [owner, members] = await Promise.all([
    getUser(ownerEmail),
    getTeamMembersForOwner(ownerEmail),
  ]);
  // Team members are listed by email; their own account holds their name.
  const memberAccounts = await Promise.all(
    members.map((member) => getUser(member.email)),
  );

  return [
    {
      email: ownerEmail,
      label: getUserDisplayName(owner ?? { email: ownerEmail }),
      role: "owner",
    },
    ...members.map(
      (member, index): TeamRosterEntry => ({
        email: member.email,
        label: getUserDisplayName(
          memberAccounts[index] ?? { email: member.email },
        ),
        role: member.role,
      }),
    ),
  ];
}

const getCachedDashboardSnapshotInternal = unstable_cache(
  async (ownerEmail: string): Promise<DashboardSnapshot> => {
    const normalizedOwnerEmail = normalizeEmail(ownerEmail);
    const accounts = await getConnectedInstagramAccounts(normalizedOwnerEmail);
    if (accounts.length === 0) {
      return createEmptyDashboardSnapshot(false);
    }

    const conversations = await getConversationsFromDb(normalizedOwnerEmail);
    if (conversations.length === 0) {
      return createEmptyDashboardSnapshot(true);
    }

    const messageStats =
      getDashboardMessageStatsMapFromConversationPayload(conversations);

    const [tags, teamRoster] = await Promise.all([
      listWorkspaceAssignableTags(normalizedOwnerEmail),
      loadTeamRoster(normalizedOwnerEmail),
    ]);
    const roleByStatusName = Object.fromEntries(
      tags.map((tag) => [tag.name, tag.role]),
    );

    return buildDashboardSnapshot(
      conversations,
      messageStats,
      true,
      roleByStatusName,
      teamRoster,
    );
  },
  [DASHBOARD_SNAPSHOT_CACHE_TAG],
  {
    revalidate: DASHBOARD_SNAPSHOT_TTL_SECONDS,
    tags: [DASHBOARD_SNAPSHOT_CACHE_TAG],
  },
);

export async function getCachedDashboardSnapshot(
  ownerEmail: string,
): Promise<DashboardSnapshot> {
  return getCachedDashboardSnapshotInternal(normalizeEmail(ownerEmail));
}
