"use client";

import { Inter } from "next/font/google"; // Import Inter
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  updateConversationPriorityAction,
  updateUserStatusAction,
} from "@/app/actions/inbox";
import ConversationList from "@/components/inbox/ConversationList";
import { useInboxSync } from "@/components/inbox/InboxSyncContext";
import {
  getCachedUsers,
  setCachedUsers,
} from "@/lib/cache";
import {
  findConversationForRealtimeMessage,
} from "@/lib/inbox/clientConversationSync";
import { prefetchConversationDetailsBatchToCache } from "@/lib/inbox/clientDetailsPrefetch";
import { prefetchConversationMessagePagesToCache } from "@/lib/inbox/clientMessagePrefetch";
import {
  emitInboxConversationsRefreshed,
  INBOX_MESSAGE_EVENT,
  INBOX_SSE_EVENT,
  type InboxRealtimeMessageDetail,
} from "@/lib/inbox/clientRealtimeEvents";
import {
  buildStatusLookup,
  loadInboxStatusCatalog,
} from "@/lib/inbox/clientStatusCatalog";
import {
  dequeueConversationPreviewHydrations,
  getQueuedConversationPreviewHydrations,
  type ConversationPreviewHydrationPayload,
} from "@/lib/inbox/clientPreviewSync";
import { subscribeInboxStatusCatalogChanged } from "@/lib/inbox/clientStatusCatalogSync";
import {
  CONVERSATION_STATUS_SYNCED_EVENT,
  emitConversationStatusSynced,
  syncConversationStatusToClientCache,
} from "@/lib/status/clientSync";
import {
  getInboxStatusColorClass,
  isStatusType,
} from "@/lib/status/config";
import { PRESET_TAG_ROWS } from "@/lib/tags/config";
import type { SSEEvent, SSEMessageData, StatusType, User } from "@/types/inbox";
import type { TagRow } from "@/types/tags";
import FilterModal from "./FilterModal";
import {
  SidebarEmptyState,
  SidebarLoadingState,
  SidebarNoConnectedAccountsState,
} from "./sidebar/SidebarContentState";
import SidebarHeader from "./sidebar/SidebarHeader";
import SidebarSearchBar from "./sidebar/SidebarSearchBar";
import SidebarTabs, { type SidebarTab } from "./sidebar/SidebarTabs";
import {
  buildRealtimePreviewText,
  getChangedConversationIds,
  mergeUsersWithLocalRecency,
  normalizeUsersFromBackend,
  sortUsersByRecency,
} from "./sidebar/utils";

const inter = Inter({ subsets: ["latin"] });
const SIDEBAR_PREFETCH_MAX_CONVERSATIONS = 12;
const SIDEBAR_PREFETCH_CONCURRENCY = 2;
const SIDEBAR_PREFETCH_STALE_MS = 3 * 60 * 1000;

interface InboxSidebarProps {
  width?: number;
}

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

