import { useEffect, useRef } from "react";
import AssistantMessageBubble from "@/components/setter-ai/AssistantMessageBubble";
import ChatComposer from "@/components/setter-ai/ChatComposer";
import SetterAiWelcome from "@/components/setter-ai/SetterAiWelcome";
import UserMessageBubble from "@/components/setter-ai/UserMessageBubble";
import surface from "@/components/ui/brandSurface.module.css";
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

const HISTORY_SKELETON_ROWS = [
  { id: "a", mine: true, width: "w-56" },
  { id: "b", mine: false, width: "w-[70%]" },
  { id: "c", mine: true, width: "w-40" },
  { id: "d", mine: false, width: "w-[82%]" },
];

// Shared by the messages and the composer so they sit in one column.
const COLUMN_CLASS = "mx-auto w-full max-w-3xl";

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
  const lastMessageId = messages[messages.length - 1]?.id;
  const showHistorySkeleton = isHistoryLoading && messages.length === 0;
  const hasNoMessages = messages.length === 0;
  const hasNoSearchResults =
    messages.length > 0 && displayedMessages.length === 0;
  const showWelcome = !showHistorySkeleton && !isLoading && hasNoMessages;
  const showNoResults =
    !showHistorySkeleton && !isLoading && hasNoSearchResults;

  useEffect(() => {
    if (searchTerm) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    // A new chat shows the welcome screen, which reads from the top.
    if (messageCount === 0) {
      container.scrollTop = 0;
      return;
    }

    const behavior =
      hasAutoScrolledRef.current && messageCount > 0 ? "smooth" : "auto";
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
    hasAutoScrolledRef.current = true;
  }, [messageCount, searchTerm]);

  return (
    <main
      className={`${surface.glow} relative flex min-h-0 flex-1 flex-col bg-white`}
    >
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 md:px-6"
      >
        <div
          className={`${COLUMN_CLASS} flex min-h-full flex-col gap-6 pb-8 pt-6 ${
            showWelcome || showNoResults ? "justify-center" : ""
          }`}
        >
          {showWelcome && (
            <SetterAiWelcome onPickPrompt={onSend} disabled={isLoading} />
          )}

          {showNoResults && (
            <p className="text-center text-sm font-medium text-[#606266]">
              No messages match "{searchTerm}".
            </p>
          )}

          {showHistorySkeleton &&
            HISTORY_SKELETON_ROWS.map((row) => (
              <div
                key={`history-skeleton-${row.id}`}
                className={`flex ${row.mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`animate-pulse rounded-[1.25rem] ${row.width} ${
                    row.mine ? "h-10 bg-[#ECE9FF]" : "h-20 bg-[#F4F5F8]"
                  }`}
                />
              </div>
            ))}

          {displayedMessages.map((msg) =>
            msg.role === "user" ? (
              <UserMessageBubble key={msg.id} text={msg.text} />
            ) : (
              <AssistantMessageBubble
                key={msg.id}
                text={msg.text}
                isPending={isLoading && msg.text.trim().length === 0}
                isStreaming={isStreaming && msg.id === lastMessageId}
              />
            ),
          )}
        </div>
      </div>

      <ChatComposer
        columnClassName={COLUMN_CLASS}
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
