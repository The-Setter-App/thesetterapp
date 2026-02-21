"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Inter } from 'next/font/google'; // Import Inter
import { getInboxConnectionState, getInboxUsers, updateConversationPriorityAction, updateUserStatusAction } from '@/app/actions/inbox';
import { getCachedUsers, setCachedUsers, updateCachedMessages } from '@/lib/clientCache';
import {
  fetchLatestConversationMessages,
  findConversationForRealtimeMessage,
} from '@/lib/inbox/clientConversationSync';
import { INBOX_STATUS_COLOR_CLASS_MAP, isStatusType, STATUS_OPTIONS } from '@/lib/status/config';
import type { Message, User, SSEMessageData, StatusType } from '@/types/inbox';
import ConversationList from '@/components/inbox/ConversationList';
import { useSSE } from '@/hooks/useSSE';
import { useInboxSync } from '@/components/inbox/InboxSyncContext';
import Image from 'next/image';
import Link from 'next/link';
import FilterModal from './FilterModal';
import {
  CONVERSATION_STATUS_SYNCED_EVENT,
  emitConversationStatusSynced,
  syncConversationStatusToClientCache,
} from '@/lib/status/clientSync';
import { emitInboxRealtimeMessage } from '@/lib/inbox/clientRealtimeEvents';

const inter = Inter({ subsets: ['latin'] });

// --- Icons ---
const SearchIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const FilterIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
  </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const statusOptions: StatusType[] = STATUS_OPTIONS;

function getTimestampMs(value?: string): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function isRelativeTimeLabel(value?: string): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized === 'just now' ||
    normalized === 'yesterday' ||
    normalized.endsWith(' min') ||
    normalized.endsWith(' mins') ||
    normalized.endsWith(' hour') ||
    normalized.endsWith(' hours') ||
    normalized.endsWith(' day') ||
    normalized.endsWith(' days')
  );
}

