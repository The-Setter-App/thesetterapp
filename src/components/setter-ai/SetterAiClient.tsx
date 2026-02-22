"use client";

import ChatArea from "@/components/setter-ai/ChatArea";
import ChatSidebar from "@/components/setter-ai/ChatSidebar";
import { useSetterAiController } from "@/components/setter-ai/hooks/useSetterAiController";

interface SetterAiClientProps {
  initialChatId?: string | null;
}

export default function SetterAiClient({
  initialChatId = null,
}: SetterAiClientProps) {
  const controller = useSetterAiController({ initialChatId });

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#F8F7FF] text-[#101011] lg:flex-row">
      <ChatSidebar {...controller.sidebar} />
      <ChatArea {...controller.chatArea} />
    </div>
  );
}
