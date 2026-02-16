"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Inter } from 'next/font/google'; // Import Inter
import { getInboxConnectionState, getInboxUsers, updateConversationPreview } from '@/app/actions/inbox';
import { getCachedUsers, setCachedUsers, updateCachedMessages } from '@/lib/clientCache';
import type { User, SSEMessageData, Message, StatusType } from '@/types/inbox';
import ConversationList from '@/components/inbox/ConversationList';
import { useSSE } from '@/hooks/useSSE';
import Image from 'next/image';
import Link from 'next/link';
import FilterModal from './FilterModal';

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

const statusOptions: StatusType[] = ['New Lead', 'In-Contact', 'Qualified', 'Unqualified', 'Retarget', 'Won', 'No-Show', 'Booked'];

const statusColorMap: Record<StatusType, string> = {
  'Won': 'text-green-600 border-green-200 bg-white',
  'Unqualified': 'text-red-500 border-red-200 bg-white',
  'Booked': 'text-purple-600 border-purple-200 bg-white',
  'New Lead': 'text-pink-500 border-pink-200 bg-white',
  'Qualified': 'text-yellow-500 border-yellow-200 bg-white',
  'No-Show': 'text-orange-500 border-orange-200 bg-white',
  'In-Contact': 'text-green-500 border-green-200 bg-white',
  'Retarget': 'text-blue-500 border-blue-200 bg-white',
};

function isStatusType(value: unknown): value is StatusType {
  return typeof value === 'string' && statusOptions.includes(value as StatusType);
}

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


interface InboxSidebarProps {
  width?: number;
}

