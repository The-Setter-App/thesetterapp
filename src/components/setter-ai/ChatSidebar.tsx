import {
  MessageSquare,
  MoreVertical,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatSession } from "@/types/ai";

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  disableNewChat?: boolean;
  isLoading?: boolean;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
}

export default function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  disableNewChat = false,
  isLoading = false,
  searchTerm,
  setSearchTerm,
}: ChatSidebarProps) {
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(
    null,
  );
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleDocumentPointerDown(event: PointerEvent) {
      if (!menuContainerRef.current) return;
      const targetNode = event.target as Node | null;
      if (targetNode && menuContainerRef.current.contains(targetNode)) return;
      setOpenMenuSessionId(null);
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
    };
  }, []);

  function toggleMenu(sessionId: string) {
    setOpenMenuSessionId((prev) => (prev === sessionId ? null : sessionId));
  }

  function handleDelete(sessionId: string) {
    setOpenMenuSessionId(null);
    onDeleteSession(sessionId);
  }

  return (
    <aside className="w-full border-b border-[#F0F2F6] bg-white px-4 py-4 md:px-6 lg:h-full lg:w-[320px] lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-[#101011] md:text-lg">
          Setter AI
        </h2>
        <p className="mt-1 text-xs text-[#606266]">
          Real-time coaching for every lead conversation.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:h-[calc(100%-58px)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-[#606266]">
            Your chats
          </span>
        </div>
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#606266]"
          />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search messages"
            className="h-10 w-full rounded-xl border border-[#F0F2F6] bg-white pl-10 pr-3 text-sm text-[#101011] placeholder:text-[#9A9CA2] outline-none transition-colors hover:bg-[#F8F7FF] focus:outline-none focus:ring-0 focus-visible:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={onNewChat}
          disabled={disableNewChat}
          className="inline-flex h-11 w-full min-w-[44px] items-center justify-center gap-2 rounded-xl border border-[#F0F2F6] bg-[#F3F0FF] text-sm font-medium text-[#8771FF] transition-colors hover:bg-[#EBE5FF] outline-none focus-visible:outline-none"
          title={
            disableNewChat
              ? "You're already in a new empty chat."
              : "Create new conversation"
          }
        >
          <Plus size={16} /> New Conversation
        </button>

        <div className="flex max-h-[220px] flex-col gap-2 overflow-y-auto lg:max-h-none lg:flex-1">
          {isLoading &&
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`session-skeleton-${index}`}
                className="flex h-12 w-full animate-pulse items-center gap-3 rounded-xl border border-[#F0F2F6] bg-white px-3"
              >
                <div className="h-4 w-4 rounded bg-[#EEEAFD]" />
                <div className="h-3 w-40 rounded bg-[#F0F2F6]" />
              </div>
            ))}
          {!isLoading &&
            sessions.map((session) => (
              <div
                key={session.id}
                className={`group relative flex h-12 w-full min-w-[44px] items-center rounded-xl border px-1.5 text-left text-sm transition-colors
                ${
                  session.id === activeSessionId
                    ? "border-[#E6E1FF] bg-[#F8F7FF] text-[#101011]"
                    : "border-[#F0F2F6] text-[#606266] hover:bg-[#F8F7FF]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectSession(session.id)}
                  className="flex h-full min-w-0 flex-1 items-center gap-3 rounded-lg px-1.5 text-left outline-none focus-visible:outline-none"
                >
                  <MessageSquare
                    size={16}
                    className={
                      session.id === activeSessionId
                        ? "text-[#8771FF]"
                        : "text-[#9A9CA2]"
                    }
                  />
                  <span
                    className={`truncate ${session.id === activeSessionId ? "font-semibold" : "font-medium"}`}
                  >
                    {session.title}
                  </span>
                </button>

                <div
                  className="relative shrink-0"
                  ref={
                    openMenuSessionId === session.id ? menuContainerRef : null
                  }
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleMenu(session.id);
                    }}
                    aria-label={`Open menu for ${session.title}`}
                    className="inline-flex h-9 w-9 min-w-[44px] items-center justify-center rounded-lg text-[#606266] transition-colors hover:bg-[#F3F0FF] hover:text-[#101011] outline-none focus-visible:outline-none"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {openMenuSessionId === session.id && (
                    <div
                      className="absolute right-0 top-[calc(100%+6px)] z-20 min-w-[150px] rounded-xl border border-[#F0F2F6] bg-white p-1.5 shadow-sm"
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => handleDelete(session.id)}
                        className="flex h-10 w-full min-w-[44px] items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 outline-none focus-visible:outline-none"
                      >
                        <Trash2 size={14} />
                        Delete chat
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </aside>
  );
}
