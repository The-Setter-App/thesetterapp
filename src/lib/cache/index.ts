"use client";

import {
  clearAllLayeredCaches,
  flushAllLayeredCaches,
  prepareLayeredCachesForDatabaseReset,
} from "@/lib/cache/core/layeredCache";
import {
  deleteLegacyCacheDatabases,
  resetAppCacheDb,
} from "@/lib/cache/idb/appDb";

export type {
  CalendarCallsWorkspaceCacheRecord,
  CalendarIsoRange,
  ConversationCallsCacheRecord,
  ConversationDetailsCacheState,
  ConversationSummaryCacheRecord,
  MessagePageMetaCacheRecord,
} from "@/lib/cache/domains/inboxCache";
export {
  getCachedCalendarCallsForRange,
  getCachedCalendarCallsWorkspaceState,
  getCachedConversationCalls,
  getCachedConversationDetails,
  getCachedConversationDetailsState,
  getCachedConversationSummary,
  getCachedMessagePageMeta,
  getCachedMessages,
  getCachedUsers,
  getHotCachedCalendarCallsWorkspaceState,
  getHotCachedConversationCalls,
  getHotCachedConversationDetails,
  getHotCachedConversationDetailsState,
  getHotCachedMessagePageMeta,
  getHotCachedMessages,
  getHotCachedUsers,
  getUncoveredCalendarCallRanges,
  markCachedConversationDetailsSynced,
  mergeCachedCalendarCallsForRange,
  mergeCachedCalendarCallsFromConversation,
  mergeCachedConversationCallsFromWorkspace,
  removeCachedConversationsByAccount,
  setCachedConversationCalls,
  setCachedConversationDetails,
  setCachedConversationDetailsFromRemote,
  setCachedConversationDetailsLocal,
  setCachedConversationSummary,
  setCachedMessagePageMeta,
  setCachedMessages,
  setCachedUsers,
  updateCachedMessages,
} from "@/lib/cache/domains/inboxCache";
export {
  getCachedLeads,
  getCachedLeadsTimestamp,
  setCachedLeads,
} from "@/lib/cache/domains/leadsCache";
export {
  clearCachedSetterAiMessages,
  getCachedSetterAiMessages,
  getCachedSetterAiMessagesTimestamp,
  getCachedSetterAiSessions,
  getCachedSetterAiSessionsTimestamp,
  getDeletedSetterAiSessionIds,
  getHotCachedSetterAiSessions,
  getHotSetterAiLastEmail,
  getSetterAiLastEmail,
  markDeletedSetterAiSessionId,
  removeCachedSetterAiSession,
  replaceCachedSetterAiSessionId,
  setCachedSetterAiMessages,
  setCachedSetterAiSessions,
  setSetterAiLastEmail,
  unmarkDeletedSetterAiSessionId,
} from "@/lib/cache/domains/setterAiCache";
export type { InboxTagsCacheRecord } from "@/lib/cache/domains/tagsCache";
export {
  clearCachedInboxTags,
  getCachedInboxTags,
  setCachedInboxTags,
} from "@/lib/cache/domains/tagsCache";

export async function flushCacheWrites(): Promise<void> {
  await flushAllLayeredCaches();
}

export async function clearCache(): Promise<void> {
  await clearAllLayeredCaches();
}

export async function resetCache(): Promise<void> {
  prepareLayeredCachesForDatabaseReset();
  await resetAppCacheDb();
  await deleteLegacyCacheDatabases();
}