export default function InboxSidebar({ width }: InboxSidebarProps) {
  const router = useRouter();
  const params = useParams();
  const selectedUserId = params?.id as string;
  const { epoch, markSidebarReady } = useInboxSync();

  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<SidebarTab>("all");
  const [loading, setLoading] = useState(true);
  const [hasConnectedAccounts, setHasConnectedAccounts] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<StatusType[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [statusCatalog, setStatusCatalog] = useState<TagRow[]>(PRESET_TAG_ROWS);
  const [statusLookup, setStatusLookup] = useState<Record<string, TagRow>>(
    () => buildStatusLookup(PRESET_TAG_ROWS),
  );

  const refetchInFlightRef = useRef(false);
  const statusCatalogRefreshInFlightRef = useRef(false);

  const fetchInboxUsers = useCallback(async (): Promise<User[]> => {
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
  }, []);

  const fetchInboxConnectionState = useCallback(async () => {
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
  }, []);

  const prefetchConversationData = useCallback((list: User[]) => {
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
  }, []);

  const applyHydratedPreview = useCallback(
    (payload: ConversationPreviewHydrationPayload): boolean => {
      let applied = false;
      setUsers((prev) => {
        const idx = prev.findIndex((u) => u.id === payload.userId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          lastMessage: payload.lastMessage || updated[idx].lastMessage,
          time: payload.time || updated[idx].time,
          updatedAt: payload.updatedAt || updated[idx].updatedAt,
          unread: payload.clearUnread ? 0 : updated[idx].unread,
          needsReply: payload.clearUnread ? false : updated[idx].needsReply,
        };
        const sorted = sortUsersByRecency(updated);
        setCachedUsers(sorted).catch((err) => console.error(err));
        applied = true;
        return sorted;
      });
      return applied;
    },
    [],
  );

  // Filter persistence
  useEffect(() => {
    const saved = localStorage.getItem("inbox_filter_statuses");
    if (saved) setSelectedStatuses(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem(
      "inbox_filter_statuses",
      JSON.stringify(selectedStatuses),
    );
  }, [selectedStatuses]);
  useEffect(() => {
    const saved = localStorage.getItem("inbox_filter_accounts");
    if (saved) setSelectedAccountIds(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem(
      "inbox_filter_accounts",
      JSON.stringify(selectedAccountIds),
    );
  }, [selectedAccountIds]);

  const refetchConversations = useCallback(async () => {
    if (refetchInFlightRef.current) return;
    refetchInFlightRef.current = true;
    try {
      const freshUsers = await fetchInboxUsers();
      const normalized = normalizeUsersFromBackend(freshUsers);
      prefetchConversationData(normalized);
      setUsers((prev) => {
        const merged = mergeUsersWithLocalRecency(prev, normalized);
        const changedConversationIds = getChangedConversationIds(prev, merged);
        setCachedUsers(merged).catch((e) => console.error(e));
        if (changedConversationIds.length > 0) {
          emitInboxConversationsRefreshed({
            conversationIds: changedConversationIds,
          });
        }
        return merged;
      });
    } finally {
      refetchInFlightRef.current = false;
    }
  }, [fetchInboxUsers, prefetchConversationData]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetchConversations().catch((error) => {
          console.error("Failed to refresh conversations:", error);
        });
      }
    };

    const onFocus = () => {
      refetchConversations().catch((error) => {
        console.error("Failed to refresh conversations:", error);
      });
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [refetchConversations]);

  const applyUserStatusUpdate = useCallback(
    (userId: string, status: StatusType, updatedAt?: string) => {
      const nextUpdatedAt = updatedAt ?? new Date().toISOString();
      setUsers((prev) => {
        const idx = prev.findIndex((u) => u.id === userId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          status,
          statusColor: getInboxStatusColorClass(status),
          updatedAt: nextUpdatedAt,
        };
        setCachedUsers(updated).catch((e) => console.error(e));
        return updated;
      });
    },
    [],
  );

  const applyUserPriorityUpdate = useCallback(
    (userId: string, isPriority: boolean) => {
      setUsers((prev) => {
        const idx = prev.findIndex((u) => u.id === userId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          isPriority,
        };
        setCachedUsers(updated).catch((e) => console.error(e));
        return updated;
      });
    },
    [],
  );

  const refreshStatusCatalog = useCallback(async () => {
    if (statusCatalogRefreshInFlightRef.current) return;

    statusCatalogRefreshInFlightRef.current = true;
    try {
      const statuses = await loadInboxStatusCatalog();
      setStatusCatalog(statuses);
      setStatusLookup(buildStatusLookup(statuses));
    } catch (error) {
      console.error("Failed to load inbox statuses:", error);
    } finally {
      statusCatalogRefreshInFlightRef.current = false;
    }
  }, []);

  const applyOptimisticRealtimePreview = useCallback(
    (eventType: "new_message" | "message_echo", data: SSEMessageData) => {
      setUsers((prev) => {
        const matchedConversation = findConversationForRealtimeMessage(
          prev,
          data,
        );
        if (!matchedConversation) return prev;

        const idx = prev.findIndex(
          (user) => user.id === matchedConversation.id,
        );
        if (idx === -1) return prev;

        const previewText = buildRealtimePreviewText(eventType, data);
        const updatedAt = new Date(data.timestamp).toISOString();
        const next = [...prev];
        const current = next[idx];
        const outgoing = eventType === "message_echo" || Boolean(data.fromMe);
        next[idx] = {
          ...current,
          lastMessage: previewText,
          time: new Date(data.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          updatedAt,
          unread: outgoing ? 0 : (current.unread ?? 0) + 1,
          needsReply: !outgoing,
        };

        return sortUsersByRecency(next);
      });
    },
    [],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<InboxRealtimeMessageDetail>;
      if (!customEvent.detail?.type || !customEvent.detail?.data) return;
      applyOptimisticRealtimePreview(
        customEvent.detail.type,
        customEvent.detail.data,
      );
    };

    window.addEventListener(INBOX_MESSAGE_EVENT, handler);
    return () => window.removeEventListener(INBOX_MESSAGE_EVENT, handler);
  }, [applyOptimisticRealtimePreview]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<SSEEvent>;
      const message = customEvent.detail;
      if (!message || typeof message !== "object") return;

      if (message.type === "user_status_updated") {
        if (isStatusType(message.data.status)) {
          applyUserStatusUpdate(
            message.data.conversationId,
            message.data.status,
            message.timestamp,
          );
          syncConversationStatusToClientCache(
            message.data.conversationId,
            message.data.status,
          ).catch((error) =>
            console.error("Failed to sync status cache:", error),
          );
          emitConversationStatusSynced({
            conversationId: message.data.conversationId,
            status: message.data.status,
            updatedAt:
              typeof message.timestamp === "string"
                ? message.timestamp
                : undefined,
          });
        }
        return;
      }

      if (message.type === "conversation_priority_updated") {
        applyUserPriorityUpdate(
          message.data.conversationId,
          Boolean(message.data.isPriority),
        );
      }
    };

    window.addEventListener(INBOX_SSE_EVENT, handler);
    return () => window.removeEventListener(INBOX_SSE_EVENT, handler);
  }, [applyUserPriorityUpdate, applyUserStatusUpdate]);

  useEffect(() => {
    const legacyHandler = (e: Event) => {
      const customEvent = e as CustomEvent<{
        userId?: string;
        status?: StatusType;
        updatedAt?: string;
      }>;
      if (
        !customEvent.detail?.userId ||
        !isStatusType(customEvent.detail?.status)
      )
        return;
      applyUserStatusUpdate(
        customEvent.detail.userId,
        customEvent.detail.status,
        customEvent.detail.updatedAt,
      );
    };
    const statusSyncedHandler = (e: Event) => {
      const customEvent = e as CustomEvent<{
        conversationId?: string;
        status?: StatusType;
        updatedAt?: string;
      }>;
      if (
        !customEvent.detail?.conversationId ||
        !isStatusType(customEvent.detail?.status)
      )
        return;
      applyUserStatusUpdate(
        customEvent.detail.conversationId,
        customEvent.detail.status,
        customEvent.detail.updatedAt,
      );
    };
    const previewHydratedHandler = (e: Event) => {
      const customEvent = e as CustomEvent<{
        userId?: string;
        lastMessage?: string;
        time?: string;
        updatedAt?: string;
        clearUnread?: boolean;
      }>;
      const payload = customEvent.detail;
      if (!payload?.userId || !payload.lastMessage) return;
      const applied = applyHydratedPreview({
        userId: payload.userId,
        lastMessage: payload.lastMessage,
        time: payload.time,
        updatedAt: payload.updatedAt,
        clearUnread: payload.clearUnread,
      });
      if (applied) {
        dequeueConversationPreviewHydrations([payload.userId]);
      }
    };

    window.addEventListener("userStatusUpdated", legacyHandler);
    window.addEventListener(
      CONVERSATION_STATUS_SYNCED_EVENT,
      statusSyncedHandler,
    );
    window.addEventListener(
      "conversationPreviewHydrated",
      previewHydratedHandler,
    );
    return () => {
      window.removeEventListener("userStatusUpdated", legacyHandler);
      window.removeEventListener(
        CONVERSATION_STATUS_SYNCED_EVENT,
        statusSyncedHandler,
      );
      window.removeEventListener(
        "conversationPreviewHydrated",
        previewHydratedHandler,
      );
    };
  }, [applyHydratedPreview, applyUserStatusUpdate]);

  useEffect(() => {
    if (users.length === 0) return;
    const queued = getQueuedConversationPreviewHydrations();
    if (queued.length === 0) return;

    const appliedIds: string[] = [];
    for (const payload of queued) {
      if (applyHydratedPreview(payload)) {
        appliedIds.push(payload.userId);
      }
    }

    if (appliedIds.length > 0) {
      dequeueConversationPreviewHydrations(appliedIds);
    }
  }, [users.length, applyHydratedPreview]);

  useEffect(() => {
    refreshStatusCatalog().catch((error) =>
      console.error("Failed to initialize inbox statuses:", error),
    );
  }, [refreshStatusCatalog]);

  useEffect(() => {
    return subscribeInboxStatusCatalogChanged((statuses) => {
      if (Array.isArray(statuses)) {
        setStatusCatalog(statuses);
        setStatusLookup(buildStatusLookup(statuses));
        return;
      }
      refreshStatusCatalog().catch((error) =>
        console.error(
          "Failed to refresh inbox statuses after catalog update:",
          error,
        ),
      );
    });
  }, [refreshStatusCatalog]);

  useEffect(() => {
    async function loadUsers() {
      const currentEpoch = epoch;
      try {
        const cached = await getCachedUsers();
        if (cached?.length) {
          setUsers(sortUsersByRecency(normalizeUsersFromBackend(cached)));
          setLoading(false);
        }

        const connectionState = await fetchInboxConnectionState();
        setHasConnectedAccounts(connectionState.hasConnectedAccounts);

        if (!connectionState.hasConnectedAccounts) {
          setUsers([]);
          setCachedUsers([]).catch((e) => console.error(e));
          return;
        }

        const fresh = await fetchInboxUsers();
        const normalized = normalizeUsersFromBackend(fresh);
        prefetchConversationData(normalized);
        setUsers((prev) => {
          const merged = mergeUsersWithLocalRecency(prev, normalized);
          setCachedUsers(merged).catch((e) => console.error(e));
          return merged;
        });
      } catch (err) {
        console.error("Error loading conversations:", err);
      } finally {
        setLoading(false);
        markSidebarReady(currentEpoch);
      }
    }
    loadUsers();
  }, [
    epoch,
    fetchInboxConnectionState,
    fetchInboxUsers,
    markSidebarReady,
    prefetchConversationData,
  ]);

  const filteredUsers = users.filter((u) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "priority" && Boolean(u.isPriority)) ||
      (activeTab === "unread" && (u.unread ?? 0) > 0);
    const matchesStatus =
      selectedStatuses.length === 0 || selectedStatuses.includes(u.status);
    const matchesAccount =
      selectedAccountIds.length === 0 ||
      (u.accountId ? selectedAccountIds.includes(u.accountId) : false);
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.lastMessage?.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesStatus && matchesAccount && matchesSearch;
  });

  const accountOptions = Array.from(
    new Map(
      users
        .filter((u): u is User & { accountId: string } => Boolean(u.accountId))
        .map((u) => [
          u.accountId,
          {
            id: u.accountId,
            label: u.accountLabel || u.ownerInstagramUserId || u.accountId,
          },
        ]),
    ).values(),
  );

  const handleConversationAction = useCallback(
    async (
      userId: string,
      action: "qualified" | "priority" | "unpriority" | "delete",
    ) => {
      if (action === "delete") {
        return;
      }

      if (action === "qualified") {
        const nextStatus: StatusType = "Qualified";
        const previousStatus = users.find((u) => u.id === userId)?.status;

        applyUserStatusUpdate(userId, nextStatus);
        emitConversationStatusSynced({
          conversationId: userId,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        });
        syncConversationStatusToClientCache(userId, nextStatus).catch((error) =>
          console.error("Failed to sync status cache:", error),
        );

        try {
          await updateUserStatusAction(userId, nextStatus);
        } catch (error) {
          console.error("Failed to update status from quick actions:", error);
          if (previousStatus) {
            applyUserStatusUpdate(userId, previousStatus);
            emitConversationStatusSynced({
              conversationId: userId,
              status: previousStatus,
              updatedAt: new Date().toISOString(),
            });
            syncConversationStatusToClientCache(userId, previousStatus).catch(
              (cacheError) =>
                console.error("Failed to sync status cache:", cacheError),
            );
          }
        }
        return;
      }

      const nextPriority = action === "priority";
      const previousPriority = Boolean(
        users.find((u) => u.id === userId)?.isPriority,
      );
      applyUserPriorityUpdate(userId, nextPriority);

      try {
        await updateConversationPriorityAction(userId, nextPriority);
      } catch (error) {
        console.error("Failed to update priority from quick actions:", error);
        applyUserPriorityUpdate(userId, previousPriority);
      }
    },
    [applyUserPriorityUpdate, applyUserStatusUpdate, users],
  );

  return (
    <aside
      className={`${inter.className} bg-white flex flex-col flex-shrink-0 h-full antialiased`}
      style={width ? { width: `${width}px` } : undefined}
    >
      <SidebarHeader />

      {hasConnectedAccounts && (
        <SidebarSearchBar
          search={search}
          onSearchChange={setSearch}
          selectedStatusesCount={selectedStatuses.length}
          onOpenFilters={() => setShowFilterModal(true)}
        />
      )}

      {hasConnectedAccounts && (
        <SidebarTabs
          activeTab={activeTab}
          users={users}
          onTabChange={setActiveTab}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        {!hasConnectedAccounts ? (
          <SidebarNoConnectedAccountsState />
        ) : filteredUsers.length > 0 ? (
          <ConversationList
            users={filteredUsers}
            selectedUserId={selectedUserId}
            onSelectUser={(id) => router.push(`/inbox/${id}`)}
            onAction={handleConversationAction}
            statusLookup={statusLookup}
          />
        ) : loading ? (
          <SidebarLoadingState />
        ) : (
          <SidebarEmptyState
            hasActiveFilters={
              Boolean(search) ||
              selectedStatuses.length > 0 ||
              selectedAccountIds.length > 0 ||
              activeTab !== "all"
            }
          />
        )}
      </div>

      {/* Filter Modal */}
      <FilterModal
        show={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        selectedStatuses={selectedStatuses}
        setSelectedStatuses={setSelectedStatuses}
        statusOptions={statusCatalog}
        accountOptions={accountOptions}
        selectedAccountIds={selectedAccountIds}
        setSelectedAccountIds={setSelectedAccountIds}
      />
    </aside>
  );
}
