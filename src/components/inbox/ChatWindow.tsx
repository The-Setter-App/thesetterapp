"use client";

import { useEffect, useRef, useState } from "react";
import { LuX } from "react-icons/lu";
import { AppImage } from "@/components/ui/AppImage";
import type { Message } from "@/types/inbox";
import ChatMessage from "./ChatMessage";
import StatusUpdateEvent from "./StatusUpdateEvent";

interface ChatWindowProps {
  messages: Message[];
  loading?: boolean;
  loadingOlder?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onAudioDurationResolved?: (messageId: string, duration: string) => void;
  statusUpdate?: {
    status: string;
    timestamp: Date | string;
  };
}

export default function ChatWindow({
  messages,
  loading,
  loadingOlder,
  hasMore,
  onLoadMore,
  onAudioDurationResolved,
  statusUpdate,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loadedMediaByMessageId, setLoadedMediaByMessageId] = useState<
    Record<string, boolean>
  >({});
  const previousCountRef = useRef(0);
  const previousScrollHeightRef = useRef(0);
  const prependingRef = useRef(false);
  const loadingOlderRef = useRef(Boolean(loadingOlder));
  const stickToBottomRef = useRef(true);
  const TIME_SEPARATOR_GAP_MS = 30 * 60 * 1000;

  const isNearBottom = (container: HTMLDivElement): boolean => {
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom <= 80;
  };

  const keepBottomIfPinned = () => {
    if (
      !stickToBottomRef.current ||
      prependingRef.current ||
      loadingOlderRef.current
    )
      return;
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    });
  };

  const parseMessageTime = (message: Message): number | null => {
    if (!message.timestamp) return null;
    const ms = new Date(message.timestamp).getTime();
    return Number.isNaN(ms) ? null : ms;
  };

  const shouldShowTimeSeparator = (
    current: Message,
    previous?: Message,
  ): boolean => {
    if (!previous) return false;
    const currentMs = parseMessageTime(current);
    const prevMs = parseMessageTime(previous);
    if (currentMs === null || prevMs === null) return false;
    return currentMs - prevMs >= TIME_SEPARATOR_GAP_MS;
  };

  const formatSeparatorTime = (message: Message): string => {
    const ms = parseMessageTime(message);
    if (ms === null) return "";
    const date = new Date(ms);
    const now = new Date();
    const isSameDay = date.toDateString() === now.toDateString();
    if (isSameDay) {
      return `Today ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    }
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const markMediaLoaded = (messageId: string) => {
    setLoadedMediaByMessageId((prev) => {
      if (prev[messageId]) return prev;
      return { ...prev, [messageId]: true };
    });
  };

  useEffect(() => {
    if (!loadingOlderRef.current && loadingOlder) {
      prependingRef.current = true;
      previousScrollHeightRef.current = scrollRef.current?.scrollHeight || 0;
    }
    loadingOlderRef.current = Boolean(loadingOlder);
  }, [loadingOlder]);

  // Scroll behavior:
  // - keep viewport stable when older messages are prepended
  // - otherwise stay pinned to bottom for new messages
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    if (prependingRef.current) {
      requestAnimationFrame(() => {
        const newScrollHeight = container.scrollHeight;
        const delta = newScrollHeight - previousScrollHeightRef.current;
        container.scrollTop += delta;
        prependingRef.current = false;
      });
      previousCountRef.current = messages.length;
      return;
    }

    const wasFirstRender = previousCountRef.current === 0;
    // Only autoscroll when a new message is appended.
    // Do not autoscroll when an existing message updates (e.g. pending -> sent).
    const messageAppended = messages.length > previousCountRef.current;
    if (wasFirstRender || messageAppended) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
        stickToBottomRef.current = true;
      });
    }
    previousCountRef.current = messages.length;
  }, [messages]);

  // Keep chat pinned when top controls mount/unmount (e.g. hasMore true -> false).
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || prependingRef.current || loadingOlder) return;
    if (!stickToBottomRef.current) return;

    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    });
  }, [loadingOlder]);

  useEffect(() => {
    if (!statusUpdate) return;
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      stickToBottomRef.current = true;
    });
  }, [statusUpdate]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedImage(null);
      }
    };

    if (selectedImage) {
      window.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [selectedImage]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 space-y-4 overflow-y-auto bg-white px-5 py-6 scrollbar-none md:px-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`flex flex-col ${i % 2 === 0 ? "items-end" : "items-start"}`}
          >
            <div
              className={`h-10 animate-pulse rounded-[1.25rem] ${
                i % 2 === 0
                  ? "w-52 rounded-br-md bg-[#ECE9FF]"
                  : "w-40 rounded-bl-md bg-[#F4F5F8]"
              }`}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={(event) => {
        stickToBottomRef.current = isNearBottom(event.currentTarget);
      }}
      className="flex-1 overflow-y-auto bg-white scrollbar-none"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <div className="flex min-h-full flex-col px-5 py-6 md:px-8">
        {(loadingOlder || hasMore) && (
          <div className="flex justify-center pb-3">
            {hasMore ? (
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingOlder}
                className="h-9 rounded-full bg-[#F4F5F8] px-4 text-xs font-semibold text-[#101011] outline-none transition-[transform,background-color] duration-100 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 [@media(hover:hover)]:enabled:hover:bg-[#F0F2F6]"
              >
                {loadingOlder
                  ? "Loading older messages..."
                  : "Load more messages"}
              </button>
            ) : (
              <p className="text-[11px] font-medium text-[#9A9CA2]">
                No more messages
              </p>
            )}
          </div>
        )}

        <div className="mt-auto">
          {messages.map((msg, index) => {
            const previous = index > 0 ? messages[index - 1] : undefined;
            const showSeparator = shouldShowTimeSeparator(msg, previous);
            const separatorLabel = showSeparator
              ? formatSeparatorTime(msg)
              : "";
            // Messages from the same sender sit close together; a change of
            // sender gets more room.
            const startsNewGroup =
              previous !== undefined && previous.fromMe !== msg.fromMe;

            return (
              <div
                key={msg.id}
                className={
                  index === 0 ? undefined : startsNewGroup ? "pt-3" : "pt-1"
                }
              >
                {showSeparator && separatorLabel && (
                  <p className="pb-3 pt-2 text-center text-[11px] font-medium text-[#9A9CA2]">
                    {separatorLabel}
                  </p>
                )}
                <ChatMessage
                  message={msg}
                  mediaLoaded={Boolean(loadedMediaByMessageId[msg.id])}
                  onMediaLoaded={() => {
                    markMediaLoaded(msg.id);
                    keepBottomIfPinned();
                  }}
                  onMediaResized={keepBottomIfPinned}
                  onOpenImage={setSelectedImage}
                  onAudioDurationResolved={onAudioDurationResolved}
                />
              </div>
            );
          })}

          {statusUpdate && (
            <div className="pt-5">
              <StatusUpdateEvent
                status={statusUpdate.status}
                timestamp={statusUpdate.timestamp}
              />
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>
      </div>

      {selectedImage && (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#101011]/80 px-4 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setSelectedImage(null);
            }
          }}
        >
          <span
            aria-hidden="true"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#101011] transition-colors [@media(hover:hover)]:hover:bg-white"
          >
            <LuX className="h-5 w-5" />
          </span>

          <AppImage
            src={selectedImage}
            alt="Expanded attachment"
            className="max-h-[85vh] w-full max-w-5xl object-contain"
            loadingMode="eager"
            onClick={(event) => event.stopPropagation()}
          />
        </button>
      )}
    </div>
  );
}
