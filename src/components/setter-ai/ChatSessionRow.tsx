import { Ellipsis, Trash2 } from "lucide-react";
import type { RefObject } from "react";
import type { ChatSession } from "@/types/ai";

interface ChatSessionRowProps {
  session: ChatSession;
  isActive: boolean;
  isMenuOpen: boolean;
  // Attached to the open row's menu so a click elsewhere can close it.
  menuContainerRef: RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onToggleMenu: () => void;
  onDelete: () => void;
}

export default function ChatSessionRow({
  session,
  isActive,
  isMenuOpen,
  menuContainerRef,
  onSelect,
  onToggleMenu,
  onDelete,
}: ChatSessionRowProps) {
  return (
    <li
      className={`group relative flex h-11 items-center rounded-xl transition-colors duration-100 ${
        isActive ? "bg-[#F3F0FF]" : "[@media(hover:hover)]:hover:bg-[#F8F7FF]"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={isActive ? "true" : undefined}
        className="flex h-full min-w-0 flex-1 items-center rounded-xl pl-3 pr-1 text-left outline-none"
      >
        <span
          className={`truncate text-sm ${
            isActive
              ? "font-semibold text-[#101011]"
              : "font-medium text-[#606266]"
          }`}
        >
          {session.title}
        </span>
      </button>

      <div
        className="relative shrink-0 pr-1"
        ref={isMenuOpen ? menuContainerRef : null}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {/* Hidden until the row is hovered, except on touch screens and while
            its menu is open. */}
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onToggleMenu();
          }}
          aria-label={`Open menu for ${session.title}`}
          aria-expanded={isMenuOpen}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-[#606266] outline-none transition-[opacity,background-color,color] duration-100 group-hover:opacity-100 [@media(hover:hover)]:hover:bg-white [@media(hover:hover)]:hover:text-[#101011] [@media(hover:none)]:opacity-100 ${
            isMenuOpen ? "bg-white opacity-100" : "opacity-0"
          }`}
        >
          <Ellipsis size={16} aria-hidden="true" />
        </button>

        {isMenuOpen && (
          <div
            className="absolute right-1 top-[calc(100%+4px)] z-20 min-w-[10rem] rounded-2xl border border-[#F0F2F6] bg-white p-1.5 shadow-[0_12px_32px_rgba(16,16,17,0.12)]"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onDelete}
              className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-sm font-medium text-red-600 outline-none transition-colors duration-100 [@media(hover:hover)]:hover:bg-red-50"
            >
              <Trash2 size={14} aria-hidden="true" />
              Delete chat
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
