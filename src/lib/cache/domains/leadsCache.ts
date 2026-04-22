"use client";

import { createLayeredCache } from "@/lib/cache/core/layeredCache";
import { APP_CACHE_STORES } from "@/lib/cache/idb/appDb";
import type { LeadRow } from "@/types/leads";

const LEADS_CACHE_KEY = "leads";
const LEADS_CACHE_TIMESTAMP_KEY = "leads_cached_at";

const leadsCache = createLayeredCache({
  storeName: APP_CACHE_STORES.leads,
  logLabel: "LeadsCache",
  writeDebounceMs: 50,
});

export async function getCachedLeads(): Promise<LeadRow[] | null> {
  return leadsCache.get<LeadRow[]>(LEADS_CACHE_KEY);
}

export async function setCachedLeads(leads: LeadRow[]): Promise<void> {
  await Promise.all([
    leadsCache.set<LeadRow[]>(LEADS_CACHE_KEY, leads),
    leadsCache.set<number>(LEADS_CACHE_TIMESTAMP_KEY, Date.now()),
  ]);
}

export async function getCachedLeadsTimestamp(): Promise<number | null> {
  return leadsCache.get<number>(LEADS_CACHE_TIMESTAMP_KEY);
}
