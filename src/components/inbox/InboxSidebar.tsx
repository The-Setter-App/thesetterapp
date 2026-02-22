"use client";

import { Inter } from "next/font/google"; // Import Inter
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getInboxConnectionState,
  getInboxUsers,
  updateConversationPriorityAction,
  updateUserStatusAction,
} from "@/app/actions/inbox";
import ConversationList from "@/components/inbox/ConversationList";
import { useInboxSync } from "@/components/inbox/InboxSyncContext";
import { useSSE } from "@/hooks/useSSE";
import {
  getCachedUsers,
  setCachedUsers,
  updateCachedMessages,
} from "@/lib/clientCache";
import {
  fetchLatestConversationMessages,
  findConversationForRealtimeMessage,
} from "@/lib/inbox/clientConversationSync";
import { emitInboxRealtimeMessage } from "@/lib/inbox/clientRealtimeEvents";
import {
  buildTagLookup,
  loadInboxTagCatalog,
} from "@/lib/inbox/clientTagCatalog";
import {
  CONVERSATION_TAGS_SYNCED_EVENT,
  type ConversationTagsSyncedDetail,
} from "@/lib/inbox/clientTagSync";
import {
  CONVERSATION_STATUS_SYNCED_EVENT,
  emitConversationStatusSynced,
  syncConversationStatusToClientCache,
} from "@/lib/status/clientSync";
import {
  INBOX_STATUS_COLOR_CLASS_MAP,
  isStatusType,
  STATUS_OPTIONS,
} from "@/lib/status/config";
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
  mapRealtimePayloadToMessage,
  mergeMessageCacheSnapshots,
  mergeUsersWithLocalRecency,
  normalizeUsersFromBackend,
  sortUsersByRecency,
} from "./sidebar/utils";

const inter = Inter({ subsets: ["latin"] });

const statusOptions: StatusType[] = STATUS_OPTIONS;

interface InboxSidebarProps {
  width?: number;
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
  const [tagLookup, setTagLookup] = useState<Record<string, TagRow>>({});

