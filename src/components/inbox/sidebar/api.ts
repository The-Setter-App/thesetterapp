import { prefetchConversationDetailsBatchToCache } from "@/lib/inbox/clientDetailsPrefetch";
import { prefetchConversationMessagePagesToCache } from "@/lib/inbox/clientMessagePrefetch";
import type { User } from "@/types/inbox";

const SIDEBAR_PREFETCH_MAX_CONVERSATIONS = 12;
const SIDEBAR_PREFETCH_CONCURRENCY = 2;
const SIDEBAR_PREFETCH_STALE_MS = 3 * 60 * 1000;

interface InboxUsersResponse {
  users?: User[];
  error?: string;
}

interface InboxConnectionStateResponse {
  hasConnectedAccounts?: boolean;
  connectedCount?: number;
  error?: string;
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchInboxUsers(): Promise<User[]> {
  const response = await fetch("/api/inbox/conversations", {
    method: "GET",
    cache: "no-store",
  });
  const payload = await parseJsonSafe<InboxUsersResponse>(response);
  if (!response.ok) {
    throw new Error(
      payload?.error ??
        `Failed to load conversations (status ${response.status})`,
    );
  }
  return Array.isArray(payload?.users) ? payload.users : [];
}

export async function fetchInboxConnectionState(): Promise<{
  hasConnectedAccounts: boolean;
  connectedCount: number;
}> {
  const response = await fetch("/api/inbox/connection-state", {
    method: "GET",
    cache: "no-store",
  });
  const payload = await parseJsonSafe<InboxConnectionStateResponse>(response);
  if (!response.ok) {
    throw new Error(
      payload?.error ??
        `Failed to load inbox connection state (status ${response.status})`,
    );
  }
  return {
    hasConnectedAccounts: Boolean(payload?.hasConnectedAccounts),
    connectedCount:
      typeof payload?.connectedCount === "number" ? payload.connectedCount : 0,
  };
}

export function prefetchConversationData(list: User[]): void {
  if (!Array.isArray(list) || list.length === 0) return;

  const conversationIds = list.map((user) => user.id);
  const maxConversations = Math.min(
    list.length,
    SIDEBAR_PREFETCH_MAX_CONVERSATIONS,
  );

  Promise.allSettled([
    prefetchConversationMessagePagesToCache({
      conversationIds,
      maxConversations,
      concurrency: SIDEBAR_PREFETCH_CONCURRENCY,
      staleMs: SIDEBAR_PREFETCH_STALE_MS,
    }),
    prefetchConversationDetailsBatchToCache({
      conversationIds,
      maxConversations,
      concurrency: SIDEBAR_PREFETCH_CONCURRENCY,
    }),
  ]).then((results) => {
    const messageResult = results[0];
    const detailsResult = results[1];
    if (messageResult.status === "rejected") {
      console.error(
        "[InboxSidebar] Failed to prefetch conversation messages:",
        messageResult.reason,
      );
    }
    if (detailsResult.status === "rejected") {
      console.error(
        "[InboxSidebar] Failed to prefetch conversation details:",
        detailsResult.reason,
      );
    }
  });
}
