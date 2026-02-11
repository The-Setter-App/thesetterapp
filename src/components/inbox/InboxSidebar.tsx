"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Inter } from 'next/font/google'; // Import Inter
import { getInboxUsers, updateConversationPreview } from '@/app/actions/inbox';
import { getCachedUsers, setCachedUsers, updateCachedMessages } from '@/lib/clientCache';
import type { User, SSEMessageData, Message, StatusType } from '@/types/inbox';
import ConversationList from '@/components/inbox/ConversationList';
import { useSSE } from '@/hooks/useSSE';
import Image from 'next/image';
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

const statusColors: Record<StatusType, string> = {
  'New Lead': '#F89EE3',
  'In-Contact': '#25D366',
  'Qualified': '#FFC300',
  'Unqualified': '#FF0000',
  'Retarget': '#2C6CD6',
  'Won': '#059700',
  'No-Show': '#FF7847',
  'Booked': '#501884',
};

const statusIconPaths: Record<StatusType, string> = {
  'New Lead': '/icons/status/NewLead.svg',
  'In-Contact': '/icons/status/InContact.svg',
  'Qualified': '/icons/status/Qualified.svg',
  'Unqualified': '/icons/status/Unqualified.svg',
  'Retarget': '/icons/status/Retarget.svg',
  'Won': '/icons/status/Won.svg',
  'No-Show': '/icons/status/NoShow.svg',
  'Booked': '/icons/status/Booked.svg',
};

export default function InboxSidebar() {
  const router = useRouter();
  const params = useParams();
  const selectedUserId = params?.id as string;

  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'priority' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<StatusType[]>([]);
  const [assignedToFilter] = useState<string>('all'); // Placeholder for future
  const [accountsFilter] = useState<string>('all');   // Placeholder for future

  const refetchInFlightRef = useRef(false);

  // Filter persistence
  useEffect(() => {
    const saved = localStorage.getItem('inbox_filter_statuses');
    if (saved) setSelectedStatuses(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem('inbox_filter_statuses', JSON.stringify(selectedStatuses));
  }, [selectedStatuses]);


  const refetchConversations = useCallback(async () => {
    if (refetchInFlightRef.current) return;
    refetchInFlightRef.current = true;
    try {
      const freshUsers = await getInboxUsers();
      setUsers(freshUsers);
      setCachedUsers(freshUsers).catch(e => console.error(e));
    } finally { refetchInFlightRef.current = false; }
  }, []);

  const handleSidebarMessageEvent = useCallback((data: SSEMessageData, isEcho: boolean) => {
    const { text, timestamp } = data;
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.recipientId === data.senderId || u.recipientId === data.recipientId);
      if (idx === -1) { refetchConversations(); return prev; }
      const updated = [...prev];
      const conv = { ...updated[idx] };
      conv.lastMessage = text || '[attachment]';
      conv.time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (!isEcho && conv.recipientId !== selectedUserId) conv.unread = (conv.unread ?? 0) + 1;
      updated.splice(idx, 1);
      updated.unshift(conv);
      setCachedUsers(updated).catch(e => console.error(e));
      return updated;
    });
  }, [selectedUserId, refetchConversations]);

  useSSE('/api/sse', {
    onMessage: (message) => {
      if (message.type === 'new_message') handleSidebarMessageEvent(message.data, false);
      else if (message.type === 'message_echo') handleSidebarMessageEvent(message.data, true);
    }
  });

  useEffect(() => {
    async function loadUsers() {
      const cached = await getCachedUsers();
      if (cached?.length) { setUsers(cached); setLoading(false); }
      const fresh = await getInboxUsers();
      setUsers(fresh);
      setCachedUsers(fresh).catch(e => console.error(e));
      setLoading(false);
    }
    loadUsers();
  }, []);

  const filteredUsers = users.filter(u => {
    const matchesTab = activeTab === 'all' || (activeTab === 'priority' && u.status === 'Qualified') || (activeTab === 'unread' && (u.unread ?? 0) > 0);
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(u.status);
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || (u.lastMessage?.toLowerCase().includes(search.toLowerCase()));
    return matchesTab && matchesStatus && matchesSearch;
  });

  return (
    <aside className={`${inter.className} w-[380px] border-r border-gray-200 bg-white flex flex-col flex-shrink-0 h-full antialiased`}>
      {/* Sidebar Header */}
      <div className="p-4 pb-2">
        <h2 className="text-xl font-bold tracking-tight mb-1 text-gray-800">Inbox</h2>
        <p className="text-xs font-medium text-gray-400 mb-4">Your unified chat workspace.</p>

        <div className="flex gap-2 mb-4">
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

        <div className="flex space-x-2 text-xs font-bold pb-2">
          {['all', 'priority', 'unread'].map((tab) => (
            <button
              key={tab}
              className={`px-3 py-1.5 rounded-full capitalize transition-colors ${activeTab === tab ? 'bg-[#8771FF] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              onClick={() => setActiveTab(tab as any)}
            >
              {tab} [{tab === 'all' ? users.length : tab === 'priority' ? users.filter(u => u.status === 'Qualified').length : users.filter(u => (u.unread ?? 0) > 0).length}]
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 border-4 border-[#8771FF] border-t-transparent rounded-full animate-spin"></div>
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
      />
    </aside>
  );
}