  const refetchInFlightRef = useRef(false);
  const realtimeSyncQueueRef = useRef<Promise<void>>(Promise.resolve());

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
      const freshUsers = await getInboxUsers();
      const sorted = sortUsersByRecency(normalizeUsersFromBackend(freshUsers));
      setUsers(sorted);
      setCachedUsers(sorted).catch((e) => console.error(e));
    } finally {
      refetchInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    const REFRESH_INTERVAL_MS = 45000;
    let intervalId: number | null = null;

    const startInterval = () => {
      if (intervalId !== null) return;
      intervalId = window.setInterval(() => {
        if (document.visibilityState !== "visible") return;
        refetchConversations().catch((error) => {
          console.error("Failed to refresh conversations:", error);
        });
      }, REFRESH_INTERVAL_MS);
    };

    const stopInterval = () => {
      if (intervalId === null) return;
      window.clearInterval(intervalId);
      intervalId = null;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetchConversations().catch((error) => {
          console.error("Failed to refresh conversations:", error);
        });
        startInterval();
        return;
      }
      stopInterval();
    };

    const onFocus = () => {
      refetchConversations().catch((error) => {
        console.error("Failed to refresh conversations:", error);
      });
    };

    if (document.visibilityState === "visible") {
      startInterval();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      stopInterval();
    };
  }, [refetchConversations]);

  const applyUserStatusUpdate = useCallback(
    (userId: string, status: StatusType) => {
      setUsers((prev) => {
        const idx = prev.findIndex((u) => u.id === userId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          status,
          statusColor: INBOX_STATUS_COLOR_CLASS_MAP[status],
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

  const applyUserTagsUpdate = useCallback(
    (userId: string, tagIds: string[]) => {
      setUsers((prev) => {
        const idx = prev.findIndex((u) => u.id === userId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          tagIds,
        };
        setCachedUsers(updated).catch((error) => console.error(error));
        return updated;
      });
    },
    [],
  );

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
        };

        const optimisticMessage = mapRealtimePayloadToMessage(eventType, data);
        updateCachedMessages(matchedConversation.id, (existing) => {
          const messages = existing ?? [];
          if (messages.some((message) => message.id === optimisticMessage.id)) {
            return messages;
          }
          return [...messages, optimisticMessage].sort((a, b) => {
            const aTs = Date.parse(a.timestamp || "");
            const bTs = Date.parse(b.timestamp || "");
            if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) {
              return aTs - bTs;
            }
            return a.id.localeCompare(b.id);
          });
        }).catch((error) =>
          console.error("Failed optimistic message cache update:", error),
        );

        const sorted = sortUsersByRecency(next);
        setCachedUsers(sorted).catch((error) => console.error(error));
        return sorted;
      });
    },
    [],
  );

  const syncRealtimeConversationFromMongo = useCallback(
    async (eventType: "new_message" | "message_echo", data: SSEMessageData) => {
      const freshUsers = sortUsersByRecency(
        normalizeUsersFromBackend(await getInboxUsers()),
      );
      const matchedConversation = findConversationForRealtimeMessage(
        freshUsers,
        data,
      );
      const targetConversationId =
        matchedConversation?.id || data.conversationId || null;
      if (targetConversationId) {
        const latestMessages =
          await fetchLatestConversationMessages(targetConversationId);
        await updateCachedMessages(targetConversationId, (existing) =>
          mergeMessageCacheSnapshots(existing, latestMessages),
        );
      }

      setUsers((previousUsers) => {
        const mergedUsers = mergeUsersWithLocalRecency(
          previousUsers,
          freshUsers,
        );
        setCachedUsers(mergedUsers).catch((error) => console.error(error));
        return mergedUsers;
      });
      if (!targetConversationId) return;

      emitInboxRealtimeMessage({
        type: eventType,
        data: {
          ...data,
          conversationId: targetConversationId,
        },
      });
    },
    [],
  );

  const handleSidebarMessageEvent = useCallback(
    (eventType: "new_message" | "message_echo", data: SSEMessageData) => {
      applyOptimisticRealtimePreview(eventType, data);
      realtimeSyncQueueRef.current = realtimeSyncQueueRef.current
        .catch(() => undefined)
        .then(() => syncRealtimeConversationFromMongo(eventType, data))
        .catch((error) => {
          console.error(
            "Failed to synchronize realtime conversation snapshot:",
            error,
          );
        });
    },
    [applyOptimisticRealtimePreview, syncRealtimeConversationFromMongo],
  );

  useSSE("/api/sse", {
    onMessage: (message: SSEEvent) => {
      if (message.type === "new_message") {
        handleSidebarMessageEvent("new_message", message.data);
      } else if (message.type === "message_echo") {
        handleSidebarMessageEvent("message_echo", message.data);
      } else if (message.type === "user_status_updated") {
        if (isStatusType(message.data.status)) {
          applyUserStatusUpdate(
            message.data.conversationId,
            message.data.status,
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
          });
        }
      } else if (message.type === "conversation_priority_updated") {
        applyUserPriorityUpdate(
          message.data.conversationId,
          Boolean(message.data.isPriority),
        );
      }
    },
  });

  useEffect(() => {
    const legacyHandler = (e: Event) => {
      const customEvent = e as CustomEvent<{
        userId?: string;
        status?: StatusType;
      }>;
      if (
        !customEvent.detail?.userId ||
        !isStatusType(customEvent.detail?.status)
      )
        return;
      applyUserStatusUpdate(
        customEvent.detail.userId,
        customEvent.detail.status,
      );
    };
    const statusSyncedHandler = (e: Event) => {
      const customEvent = e as CustomEvent<{
        conversationId?: string;
        status?: StatusType;
      }>;
      if (
        !customEvent.detail?.conversationId ||
        !isStatusType(customEvent.detail?.status)
      )
        return;
      applyUserStatusUpdate(
        customEvent.detail.conversationId,
        customEvent.detail.status,
      );
    };
    const previewHydratedHandler = (e: Event) => {
      const customEvent = e as CustomEvent<{
        userId?: string;
        lastMessage?: string;
        time?: string;
        updatedAt?: string;
      }>;
      const payload = customEvent.detail;
      if (!payload?.userId || !payload.lastMessage) return;

      setUsers((prev) => {
        const idx = prev.findIndex((u) => u.id === payload.userId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          lastMessage: payload.lastMessage || updated[idx].lastMessage,
          time: payload.time || updated[idx].time,
          updatedAt: payload.updatedAt || updated[idx].updatedAt,
        };
        const sorted = sortUsersByRecency(updated);
        setCachedUsers(sorted).catch((err) => console.error(err));
        return sorted;
      });
    };
    const conversationTagsSyncedHandler = (e: Event) => {
      const customEvent = e as CustomEvent<ConversationTagsSyncedDetail>;
      if (
        !customEvent.detail?.conversationId ||
        !Array.isArray(customEvent.detail?.tagIds)
      ) {
        return;
      }
      applyUserTagsUpdate(
        customEvent.detail.conversationId,
        customEvent.detail.tagIds,
      );
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
    window.addEventListener(
      CONVERSATION_TAGS_SYNCED_EVENT,
      conversationTagsSyncedHandler,
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
      window.removeEventListener(
        CONVERSATION_TAGS_SYNCED_EVENT,
        conversationTagsSyncedHandler,
      );
    };
  }, [applyUserStatusUpdate, applyUserTagsUpdate]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const tags = await loadInboxTagCatalog();
        if (!active) return;
        setTagLookup(buildTagLookup(tags));
      } catch (error) {
        console.error("Failed to load inbox tags:", error);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    async function loadUsers() {
      const currentEpoch = epoch;
      try {
        const cached = await getCachedUsers();
        if (cached?.length) {
          setUsers(sortUsersByRecency(normalizeUsersFromBackend(cached)));
          setLoading(false);
        }

        const connectionState = await getInboxConnectionState();
        setHasConnectedAccounts(connectionState.hasConnectedAccounts);

        if (!connectionState.hasConnectedAccounts) {
          setUsers([]);
          setCachedUsers([]).catch((e) => console.error(e));
          return;
        }

        const fresh = await getInboxUsers();
        const sorted = sortUsersByRecency(normalizeUsersFromBackend(fresh));
        setUsers(sorted);
        setCachedUsers(sorted).catch((e) => console.error(e));
      } catch (err) {
        console.error("Error loading conversations:", err);
      } finally {
        setLoading(false);
        markSidebarReady(currentEpoch);
      }
    }
    loadUsers();
  }, [epoch, markSidebarReady]);

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
            tagLookup={tagLookup}
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
        statusOptions={statusOptions}
        accountOptions={accountOptions}
        selectedAccountIds={selectedAccountIds}
        setSelectedAccountIds={setSelectedAccountIds}
      />
    </aside>
  );
}
