"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getInboxUsers, updateConversationPreview } from '@/app/actions/inbox';
import { getCachedUsers, setCachedUsers, updateCachedMessages } from '@/lib/clientCache';
import type { User, SSEMessageData, Message } from '@/types/inbox';
import ConversationList from '@/components/inbox/ConversationList';
import { useSSE } from '@/hooks/useSSE';

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

export default function InboxSidebar() {
  const router = useRouter();
  const params = useParams();
  const selectedUserId = params?.id as string;

  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'priority' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  // Ref to track whether a re-fetch is already in-flight (prevents stampede)
  const refetchInFlightRef = useRef(false);

  /**
   * Re-fetch the full conversation list from the server and update state + cache.
   * Used when an SSE event references a conversation we don't have locally
   * (e.g., a brand-new DM from someone not yet in the list).
   */
  const refetchConversations = useCallback(async () => {
    if (refetchInFlightRef.current) return;
    refetchInFlightRef.current = true;
    try {
      const freshUsers = await getInboxUsers();
      setUsers(freshUsers);
      setCachedUsers(freshUsers).catch(e => console.error('Failed to cache users:', e));
      console.log('[InboxSidebar] Re-fetched conversations after unknown SSE event');
    } catch (err) {
      console.error('[InboxSidebar] Re-fetch failed:', err);
    } finally {
      refetchInFlightRef.current = false;
    }
  }, []);

  /**
   * Update the sidebar list for a message event (incoming or echo).
   * - Updates lastMessage + time
   * - Bumps the conversation to the top of the list
   * - Increments unread count only for incoming messages not currently viewed
   * - Triggers a full re-fetch if the conversation isn't in the list yet
   * - BACKGROUND CACHING: Updates the specific message cache for the conversation
   */
  const handleSidebarMessageEvent = useCallback(
    (data: SSEMessageData, isEcho: boolean) => {
      const { conversationId, text, attachments, messageId, timestamp, fromMe: sseFromMe } = data;

      setUsers((prev) => {
        // Find the conversation by matching recipientId (the participant's user ID)
        const idx = prev.findIndex(
          (u) =>
            u.recipientId === data.senderId ||
            u.recipientId === data.recipientId
        );

        if (idx === -1) {
          // Unknown conversation — trigger a full re-fetch in the background
          refetchConversations();
          return prev;
        }

        const updated = [...prev];
        const conv = { ...updated[idx] };

        // ------------------------------------------------------------------
        // BACKGROUND MESSAGE CACHING
        // Update the IndexedDB cache for this conversation so messages are
        // ready even before the user clicks on the chat.
        // ------------------------------------------------------------------
        try {
          // 1. Construct the full Message object
          const fromMe = sseFromMe ?? isEcho;
          
          let messageType: Message['type'] = 'text';
          let attachmentUrl: string | undefined;

          if (attachments && attachments.length > 0) {
            const attachment = attachments[0];
            if (attachment.image_data) {
              messageType = 'image';
              attachmentUrl = attachment.image_data.url;
            } else if (attachment.video_data) {
              messageType = 'video';
              attachmentUrl = attachment.video_data.url;
            } else if (attachment.file_url) {
              messageType = 'file';
              attachmentUrl = attachment.file_url;
            }
          }

          const newMessage: Message = {
            id: messageId,
            fromMe,
            type: messageType,
            text: text || '',
            timestamp: new Date(timestamp).toISOString(),
            attachmentUrl,
          };

          // 2. Update cache using async atomic updater
          const cacheKey = conv.recipientId || conv.id;
          
          updateCachedMessages(cacheKey, (currentMessages) => {
            const msgs = currentMessages || [];
            const exists = msgs.some((m) => m.id === messageId);
            if (exists) return msgs;

            const newCache = [...msgs];
            if (isEcho) {
              const tempIndex = newCache.findIndex(
                (m) => m.id.startsWith('temp_') && m.fromMe && m.text === newMessage.text
              );
              if (tempIndex !== -1) {
                newCache[tempIndex] = newMessage;
              } else {
                newCache.push(newMessage);
              }
            } else {
              newCache.push(newMessage);
            }
            return newCache;
          }).catch(err => console.error('[InboxSidebar] Failed to update background message cache:', err));

        } catch (err) {
          console.error('[InboxSidebar] Error preparing message cache update:', err);
        }
        // ------------------------------------------------------------------

        // Update sidebar preview
        const previewText = text || '[attachment]';
        const previewTime = new Date(data.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        conv.lastMessage = previewText;
        conv.time = previewTime;

        // Increment unread only for incoming messages not currently viewed
        const shouldIncrementUnread = !isEcho && conv.recipientId !== selectedUserId;
        if (shouldIncrementUnread) {
          conv.unread = (conv.unread ?? 0) + 1;
        }

        // Remove from current position and bump to top
        updated.splice(idx, 1);
        updated.unshift(conv);

        // Persist to IndexedDB
        setCachedUsers(updated).catch(e => console.error('Failed to cache users:', e));

        // Persist to MongoDB (fire & forget — don't block the UI)
        updateConversationPreview(conv.recipientId || conv.id, previewText, previewTime, shouldIncrementUnread).catch(
          (err) => console.error('[InboxSidebar] Failed to persist metadata to DB:', err)
        );

        return updated;
      });
    },
    [selectedUserId, refetchConversations]
  );

  // Real-time SSE connection for updating the conversation list
  useSSE('/api/sse', {
    onMessage: (message) => {
      if (message.type === 'new_message') {
        handleSidebarMessageEvent(message.data, false);
      } else if (message.type === 'message_echo') {
        handleSidebarMessageEvent(message.data, true);
      }
    },
    onOpen: () => {
      console.log('[InboxSidebar] Real-time connection established');
    },
  });

  // Optimistic loading: Load cached users instantly, then fetch fresh data in background
  useEffect(() => {
    async function loadUsers() {
      try {
        // Load cached data instantly
        const cachedUsers = await getCachedUsers();
        if (cachedUsers && cachedUsers.length > 0) {
          setUsers(cachedUsers);
          setLoading(false);
        } else {
          setLoading(true);
        }
        
        // Fetch fresh data in background
        const fetchedUsers = await getInboxUsers();
        setUsers(fetchedUsers);
        setCachedUsers(fetchedUsers).catch(e => console.error('Failed to cache users:', e)); // Update cache
        setLoading(false);
      } catch (err) {
        console.error('Error loading inbox users:', err);
        setLoading(false);
      }
    }
    
    loadUsers();
  }, []);

  const handleSelectUser = (id: string) => {
    router.push(`/inbox/${id}`);
  };

  const handleAction = (action: 'priority' | 'unread' | 'delete') => {
    alert(`Moved to ${action}`);
  };

  // Dynamic counts
  const allCount = users.length;
  const priorityCount = users.filter((u) => u.status === 'Qualified').length;
  const unreadCount = users.filter((u) => (u.unread ?? 0) > 0).length;

  // Filter users by tab
  let tabUsers = users;
  if (activeTab === 'priority') {
    tabUsers = users.filter((u) => u.status === 'Qualified');
  } else if (activeTab === 'unread') {
    tabUsers = users.filter((u) => (u.unread ?? 0) > 0);
  }

  const filteredUsers = tabUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.lastMessage && u.lastMessage.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <aside className="w-[380px] border-r border-gray-200 bg-white flex flex-col flex-shrink-0 h-full">
      <div className="p-4 pb-2">
        <h2 className="text-xl font-bold mb-1 text-gray-800">Inbox</h2>
        <p className="text-xs text-gray-400 mb-4">Your unified chat workspace.</p>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-4 w-4 text-gray-400" />
            </span>
            <input
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-100 bg-white text-sm placeholder-gray-400 focus:outline-none focus:border-gray-300 shadow-sm"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="px-3 py-2 bg-white border border-gray-100 rounded-lg text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 flex items-center">
            <FilterIcon className="w-4 h-4 mr-1.5" />
            Filters
            <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#8771FF] text-[10px] text-white">1</span>
          </button>
        </div>

        <div className="flex space-x-2 text-xs font-semibold pb-2">
          <button
            className={`px-3 py-1.5 rounded-full ${activeTab === 'all' ? 'bg-[#8771FF] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('all')}
          >
            All [{allCount}]
          </button>
          <button
            className={`px-3 py-1.5 rounded-full ${activeTab === 'priority' ? 'bg-[#8771FF] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('priority')}
          >
            Priority [{priorityCount}]
          </button>
          <button
            className={`px-3 py-1.5 rounded-full ${activeTab === 'unread' ? 'bg-[#8771FF] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('unread')}
          >
            Unread [{unreadCount}]
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-[#8771FF] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <ConversationList 
          users={filteredUsers} 
          selectedUserId={selectedUserId} 
          onSelectUser={handleSelectUser} 
          onAction={handleAction} 
        />
      )}
    </aside>
  );
}