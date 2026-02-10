"use client";

import { useState } from 'react';
import { users, userConversations } from '@/data/mockInboxData';
import ConversationList from '@/components/inbox/ConversationList';
import ChatWindow from '@/components/inbox/ChatWindow';
import DetailsPanel from '@/components/inbox/DetailsPanel';

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

const EyeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function InboxPage() {
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(users.find((u) => u.isActive)?.id || users[0].id);
  const [activeTab, setActiveTab] = useState<'all' | 'priority' | 'unread'>('all');
  const [showVisible, setShowVisible] = useState(true);

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

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const chatHistory = userConversations[selectedUserId] || [];

  const handleAction = (action: 'priority' | 'unread' | 'delete') => {
    alert(`Moved to ${action}`);
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden ml-5">
      {/* Sidebar (Left) */}
      <aside className="w-[380px] border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
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

        <ConversationList users={filteredUsers} selectedUserId={selectedUserId} onSelectUser={setSelectedUserId} onAction={handleAction} />
      </aside>

      {/* Main Chat Area (Middle) */}
      <main className="flex-1 flex flex-col min-w-0 bg-white border-r border-gray-200">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center">
            {selectedUser?.avatar ? (
              <img src={selectedUser.avatar} alt={selectedUser.name} className="w-10 h-10 rounded-full object-cover mr-3" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-400 to-yellow-300 mr-3 flex items-center justify-center text-white font-bold text-xs">
                ●
              </div>
            )}
            <div>
              <div className="font-bold text-sm text-gray-900">{selectedUser?.name?.replace('@', '') || ''}</div>
              <div className="text-xs text-gray-400">{selectedUser?.name || ''}</div>
            </div>
          </div>
          <div className="flex items-center">
            <button onClick={() => setShowVisible((v) => !v)} className="mr-4 focus:outline-none">
              {showVisible ? (
                <div className="flex items-center justify-center w-7 h-7 rounded-md border border-gray-200">
                  <EyeIcon className="w-4 h-4 text-gray-500" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-7 h-7 rounded-md border border-gray-200">
                  <img src="/icons/Hidden.svg" alt="Hidden" className="w-4 h-4" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <ChatWindow messages={chatHistory} />

        {/* Message Input */}
        <div className="p-4 bg-white mx-8 mb-4">
          <div className="relative flex items-center border border-gray-200 rounded-lg p-2 shadow-sm">
            <div className="flex space-x-2 mr-2 text-gray-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </div>
            <input className="flex-1 bg-transparent text-sm placeholder-gray-400 focus:outline-none" placeholder="Write a message..." />
          </div>
        </div>
      </main>

      {/* Details Panel (Right) */}
      {selectedUser && <DetailsPanel user={selectedUser} />}
    </div>
  );
}