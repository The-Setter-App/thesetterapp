"use client";

import ChatArea from "@/components/setter-ai/ChatArea";
import ChatSidebar from "@/components/setter-ai/ChatSidebar";
import { useSetterAiController } from "@/components/setter-ai/hooks/useSetterAiController";
import PageHeader from "@/components/layout/PageHeader";

interface SetterAiClientProps {
  initialChatId?: string | null;
}

export default function SetterAiClient({
  initialChatId = null,
}: SetterAiClientProps) {
  const controller = useSetterAiController({ initialChatId });

  return (
    <div className="flex h-full min-h-screen w-full flex-col overflow-hidden bg-[#F8F7FF] text-[#101011]">
      <PageHeader
        title="Setter AI"
        description="AI copilot for lead conversations, objection handling, and booking replies."
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <ChatSidebar {...controller.sidebar} />
        <ChatArea {...controller.chatArea} />
      </div>
    </div>
  );
}
