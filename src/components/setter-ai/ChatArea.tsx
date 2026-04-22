import { Bot } from "lucide-react";
import { useEffect, useRef } from "react";
import AssistantMessageBubble from "@/components/setter-ai/AssistantMessageBubble";
import ChatComposer from "@/components/setter-ai/ChatComposer";
import UserMessageBubble from "@/components/setter-ai/UserMessageBubble";
import type { Message } from "@/types/ai";
import type { LeadConversationSummary } from "@/types/setterAiLeadContext";

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  isHistoryLoading: boolean;
  input: string;
  setInput: (val: string) => void;
  onSend: (override?: string) => void;
  onStopStreaming: () => void;
  searchTerm: string;
  linkedLead: { conversationId: string; label: string } | null;
  onLinkLead: (lead: LeadConversationSummary) => void;
  onClearLead: () => void;
}

export default function ChatArea({
  messages,
  isLoading,
  isStreaming,
  isHistoryLoading,
  input,
  setInput,
  onSend,
  onStopStreaming,
  searchTerm,
  linkedLead,
  onLinkLead,
  onClearLead,
}: ChatAreaProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolledRef = useRef(false);

  const displayedMessages = messages.filter((msg) =>
    msg.text.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const messageCount = messages.length;
  const showHistorySkeleton = isHistoryLoading && messages.length === 0;
  const hasNoMessages = messages.length === 0;
  const hasNoSearchResults =
    messages.length > 0 && displayedMessages.length === 0;
  const showEmptyState =
    !showHistorySkeleton && !isLoading && (hasNoMessages || hasNoSearchResults);
  const emptyStateTitle = hasNoMessages
    ? "No leads conversation yet"
    : "No lead messages found";
  const emptyStateBody = hasNoMessages
    ? "Open a lead chat or send a first message to get reply guidance and objection handling support."
    : `No messages match "${searchTerm}".`;

  useEffect(() => {
    if (searchTerm) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const behavior =
      hasAutoScrolledRef.current && messageCount > 0 ? "smooth" : "auto";
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
    hasAutoScrolledRef.current = true;
  }, [messageCount, searchTerm]);

  return (
    <main className="relative flex min-h-0 flex-1 flex-col bg-[#F8F7FF]">
      <div className="min-h-0 flex-1 overflow-hidden px-4 md:px-6">
        <div ref={scrollContainerRef} className="h-full overflow-y-auto">
          <div
            className={`mx-auto w-full pt-3 md:w-[48%] md:pt-4 ${
              showEmptyState
                ? "flex min-h-full flex-col justify-center gap-4 pb-12"
                : "flex flex-col gap-4 pb-12"
            }`}
          >
            {showEmptyState && (
              <div className="flex items-center justify-center">
                <div className="w-full rounded-2xl border border-[#F0F2F6] bg-white px-6 py-10 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F0FF] text-[#8771FF]">
                    <Bot size={18} />
                  </div>
                  <h3 className="text-sm font-semibold text-[#101011] md:text-base">
                    {emptyStateTitle}
                  </h3>
                  <p className="mt-1 text-xs text-[#606266] md:text-sm">
                    {emptyStateBody}
                  </p>
                </div>
              </div>
            )}
            {showHistorySkeleton && (
              <div className="flex flex-col gap-3">
                {["a", "b", "c", "d", "e", "f"].map((skeletonKey, index) => (
                  <div
                    key={`history-skeleton-${skeletonKey}`}
                    className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`h-16 w-[72%] animate-pulse rounded-2xl ${
                        index % 2 === 0
                          ? "bg-white border border-[#F0F2F6]"
                          : "bg-[#F3F0FF]"
                      }`}
                    />
                  </div>
                ))}
              </div>
            )}
            {displayedMessages.map((msg) =>
              msg.role === "user" ? (
                <UserMessageBubble key={msg.id} text={msg.text} />
              ) : (
                <AssistantMessageBubble
                  key={msg.id}
                  text={msg.text}
                  isPending={isLoading && msg.text.trim().length === 0}
                />
              ),
            )}
          </div>
        </div>
      </div>

      <ChatComposer
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        isStreaming={isStreaming}
        onSend={onSend}
        onStopStreaming={onStopStreaming}
        linkedLead={linkedLead}
        onLinkLead={onLinkLead}
        onClearLead={onClearLead}
      />
    </main>
  );
}
