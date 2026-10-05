"use client";

import Link from "next/link";
import {
  LuChevronLeft,
  LuPanelRightClose,
  LuPanelRightOpen,
} from "react-icons/lu";
import MessagingWindowCountdown from "@/components/inbox/MessagingWindowCountdown";
import { AppImage } from "@/components/ui/AppImage";
import type { User } from "@/types/inbox";

interface ChatHeaderProps {
  user: User | null;
  showVisible: boolean;
  onToggleVisible: () => void;
}

export default function ChatHeader({
  user,
  showVisible,
  onToggleVisible,
}: ChatHeaderProps) {
  // From `md` up the icon mirrors whether the details column is open. On
  // phones the panel opens over the chat, so the button always reads "open".
  const DesktopDetailsIcon = showVisible ? LuPanelRightClose : LuPanelRightOpen;

  return (
    <header className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-3 border-b border-[#F0F2F6] bg-white px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        {/* Phones show one column at a time, so this leads back to the list. */}
        <Link
          href="/inbox"
          aria-label="Back to conversations"
          className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#606266] outline-none transition-[transform,color] duration-100 ease-out active:scale-[0.94] md:hidden"
        >
          <LuChevronLeft aria-hidden="true" className="h-5 w-5" />
        </Link>
        <AppImage
          src={user?.avatar || "/images/no_profile.jpg"}
          alt={user?.name || "User"}
          className="hidden h-10 w-10 shrink-0 rounded-full object-cover sm:block"
          loadingMode="eager"
        />
        <div className="min-w-0">
          <p className="truncate text-[0.9375rem] font-semibold tracking-[-0.01em] text-[#101011]">
            {user?.name?.replace("@", "") || "Loading..."}
          </p>
          <p className="truncate text-xs text-[#9A9CA2]">{user?.name || ""}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <MessagingWindowCountdown lastInboundAt={user?.lastInboundAt} />
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label="Toggle lead details"
          title="Lead details"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F5F8] text-[#606266] outline-none transition-[transform,color,background-color] duration-100 ease-out active:scale-[0.94] [@media(hover:hover)]:hover:text-[#101011]"
        >
          <LuPanelRightOpen aria-hidden="true" className="h-4 w-4 md:hidden" />
          <DesktopDetailsIcon
            aria-hidden="true"
            className="hidden h-4 w-4 md:block"
          />
        </button>
      </div>
    </header>
  );
}
