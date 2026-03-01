import { unstable_cache } from "next/cache";
import { buildDashboardSnapshot, createEmptyDashboardSnapshot } from "@/lib/dashboard/buildSnapshot";
import { getDashboardMessageStats } from "@/lib/dashboard/messageMetrics";
import { getConversationsFromDb } from "@/lib/inboxRepository";
import { getConnectedInstagramAccounts } from "@/lib/userRepository";
import type { DashboardSnapshot } from "@/types/dashboard";

const DASHBOARD_SNAPSHOT_CACHE_KEY = "dashboard-snapshot-v1";
const DASHBOARD_SNAPSHOT_TTL_SECONDS = 30;

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

    const messageStats = await getDashboardMessageStats(
      normalizedOwnerEmail,
      conversations.map((conversation) => conversation.id),
    );

    return buildDashboardSnapshot(conversations, messageStats, true);
  },
  [DASHBOARD_SNAPSHOT_CACHE_KEY],
  { revalidate: DASHBOARD_SNAPSHOT_TTL_SECONDS, tags: [DASHBOARD_SNAPSHOT_CACHE_KEY] },
);

export async function getCachedDashboardSnapshot(
  ownerEmail: string,
): Promise<DashboardSnapshot> {
  return getCachedDashboardSnapshotInternal(normalizeEmail(ownerEmail));
}