export default function InboxSidebar({ width }: InboxSidebarProps) {
  const router = useRouter();
  const params = useParams();
  const selectedUserId = params?.id as string;

  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'priority' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [hasConnectedAccounts, setHasConnectedAccounts] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<StatusType[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
 

  const refetchInFlightRef = useRef(false);

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
    } finally { refetchInFlightRef.current = false; }
  }, []);

  const applyUserStatusUpdate = useCallback((userId: string, status: StatusType) => {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === userId);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        status,
        statusColor: statusColorMap[status],
      };
      setCachedUsers(updated).catch(e => console.error(e));
      return updated;
    });
  }, []);

  const handleSidebarMessageEvent = useCallback((data: SSEMessageData, isEcho: boolean, fromMe = false) => {
    const { text, timestamp, attachments } = data;
    setUsers((prev) => {
      const idx = prev.findIndex((u) => {
        if (u.id === data.conversationId) return true;
        if (!u.recipientId) return false;
        const sameParticipant = u.recipientId === data.senderId || u.recipientId === data.recipientId;
        const sameAccount = !u.accountId || !data.accountId || u.accountId === data.accountId;
        return sameParticipant && sameAccount;
      });
      if (idx === -1) { refetchConversations(); return prev; }
      const updated = [...prev];
      const conv = { ...updated[idx] };
      const firstAttachment = attachments?.[0];
      const isAudioAttachment =
        firstAttachment?.type === 'audio' ||
        Boolean(firstAttachment?.file_url && (
          firstAttachment.file_url.includes('audio') ||
          firstAttachment.file_url.endsWith('.mp3') ||
          firstAttachment.file_url.endsWith('.m4a') ||
          firstAttachment.file_url.endsWith('.ogg') ||
          firstAttachment.file_url.endsWith('.webm') ||
          firstAttachment.file_url.endsWith('.mp4')
        ));
      const isImageAttachment =
        firstAttachment?.type === 'image' ||
        Boolean(firstAttachment?.image_data?.url) ||
        Boolean(firstAttachment?.file_url && (
          firstAttachment.file_url.endsWith('.jpg') ||
          firstAttachment.file_url.endsWith('.jpeg') ||
          firstAttachment.file_url.endsWith('.png') ||
          firstAttachment.file_url.endsWith('.webp') ||
          firstAttachment.file_url.endsWith('.gif')
        ));
      const isVideoAttachment =
        firstAttachment?.type === 'video' ||
        Boolean(firstAttachment?.video_data?.url) ||
        Boolean(firstAttachment?.file_url && (
          firstAttachment.file_url.endsWith('.mov') ||
          firstAttachment.file_url.endsWith('.mp4') ||
          firstAttachment.file_url.endsWith('.m4v') ||
          firstAttachment.file_url.endsWith('.webm')
        ));
      const hasAnyAttachment = Boolean(firstAttachment);

      const outgoing = isEcho || fromMe;
      if (text && text.trim().length > 0) {
        conv.lastMessage = text;
      } else if (isAudioAttachment) {
        conv.lastMessage = outgoing ? 'You sent a voice message' : 'Sent a voice message';
      } else if (isImageAttachment) {
        conv.lastMessage = outgoing ? 'You sent an image' : 'Sent an image';
      } else if (isVideoAttachment) {
        conv.lastMessage = outgoing ? 'You sent a video' : 'Sent a video';
      } else if (hasAnyAttachment) {
        conv.lastMessage = outgoing ? 'You sent an attachment' : 'Sent an attachment';
      } else {
        conv.lastMessage = outgoing ? 'You sent a message' : 'Sent a message';
      }
      conv.time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      conv.updatedAt = new Date(timestamp).toISOString();
      if (outgoing) conv.unread = 0;
      else conv.unread = (conv.unread ?? 0) + 1;
      updated[idx] = conv;
      const sorted = sortUsersByRecency(updated);
      setCachedUsers(sorted).catch(e => console.error(e));
      return sorted;
    });
  }, [refetchConversations]);

  useSSE('/api/sse', {
    onMessage: (message: any) => {
      if (message.type === 'new_message') handleSidebarMessageEvent(message.data, false, Boolean(message.data?.fromMe));
      else if (message.type === 'message_echo') handleSidebarMessageEvent(message.data, true, true);
      else if (message.type === 'user_status_updated') {
        if (isStatusType(message.data.status)) {
          applyUserStatusUpdate(message.data.conversationId, message.data.status);
        }
      }
    }
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId?: string; status?: StatusType }>;
      if (!customEvent.detail?.userId || !isStatusType(customEvent.detail?.status)) return;
      applyUserStatusUpdate(customEvent.detail.userId, customEvent.detail.status);
    };

    window.addEventListener('userStatusUpdated', handler);
    return () => window.removeEventListener('userStatusUpdated', handler);
  }, [applyUserStatusUpdate]);

  useEffect(() => {
    async function loadUsers() {
      const connectionState = await getInboxConnectionState();
      setHasConnectedAccounts(connectionState.hasConnectedAccounts);

      if (!connectionState.hasConnectedAccounts) {
        setUsers([]);
        setCachedUsers([]).catch(e => console.error(e));
        setLoading(false);
        return;
      }

      const cached = await getCachedUsers();
      if (cached?.length) {
        setUsers(sortUsersByRecency(normalizeUsersFromBackend(cached)));
        setLoading(false);
      }
      const fresh = await getInboxUsers();
      const sorted = sortUsersByRecency(normalizeUsersFromBackend(fresh));
      setUsers(sorted);
      setCachedUsers(sorted).catch(e => console.error(e));
      setLoading(false);
    }
    loadUsers();
  }, []);

  const filteredUsers = users.filter(u => {
    const matchesTab = activeTab === 'all' || (activeTab === 'priority' && u.status === 'Qualified') || (activeTab === 'unread' && (u.unread ?? 0) > 0);
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

  return (
    <aside
      className={`${inter.className} border-r border-gray-200 bg-white flex flex-col flex-shrink-0 h-full antialiased`}
      style={width ? { width: `${width}px` } : undefined}
    >
      {/* Sidebar Header */}
      <div className="p-4 pb-3 border-b border-gray-200">
        <h2 className="text-xl font-bold tracking-tight mb-1 text-gray-800">Inbox</h2>
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
                {tab} [{tab === 'all' ? users.length : tab === 'priority' ? users.filter(u => u.status === 'Qualified').length : users.filter(u => (u.unread ?? 0) > 0).length}]
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 border-4 border-[#8771FF] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !hasConnectedAccounts ? (
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
        ) : (
          <ConversationList 
            users={filteredUsers} 
            selectedUserId={selectedUserId} 
            onSelectUser={(id) => router.push(`/inbox/${id}`)}
            onAction={(a) => alert(`Moved to ${a}`)} 
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