function getStableDisplayTime(updatedAt?: string, currentLabel?: string): string {
  if (!updatedAt) return currentLabel || '';
  const ms = Date.parse(updatedAt);
  if (!Number.isFinite(ms)) return currentLabel || '';
  if (!isRelativeTimeLabel(currentLabel)) return currentLabel || '';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function normalizeUsersFromBackend(list: User[]): User[] {
  return list.map((user) => ({
    ...user,
    time: getStableDisplayTime(user.updatedAt, user.time),
  }));
}

function sortUsersByRecency(list: User[]): User[] {
  return [...list].sort((a, b) => {
    const timeDiff = getTimestampMs(b.updatedAt) - getTimestampMs(a.updatedAt);
    if (timeDiff !== 0) return timeDiff;

    const unreadDiff = (b.unread ?? 0) - (a.unread ?? 0);
    if (unreadDiff !== 0) return unreadDiff;

    return b.id.localeCompare(a.id);
  });
}

function mergeUsersWithLocalRecency(previous: User[], incoming: User[]): User[] {
  const previousById = new Map(previous.map((user) => [user.id, user]));
  const merged = incoming.map((incomingUser) => {
    const previousUser = previousById.get(incomingUser.id);
    if (!previousUser) return incomingUser;
    return getTimestampMs(previousUser.updatedAt) > getTimestampMs(incomingUser.updatedAt)
      ? previousUser
      : incomingUser;
  });

  const incomingIds = new Set(incoming.map((user) => user.id));
  for (const previousUser of previous) {
    if (!incomingIds.has(previousUser.id)) {
      merged.push(previousUser);
    }
  }

  return sortUsersByRecency(merged);
}

function mapRealtimePayloadToMessage(eventType: 'new_message' | 'message_echo', data: SSEMessageData): Message {
  const attachment = data.attachments?.[0];
  const payloadUrl = attachment?.payload?.url;
  const fileUrl = attachment?.file_url || payloadUrl;
  const isAudio =
    attachment?.type === 'audio' ||
    Boolean(fileUrl && (
      fileUrl.includes('audio') ||
      fileUrl.endsWith('.mp3') ||
      fileUrl.endsWith('.m4a') ||
      fileUrl.endsWith('.ogg') ||
      fileUrl.endsWith('.webm') ||
      fileUrl.endsWith('.mp4')
    ));
  const isImage =
    attachment?.type === 'image' ||
    Boolean(attachment?.image_data?.url);
  const isVideo =
    attachment?.type === 'video' ||
    Boolean(attachment?.video_data?.url);

  let type: Message['type'] = 'text';
  let attachmentUrl: string | undefined;

  if (isImage) {
    type = 'image';
    attachmentUrl = attachment?.image_data?.url || fileUrl;
  } else if (isVideo) {
    type = 'video';
    attachmentUrl = attachment?.video_data?.url || fileUrl;
  } else if (isAudio) {
    type = 'audio';
    attachmentUrl = fileUrl;
  } else if (attachment) {
    type = 'file';
    attachmentUrl = fileUrl;
  }

  return {
    id: data.messageId,
    fromMe: eventType === 'message_echo' || Boolean(data.fromMe),
    type,
    text: data.text || '',
    duration: data.duration,
    timestamp: new Date(data.timestamp).toISOString(),
    attachmentUrl,
  };
}

function buildRealtimePreviewText(eventType: 'new_message' | 'message_echo', data: SSEMessageData): string {
  const text = (data.text || '').trim();
  if (text) return text;

  const attachment = data.attachments?.[0];
  const payloadUrl = attachment?.payload?.url;
  const fileUrl = attachment?.file_url || payloadUrl;
  const outgoing = eventType === 'message_echo' || Boolean(data.fromMe);
  const isAudio =
    attachment?.type === 'audio' ||
    Boolean(fileUrl && (
      fileUrl.includes('audio') ||
      fileUrl.endsWith('.mp3') ||
      fileUrl.endsWith('.m4a') ||
      fileUrl.endsWith('.ogg') ||
      fileUrl.endsWith('.webm') ||
      fileUrl.endsWith('.mp4')
    ));
  const isImage =
    attachment?.type === 'image' ||
    Boolean(attachment?.image_data?.url);
  const isVideo =
    attachment?.type === 'video' ||
    Boolean(attachment?.video_data?.url);
  const hasAttachment = Boolean(attachment);

  if (isAudio) return outgoing ? 'You sent a voice message' : 'Sent a voice message';
  if (isImage) return outgoing ? 'You sent an image' : 'Sent an image';
  if (isVideo) return outgoing ? 'You sent a video' : 'Sent a video';
  if (hasAttachment) return outgoing ? 'You sent an attachment' : 'Sent an attachment';
  return outgoing ? 'You sent a message' : 'Sent a message';
}

function mergeMessageCacheSnapshots(existing: Message[] | null, incoming: Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const message of existing ?? []) {
    byId.set(message.id, message);
  }
  for (const message of incoming) {
    const current = byId.get(message.id);
    byId.set(message.id, current ? { ...current, ...message } : message);
  }

  return Array.from(byId.values()).sort((a, b) => {
    const aTs = Date.parse(a.timestamp || '');
    const bTs = Date.parse(b.timestamp || '');
    if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) {
      return aTs - bTs;
    }
    return a.id.localeCompare(b.id);
  });
}


interface InboxSidebarProps {
  width?: number;
}

