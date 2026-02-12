import React from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import { ChatSession } from '@/types/ai';
import { Button } from '@/components/ui/Button';

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: number;
  onSelectSession: (id: number) => void;
  onNewChat: () => void;
}

export default function ChatSidebar({ sessions, activeSessionId, onSelectSession, onNewChat }: ChatSidebarProps) {
  return (
    <aside className="w-[300px] bg-white border-r border-gray-100 flex flex-col p-6 pl-8 shrink-0 h-screen">
      <div className="mb-10">
        <h2 className="text-xl font-bold mb-2 text-gray-900 tracking-tight">Setter AI</h2>
        <p className="text-[13px] text-gray-500 leading-relaxed">
          Real-time AI coaching for every message, every lead, every deal.
        </p>
      </div>
      
      <div className="flex flex-col gap-3 flex-1 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-medium text-gray-400">Your chats</span>
        </div>
        
        <button 
          onClick={onNewChat}
          className="w-full py-3 px-4 bg-white border border-dashed border-gray-300 rounded-xl text-sm text-gray-600 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2 mb-2"
        >
          <Plus size={16} /> New Conversation
        </button>

        <div className="flex flex-col gap-1 overflow-y-auto flex-1 pr-1 scrollbar-thin scrollbar-thumb-gray-200">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm flex items-center gap-3 transition-all truncate
                ${session.id === activeSessionId 
                  ? 'bg-gray-50 text-gray-900 font-semibold shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
            >
              <MessageSquare size={16} className={session.id === activeSessionId ? 'text-[#8771FF]' : 'text-gray-400'} />
              <span className="truncate">{session.title}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}