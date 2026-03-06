import { unstable_cache } from "next/cache";
import {
  buildDashboardSnapshot,
  createEmptyDashboardSnapshot,
} from "@/lib/dashboard/buildSnapshot";
import {
  DASHBOARD_SNAPSHOT_CACHE_TAG,
  DASHBOARD_SNAPSHOT_TTL_SECONDS,
} from "@/lib/dashboard/cacheInvalidation";
import { getDashboardMessageStatsMapFromConversationPayload } from "@/lib/dashboard/messageMetrics";
import { getConversationsFromDb } from "@/lib/inboxRepository";
import { getConnectedInstagramAccounts } from "@/lib/userRepository";
import type { DashboardSnapshot } from "@/types/dashboard";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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

    return buildDashboardSnapshot(conversations, messageStats, true);
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
