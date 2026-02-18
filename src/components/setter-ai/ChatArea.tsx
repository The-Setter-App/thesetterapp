import React, { useRef, useEffect } from 'react';
import { ArrowUp, Bot } from 'lucide-react';
import { Message } from '@/types/ai';
import UserMessageBubble from '@/components/setter-ai/UserMessageBubble';
import AssistantMessageBubble from '@/components/setter-ai/AssistantMessageBubble';

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  input: string;
  setInput: (val: string) => void;
  onSend: (override?: string) => void;
  searchTerm: string;
}

export default function ChatArea({
  messages,
  isLoading,
  input,
  setInput,
  onSend,
  searchTerm
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const displayedMessages = messages.filter(msg => 
    msg.text.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const hasNoMessages = messages.length === 0;
  const hasNoSearchResults = messages.length > 0 && displayedMessages.length === 0;
  const showEmptyState = !isLoading && (hasNoMessages || hasNoSearchResults);
  const emptyStateTitle = hasNoMessages ? 'No leads conversation yet' : 'No lead messages found';
  const emptyStateBody = hasNoMessages
    ? 'Open a lead chat or send a first message to get reply guidance and objection handling support.'
    : `No messages match "${searchTerm}".`;

  useEffect(() => {
    if (!searchTerm) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, searchTerm]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading) {
        onSend();
      }
    }
  };

  return (
    <main className="relative flex min-h-0 flex-1 flex-col bg-[#F8F7FF]">
      <header className="border-b border-[#F0F2F6] bg-white px-4 py-3 md:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-[#101011] md:text-lg">Setter AI</h1>
            <p className="text-xs text-[#606266] md:text-sm">AI copilot for lead conversations, objection handling, and booking replies.</p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden px-4 md:px-6">
        <div className="h-full overflow-y-auto">
          <div
            className={`mx-auto w-full pt-3 md:w-[48%] md:pt-4 ${
              showEmptyState ? 'flex min-h-full flex-col justify-center gap-4' : 'flex flex-col gap-4'
            }`}
          >
            {showEmptyState && (
              <div className="flex items-center justify-center">
                <div className="w-full rounded-2xl border border-[#F0F2F6] bg-white px-6 py-10 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F0FF] text-[#8771FF]">
                    <Bot size={18} />
                  </div>
                  <h3 className="text-sm font-semibold text-[#101011] md:text-base">{emptyStateTitle}</h3>
                  <p className="mt-1 text-xs text-[#606266] md:text-sm">{emptyStateBody}</p>
                </div>
              </div>
            )}
            {displayedMessages.map((msg) => (
              msg.role === 'user' ? (
                <UserMessageBubble key={msg.id} text={msg.text} />
              ) : (
                <AssistantMessageBubble
                  key={msg.id}
                  text={msg.text}
                  isPending={isLoading && msg.text.trim().length === 0}
                />
              )
            ))}
          <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      <div className="shrink-0 px-4 pb-4 md:px-6 md:pb-6">
        <div className="mx-auto flex w-full flex-col gap-2 rounded-2xl border border-[#F0F2F6] bg-white p-2.5 shadow-sm md:w-[50%]">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Send a message"
            className="h-10 w-full rounded-xl bg-white px-3 text-sm text-[#101011] placeholder:text-[#9A9CA2] outline-none focus:ring-0 focus-visible:outline-none"
            disabled={isLoading}
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="inline-flex h-9 w-auto max-w-[180px] items-center gap-2 rounded-full border border-[#F0F2F6] bg-[#F8F7FF] px-3 text-xs font-medium text-[#606266] transition-colors hover:border-[#D9D2FF] hover:bg-[#F3F0FF] outline-none focus-visible:outline-none"
            >
              <Bot size={13} className="text-[#8771FF]" />
              <span className="max-w-[120px] truncate whitespace-nowrap">SetterAI</span>
            </button>
            <button
              type="button"
              onClick={() => onSend()}
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
              className="flex h-10 w-10 min-w-[40px] items-center justify-center rounded-full bg-[#8771FF] text-white transition-all hover:bg-[#6d5ed6] hover:scale-[1.02] active:scale-95 outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
        <div className="mt-2 text-center">
          <p className="inline-block rounded-full bg-[#F8F7FF]/95 px-2 py-0.5 text-[11px] text-[#606266]">
            Setter AI Copilot Real-time guidance for lead replies, follow-ups, and conversion-focused conversations.
          </p>
        </div>
      </div>
    </main>
  );
}


