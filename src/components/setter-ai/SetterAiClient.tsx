"use client";

import { History, SquarePen } from "lucide-react";
import { useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import ChatArea from "@/components/setter-ai/ChatArea";
import ChatSidebar from "@/components/setter-ai/ChatSidebar";
import { useSetterAiController } from "@/components/setter-ai/hooks/useSetterAiController";
import surface from "@/components/ui/brandSurface.module.css";

interface SetterAiClientProps {
  initialChatId?: string | null;
}

const MOBILE_ACTION_CLASS =
  "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#F4F5F8] text-sm font-semibold text-[#101011] outline-none transition-[transform,background-color,opacity] duration-100 ease-out active:scale-[0.97] disabled:opacity-50";

export default function SetterAiClient({
  initialChatId = null,
}: SetterAiClientProps) {
  const controller = useSetterAiController({ initialChatId });
  const { sidebar, chatArea } = controller;

  // From `lg` up the chat list is a column beside the chat. Below that it
  // opens over the chat from the header, and closes once a chat is picked.
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const closeMobileHistory = () => setMobileHistoryOpen(false);

  const handleNewChat = () => {
    sidebar.onNewChat();
    closeMobileHistory();
  };
  const handleSelectSession = (sessionId: string) => {
    sidebar.onSelectSession(sessionId);
    closeMobileHistory();
  };

  return (
    <div
      className={`${surface.surface} flex h-full w-full flex-col overflow-hidden text-[#101011]`}
    >
      <PageHeader
        divider={false}
        className="shrink-0 pb-4"
        title="Setter AI"
        description="AI copilot for lead conversations, objection handling, and booking replies."
        actions={
          <div className="flex w-full gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileHistoryOpen(true)}
              className={MOBILE_ACTION_CLASS}
            >
              <History size={15} aria-hidden="true" />
              Chats
            </button>
            <button
              type="button"
              onClick={handleNewChat}
              disabled={sidebar.disableNewChat}
              className={MOBILE_ACTION_CLASS}
            >
              <SquarePen size={15} aria-hidden="true" />
              New chat
            </button>
          </div>
        }
      />

      <div className="relative flex min-h-0 flex-1 overflow-hidden border-t border-[#F0F2F6]">
        <ChatSidebar
          {...sidebar}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          onClose={closeMobileHistory}
          className={`${
            mobileHistoryOpen ? "absolute inset-0 z-30 flex" : "hidden"
          } lg:relative lg:inset-auto lg:z-auto lg:flex`}
        />
        <ChatArea {...chatArea} />
      </div>
    </div>
  );
}
