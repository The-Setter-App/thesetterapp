'use client';

import { getInboxConnectionState, getInboxUsers } from "@/app/actions/inbox";
import { getCachedLeads, getCachedLeadsTimestamp, setCachedLeads } from "@/lib/clientCache";
import { mapInboxUsersToLeadRows } from "@/lib/leads/mapInboxUserToLeadRow";

export const LEADS_CACHE_TTL_MS = 2 * 60 * 1000;

let activeLeadsWarmupRun: Promise<void> | null = null;

export async function runLeadsCacheWarmup(options?: {
  force?: boolean;
}): Promise<void> {
  if (typeof window === "undefined") return;
  if (activeLeadsWarmupRun) return activeLeadsWarmupRun;

  activeLeadsWarmupRun = (async () => {
    const force = options?.force === true;
    const [cachedLeads, cachedAt] = await Promise.all([
      getCachedLeads(),
      getCachedLeadsTimestamp(),
    ]);

    const cacheIsFresh =
      typeof cachedAt === "number" &&
      Date.now() - cachedAt < LEADS_CACHE_TTL_MS;

    if (!force && cachedLeads?.length && cacheIsFresh) {
      return;
    }

    const connection = await getInboxConnectionState();
    if (!connection.hasConnectedAccounts) {
      await setCachedLeads([]);
      return;
    }

    const users = await getInboxUsers();
    await setCachedLeads(mapInboxUsersToLeadRows(users));
  })().finally(() => {
    activeLeadsWarmupRun = null;
  });

  return activeLeadsWarmupRun;
}
