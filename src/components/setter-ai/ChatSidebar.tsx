import React from 'react';
import { MessageSquare, Plus, Search } from 'lucide-react';
import { ChatSession } from '@/types/ai';

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: number;
  onSelectSession: (id: number) => void;
  onNewChat: () => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
}

export default function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  searchTerm,
  setSearchTerm
}: ChatSidebarProps) {
  return (
    <aside className="w-full border-b border-[#F0F2F6] bg-white px-4 py-4 md:px-6 lg:h-full lg:w-[320px] lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-[#101011] md:text-lg">Setter AI</h2>
        <p className="mt-1 text-xs text-[#606266]">Real-time coaching for every lead conversation.</p>
      </div>

      <div className="flex flex-col gap-3 lg:h-[calc(100%-58px)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-[#606266]">Your chats</span>
        </div>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#606266]" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search messages"
            className="h-10 w-full rounded-xl border border-[#F0F2F6] bg-white pl-10 pr-3 text-sm text-[#101011] placeholder:text-[#9A9CA2] outline-none focus:border-[#8771FF] focus:ring-0 focus-visible:outline-none"
          />
        </div>

        <button
          onClick={onNewChat}
          className="inline-flex h-11 w-full min-w-[44px] items-center justify-center gap-2 rounded-xl border border-[#F0F2F6] bg-[#F3F0FF] text-sm font-medium text-[#8771FF] transition-colors hover:bg-[#EBE5FF] outline-none focus-visible:outline-none"
        >
          <Plus size={16} /> New Conversation
        </button>

        <div className="flex max-h-[220px] flex-col gap-2 overflow-y-auto lg:max-h-none lg:flex-1">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`flex h-12 w-full min-w-[44px] items-center gap-3 rounded-xl border px-3 text-left text-sm transition-colors outline-none focus-visible:outline-none
                ${session.id === activeSessionId
                  ? 'border-[#E6E1FF] bg-[#F8F7FF] font-semibold text-[#101011]'
                  : 'border-[#F0F2F6] text-[#606266] hover:bg-[#F8F7FF]'
                }`}
            >
              <MessageSquare size={16} className={session.id === activeSessionId ? 'text-[#8771FF]' : 'text-[#9A9CA2]'} />
              <span className="truncate">{session.title}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
