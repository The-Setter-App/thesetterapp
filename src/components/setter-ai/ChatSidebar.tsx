import { Search, SquarePen, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ChatSessionRow from "@/components/setter-ai/ChatSessionRow";
import { groupSessionsByRecency } from "@/components/setter-ai/lib/groupSessionsByRecency";
import type { ChatSession } from "@/types/ai";

const SESSION_SKELETON_WIDTHS = ["w-40", "w-32", "w-44", "w-28", "w-36"];

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
  // Position and display classes from the parent, which decides when the
  // list shows at each breakpoint.
  className?: string;
  // Closes the phone view of the list.
  onClose?: () => void;
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
  className = "flex",
  onClose,
}: ChatSidebarProps) {
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(
    null,
  );
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const hasNoSessions = !isLoading && sessions.length === 0;
  const sessionGroups = useMemo(
    () => groupSessionsByRecency(sessions, new Date()),
    [sessions],
  );

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
    <aside
      className={`w-full flex-col bg-white lg:w-[320px] lg:shrink-0 lg:border-r lg:border-[#F0F2F6] ${className}`}
    >
      {onClose && (
        <div className="flex items-center justify-between px-4 pt-4 md:px-6 lg:hidden">
          <h2 className="text-lg font-semibold tracking-[-0.015em] text-[#101011]">
            Chats
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chats"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F5F8] text-[#606266] outline-none transition-[transform,color] duration-100 ease-out active:scale-[0.94]"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="space-y-2 px-4 pb-3 pt-4 md:px-6 lg:px-8">
        <button
          type="button"
          onClick={onNewChat}
          disabled={disableNewChat}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#F3F0FF] text-sm font-semibold text-[#8771FF] outline-none transition-[transform,background-color,opacity] duration-100 ease-out active:scale-[0.97] disabled:opacity-50 [@media(hover:hover)]:enabled:hover:bg-[#EBE5FF]"
          title={
            disableNewChat
              ? "You're already on a new chat."
              : "Create new conversation"
          }
        >
          <SquarePen size={15} aria-hidden="true" /> New chat
        </button>

        <label className="relative block">
          <span className="sr-only">Search this chat</span>
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A9CA2]"
          />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search this chat"
            className="h-11 w-full rounded-full border border-transparent bg-[#F4F5F8] pl-10 pr-4 text-[0.9375rem] text-[#101011] outline-none transition-colors duration-150 placeholder:text-[#9A9CA2] focus:border-[#8771FF] focus:bg-white focus:outline-none focus:ring-0 [&::-webkit-search-cancel-button]:appearance-none"
          />
        </label>
      </div>

      {/* Rows have 12px of their own padding, so this inset lines their text
          up with the buttons above while the hover tint reaches past it. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-4 md:px-3 lg:px-5">
        {isLoading && (
          <div className="space-y-1 pt-2">
            {SESSION_SKELETON_WIDTHS.map((width, index) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders that never reorder.
                key={index}
                className="flex h-11 items-center px-3"
              >
                <div
                  className={`h-3.5 animate-pulse rounded-full bg-[#F4F5F8] ${width}`}
                />
              </div>
            ))}
          </div>
        )}

        {hasNoSessions && (
          <div className="px-3 pt-6 text-center">
            <p className="text-sm font-semibold text-[#101011]">
              No conversations yet
            </p>
            <p className="mt-1 text-[0.8125rem] leading-snug text-[#606266]">
              Send your first message to start a chat. Your history will show up
              here.
            </p>
          </div>
        )}

        {!isLoading &&
          sessionGroups.map((group) => (
            <section key={group.label} className="pt-3">
              <h3 className="px-3 pb-1 text-xs font-medium text-[#9A9CA2]">
                {group.label}
              </h3>
              <ul className="space-y-0.5">
                {group.sessions.map((session) => (
                  <ChatSessionRow
                    key={session.id}
                    session={session}
                    isActive={session.id === activeSessionId}
                    isMenuOpen={openMenuSessionId === session.id}
                    menuContainerRef={menuContainerRef}
                    onSelect={() => onSelectSession(session.id)}
                    onToggleMenu={() => toggleMenu(session.id)}
                    onDelete={() => handleDelete(session.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
      </div>
    </aside>
  );
}