export default function InboxSidebar({ width }: InboxSidebarProps) {
  const router = useRouter();
  const params = useParams();
  const selectedUserId = params?.id as string;
  const { epoch, markSidebarReady } = useInboxSync();

  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'priority' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [hasConnectedAccounts, setHasConnectedAccounts] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<StatusType[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);


  const refetchInFlightRef = useRef(false);
  const realtimeSyncQueueRef = useRef<Promise<void>>(Promise.resolve());

  // Filter persistence
  useEffect(() => {
    const saved = localStorage.getItem('inbox_filter_statuses');
    if (saved) setSelectedStatuses(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem('inbox_filter_statuses', JSON.stringify(selectedStatuses));
  }, [selectedStatuses]);
  useEffect(() => {
    const saved = localStorage.getItem('inbox_filter_accounts');
    if (saved) setSelectedAccountIds(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem('inbox_filter_accounts', JSON.stringify(selectedAccountIds));
  }, [selectedAccountIds]);


  const refetchConversations = useCallback(async () => {
    if (refetchInFlightRef.current) return;
    refetchInFlightRef.current = true;
    try {
      const freshUsers = await getInboxUsers();
      const sorted = sortUsersByRecency(normalizeUsersFromBackend(freshUsers));
      setUsers(sorted);
      setCachedUsers(sorted).catch(e => console.error(e));
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
        if (document.visibilityState !== 'visible') return;
        refetchConversations().catch((error) => {
          console.error('Failed to refresh conversations:', error);
        });
      }, REFRESH_INTERVAL_MS);
    };

    const stopInterval = () => {
      if (intervalId === null) return;
      window.clearInterval(intervalId);
      intervalId = null;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetchConversations().catch((error) => {
          console.error('Failed to refresh conversations:', error);
        });
        startInterval();
        return;
      }
      stopInterval();
    };

    const onFocus = () => {
      refetchConversations().catch((error) => {
        console.error('Failed to refresh conversations:', error);
      });
    };

    if (document.visibilityState === 'visible') {
      startInterval();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
      stopInterval();
    };
  }, [refetchConversations]);

  const applyUserStatusUpdate = useCallback((userId: string, status: StatusType) => {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === userId);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        status,
        statusColor: INBOX_STATUS_COLOR_CLASS_MAP[status],
      };
      setCachedUsers(updated).catch(e => console.error(e));
      return updated;
    });
  }, []);

  const applyUserPriorityUpdate = useCallback((userId: string, isPriority: boolean) => {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === userId);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        isPriority,
      };
      setCachedUsers(updated).catch(e => console.error(e));
      return updated;
    });
  }, []);

  const applyOptimisticRealtimePreview = useCallback(
    (eventType: 'new_message' | 'message_echo', data: SSEMessageData) => {
      setUsers((prev) => {
        const matchedConversation = findConversationForRealtimeMessage(prev, data);
        if (!matchedConversation) return prev;

        const idx = prev.findIndex((user) => user.id === matchedConversation.id);
        if (idx === -1) return prev;

        const previewText = buildRealtimePreviewText(eventType, data);
        const updatedAt = new Date(data.timestamp).toISOString();
        const next = [...prev];
        const current = next[idx];
        const outgoing = eventType === 'message_echo' || Boolean(data.fromMe);
        next[idx] = {
          ...current,
          lastMessage: previewText,
          time: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
            const aTs = Date.parse(a.timestamp || '');
            const bTs = Date.parse(b.timestamp || '');
            if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) {
              return aTs - bTs;
            }
            return a.id.localeCompare(b.id);
          });
        }).catch((error) => console.error('Failed optimistic message cache update:', error));

        const sorted = sortUsersByRecency(next);
        setCachedUsers(sorted).catch((error) => console.error(error));
        return sorted;
      });
    },
    []
  );

  const syncRealtimeConversationFromMongo = useCallback(
    async (eventType: 'new_message' | 'message_echo', data: SSEMessageData) => {
      const freshUsers = sortUsersByRecency(normalizeUsersFromBackend(await getInboxUsers()));
      const matchedConversation = findConversationForRealtimeMessage(freshUsers, data);
      const targetConversationId = matchedConversation?.id || data.conversationId || null;
      if (targetConversationId) {
        const latestMessages = await fetchLatestConversationMessages(targetConversationId);
        await updateCachedMessages(targetConversationId, (existing) =>
          mergeMessageCacheSnapshots(existing, latestMessages)
        );
      }

      setUsers((previousUsers) => {
        const mergedUsers = mergeUsersWithLocalRecency(previousUsers, freshUsers);
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
    []
  );

  const handleSidebarMessageEvent = useCallback(
    (eventType: 'new_message' | 'message_echo', data: SSEMessageData) => {
      applyOptimisticRealtimePreview(eventType, data);
      realtimeSyncQueueRef.current = realtimeSyncQueueRef.current
        .catch(() => undefined)
        .then(() => syncRealtimeConversationFromMongo(eventType, data))
        .catch((error) => {
          console.error('Failed to synchronize realtime conversation snapshot:', error);
        });
    },
    [applyOptimisticRealtimePreview, syncRealtimeConversationFromMongo]
  );

  useSSE('/api/sse', {
    onMessage: (message: any) => {
      if (message.type === 'new_message') {
        handleSidebarMessageEvent('new_message', message.data);
      } else if (message.type === 'message_echo') {
        handleSidebarMessageEvent('message_echo', message.data);
      }
      else if (message.type === 'user_status_updated') {
        if (isStatusType(message.data.status)) {
          applyUserStatusUpdate(message.data.conversationId, message.data.status);
          syncConversationStatusToClientCache(message.data.conversationId, message.data.status).catch((error) =>
            console.error('Failed to sync status cache:', error)
          );
          emitConversationStatusSynced({ conversationId: message.data.conversationId, status: message.data.status });
        }
      } else if (message.type === 'conversation_priority_updated') {
        applyUserPriorityUpdate(message.data.conversationId, Boolean(message.data.isPriority));
      }
    }
  });

  useEffect(() => {
    const legacyHandler = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId?: string; status?: StatusType }>;
      if (!customEvent.detail?.userId || !isStatusType(customEvent.detail?.status)) return;
      applyUserStatusUpdate(customEvent.detail.userId, customEvent.detail.status);
    };
    const statusSyncedHandler = (e: Event) => {
      const customEvent = e as CustomEvent<{ conversationId?: string; status?: StatusType }>;
      if (!customEvent.detail?.conversationId || !isStatusType(customEvent.detail?.status)) return;
      applyUserStatusUpdate(customEvent.detail.conversationId, customEvent.detail.status);
    };
    const previewHydratedHandler = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId?: string; lastMessage?: string; time?: string; updatedAt?: string }>;
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

    window.addEventListener('userStatusUpdated', legacyHandler);
    window.addEventListener(CONVERSATION_STATUS_SYNCED_EVENT, statusSyncedHandler);
    window.addEventListener('conversationPreviewHydrated', previewHydratedHandler);
    return () => {
      window.removeEventListener('userStatusUpdated', legacyHandler);
      window.removeEventListener(CONVERSATION_STATUS_SYNCED_EVENT, statusSyncedHandler);
      window.removeEventListener('conversationPreviewHydrated', previewHydratedHandler);
    };
  }, [applyUserStatusUpdate]);

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
          setCachedUsers([]).catch(e => console.error(e));
          return;
        }

        const fresh = await getInboxUsers();
        const sorted = sortUsersByRecency(normalizeUsersFromBackend(fresh));
        setUsers(sorted);
        setCachedUsers(sorted).catch(e => console.error(e));
      } catch (err) {
        console.error('Error loading conversations:', err);
      } finally {
        setLoading(false);
        markSidebarReady(currentEpoch);
      }
    }
    loadUsers();
  }, [epoch, markSidebarReady]);

  const filteredUsers = users.filter(u => {
    const matchesTab = activeTab === 'all' || (activeTab === 'priority' && Boolean(u.isPriority)) || (activeTab === 'unread' && (u.unread ?? 0) > 0);
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(u.status);
    const matchesAccount = selectedAccountIds.length === 0 || (u.accountId ? selectedAccountIds.includes(u.accountId) : false);
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || (u.lastMessage?.toLowerCase().includes(search.toLowerCase()));
    return matchesTab && matchesStatus && matchesAccount && matchesSearch;
  });

  const accountOptions = Array.from(
    new Map(
      users
        .filter((u): u is User & { accountId: string } => Boolean(u.accountId))
        .map((u) => [u.accountId, { id: u.accountId, label: u.accountLabel || u.ownerInstagramUserId || u.accountId }])
    ).values()
  );

  const handleConversationAction = useCallback(
    async (userId: string, action: 'qualified' | 'priority' | 'unpriority' | 'delete') => {
      if (action === 'delete') {
        return;
      }

      if (action === 'qualified') {
        const nextStatus: StatusType = 'Qualified';
        const previousStatus = users.find((u) => u.id === userId)?.status;

        applyUserStatusUpdate(userId, nextStatus);
        emitConversationStatusSynced({ conversationId: userId, status: nextStatus });
        syncConversationStatusToClientCache(userId, nextStatus).catch((error) =>
          console.error('Failed to sync status cache:', error)
        );

        try {
          await updateUserStatusAction(userId, nextStatus);
        } catch (error) {
          console.error('Failed to update status from quick actions:', error);
          if (previousStatus) {
            applyUserStatusUpdate(userId, previousStatus);
            emitConversationStatusSynced({ conversationId: userId, status: previousStatus });
            syncConversationStatusToClientCache(userId, previousStatus).catch((cacheError) =>
              console.error('Failed to sync status cache:', cacheError)
            );
          }
        }
        return;
      }

      const nextPriority = action === 'priority';
      const previousPriority = Boolean(users.find((u) => u.id === userId)?.isPriority);
      applyUserPriorityUpdate(userId, nextPriority);

      try {
        await updateConversationPriorityAction(userId, nextPriority);
      } catch (error) {
        console.error('Failed to update priority from quick actions:', error);
        applyUserPriorityUpdate(userId, previousPriority);
      }
    },
    [applyUserPriorityUpdate, applyUserStatusUpdate, users]
  );

  return (
    <aside
      className={`${inter.className} bg-white flex flex-col flex-shrink-0 h-full antialiased`}
      style={width ? { width: `${width}px` } : undefined}
    >
      {/* Sidebar Header */}
      <div className="p-4 pb-3 border-b border-gray-200">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-gray-800">Inbox</h2>
        </div>
        <p className="text-xs font-medium text-gray-400">Your unified chat workspace.</p>
      </div>

      {/* Search & Filter */}
      {hasConnectedAccounts && (
        <div className="p-4 pb-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 text-gray-400" />
              </span>
              <input
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-100 bg-gray-50/50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-gray-300"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button 
              onClick={() => setShowFilterModal(true)}
              className="px-3 py-2 bg-white border border-gray-100 rounded-lg text-sm font-semibold text-gray-600 shadow-sm hover:bg-gray-50 flex items-center"
            >
              <FilterIcon className="w-4 h-4 mr-1.5" />
              Filter
              {selectedStatuses.length > 0 && (
                <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#8771FF] text-[10px] text-white">
                  {selectedStatuses.length}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      {hasConnectedAccounts && (
        <div className="border-t border-b border-gray-200 px-4 py-3">
          <div className="flex gap-2 text-xs font-bold">
            {['all', 'priority', 'unread'].map((tab) => (
              <button
                key={tab}
                className={`flex-1 py-1.5 rounded-full capitalize transition-colors ${activeTab === tab ? 'bg-[#8771FF] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                onClick={() => setActiveTab(tab as any)}
              >
                {tab} [{tab === 'all' ? users.length : tab === 'priority' ? users.filter(u => u.isPriority).length : users.filter(u => (u.unread ?? 0) > 0).length}]
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {!hasConnectedAccounts ? (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">No connected accounts yet</p>
              <p className="text-xs text-gray-500 mt-1">Connect an Instagram account in Settings to start syncing.</p>
              <Link
                href="/settings"
                className="inline-flex mt-4 px-4 py-2 text-sm font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800"
              >
                Go to Settings
              </Link>
            </div>
          </div>
        ) : filteredUsers.length > 0 ? (
          <ConversationList 
            users={filteredUsers} 
            selectedUserId={selectedUserId} 
            onSelectUser={(id) => router.push(`/inbox/${id}`)}
            onAction={handleConversationAction}
          />
        ) : loading ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <p className="text-sm font-medium text-stone-500">Loading conversations...</p>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <p className="text-sm font-medium text-stone-500">
              {search || selectedStatuses.length > 0 || selectedAccountIds.length > 0 || activeTab !== 'all'
                ? 'No conversations match your filters.'
                : 'No conversations yet.'}
            </p>
          </div>
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
