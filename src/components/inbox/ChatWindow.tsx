"use client";

import { Message } from '@/types/inbox';
import { useRef, useEffect, useState } from 'react';
import AudioMessage from './AudioMessage';

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
  statusUpdate: _statusUpdate
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loadedMediaByMessageId, setLoadedMediaByMessageId] = useState<Record<string, boolean>>({});
  const previousCountRef = useRef(0);
  const previousScrollHeightRef = useRef(0);
  const prependingRef = useRef(false);
  const loadingOlderRef = useRef(Boolean(loadingOlder));
  const stickToBottomRef = useRef(true);
  const TIME_SEPARATOR_GAP_MS = 30 * 60 * 1000;

  const isNearBottom = (container: HTMLDivElement): boolean => {
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom <= 80;
  };

  const keepBottomIfPinned = () => {
    if (!stickToBottomRef.current || prependingRef.current || loadingOlderRef.current) return;
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    });
  };

  const parseMessageTime = (message: Message): number | null => {
    if (!message.timestamp) return null;
    const ms = new Date(message.timestamp).getTime();
    return Number.isNaN(ms) ? null : ms;
  };

  const shouldShowTimeSeparator = (current: Message, previous?: Message): boolean => {
    if (!previous) return false;
    const currentMs = parseMessageTime(current);
    const prevMs = parseMessageTime(previous);
    if (currentMs === null || prevMs === null) return false;
    return currentMs - prevMs >= TIME_SEPARATOR_GAP_MS;
  };

  const formatSeparatorTime = (message: Message): string => {
    const ms = parseMessageTime(message);
    if (ms === null) return '';
    const date = new Date(ms);
    const now = new Date();
    const isSameDay = date.toDateString() === now.toDateString();
    if (isSameDay) {
      return `Today ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
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
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
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
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    });
  }, [hasMore, loadingOlder]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedImage(null);
      }
    };

    if (selectedImage) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [selectedImage]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 bg-white scrollbar-none">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`flex flex-col ${i % 2 === 0 ? 'items-end' : 'items-start'}`}>
            <div className={`rounded-2xl p-4 max-w-[60%] animate-pulse ${i % 2 === 0 ? 'bg-[#F3F0FF]' : 'bg-[#F4F5F8]'}`}>
              <div className={`h-4 bg-[#F0F2F6] rounded mb-2 ${i % 2 === 0 ? 'w-48' : 'w-32'}`}></div>
              <div className="h-3 w-20 bg-[#F0F2F6] rounded"></div>
            </div>
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
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <div className="flex min-h-full flex-col px-8 py-6">
        {(loadingOlder || hasMore) && (
          <div className="flex justify-center py-2">
            {hasMore ? (
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingOlder}
                className="h-11 rounded-full bg-[#F4F5F8] px-4 text-xs font-medium text-[#101011] transition-colors hover:bg-[#F0F2F6] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loadingOlder ? 'Loading older messages...' : 'Load more messages'}
              </button>
            ) : (
              <div className="rounded-full bg-[#F4F5F8] px-3 py-1 text-xs text-[#606266]">
                No more messages
              </div>
            )}
          </div>
        )}

        <div className="mt-auto space-y-2">
          {messages.map((msg, index) => {
            const previous = index > 0 ? messages[index - 1] : undefined;
            const showSeparator = shouldShowTimeSeparator(msg, previous);
            const separatorLabel = showSeparator ? formatSeparatorTime(msg) : '';

            return (
              <div key={msg.id}>
                {showSeparator && separatorLabel && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full bg-[#F4F5F8] px-3 py-1 text-[11px] font-medium text-[#606266]">
                      {separatorLabel}
                    </span>
                  </div>
                )}
                <div className={`flex flex-col ${msg.fromMe ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`text-sm ${
                      msg.type === 'audio' || msg.type === 'image'
                        ? 'bg-transparent p-0'
                        : `max-w-[80%] rounded-[12px] ${msg.fromMe ? 'bg-[#8771FF] text-white shadow-[0_2px_4px_rgba(0,0,0,0.1)]' : 'bg-[rgba(135,113,255,0.05)] text-[#2B2B2C] border border-[#F0F2F6] shadow-[0_2px_4px_rgba(0,0,0,0.08)]'}`
                    } ${
                      msg.type === 'audio' || msg.type === 'image'
                        ? ''
                        : msg.type === 'video' ? 'p-1' : 'px-3 py-2'
                    }`}
                  >
                    {msg.type === 'text' && (
                      <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                    )}

                    {msg.type === 'image' && msg.attachmentUrl && (
                      <div>
                        <div
                          className={`relative w-[220px] sm:w-[260px] md:w-[320px] overflow-hidden rounded-xl bg-[#F4F5F8] ${loadedMediaByMessageId[msg.id] ? '' : 'min-h-[220px]'}`}
                        >
                          {!loadedMediaByMessageId[msg.id] && (
                            <div className="absolute inset-0 animate-pulse bg-[#F0F2F6]/70" />
                          )}
                          <img
                            src={msg.attachmentUrl}
                            alt="Attachment"
                            className={`block h-auto w-full cursor-pointer transition-opacity duration-300 ${loadedMediaByMessageId[msg.id] ? 'opacity-100' : 'opacity-0'}`}
                            onLoad={() => {
                              markMediaLoaded(msg.id);
                              keepBottomIfPinned();
                            }}
                            onClick={() => setSelectedImage(msg.attachmentUrl || null)}
                          />
                        </div>
                        {msg.text && (
                          <p className={`mt-1 text-xs ${msg.fromMe ? 'text-[#ECE9FF] text-right' : 'text-[#606266] text-left'}`}>
                            {msg.text}
                          </p>
                        )}
                      </div>
                    )}
                    {msg.type === 'image' && !msg.attachmentUrl && (
                      <div className="px-3 py-2 text-xs text-[#606266]">Image unavailable</div>
                    )}

                    {msg.type === 'video' && msg.attachmentUrl && (
                      <div>
                        <div
                          className={`relative w-[220px] sm:w-[260px] md:w-[320px] overflow-hidden rounded-xl bg-[#F4F5F8] ${loadedMediaByMessageId[msg.id] ? '' : 'min-h-[220px]'}`}
                        >
                          {!loadedMediaByMessageId[msg.id] && (
                            <div className="absolute inset-0 animate-pulse bg-[#F0F2F6]/70" />
                          )}
                          <video
                            src={msg.attachmentUrl}
                            controls
                            onLoadedMetadata={() => {
                              markMediaLoaded(msg.id);
                              keepBottomIfPinned();
                            }}
                            onLoadedData={keepBottomIfPinned}
                            className={`block h-auto w-full transition-opacity duration-300 ${loadedMediaByMessageId[msg.id] ? 'opacity-100' : 'opacity-0'}`}
                          />
                        </div>
                        {msg.text && <p className="px-3 py-2">{msg.text}</p>}
                      </div>
                    )}

                    {msg.type === 'audio' && (
                      <AudioMessage
                        messageId={msg.id}
                        src={msg.attachmentUrl || ''}
                        duration={msg.duration}
                        isOwn={msg.fromMe}
                        onDurationResolved={onAudioDurationResolved}
                      />
                    )}

                    {msg.type === 'file' && (
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span>{msg.text || 'File attachment'}</span>
                      </div>
                    )}
                  </div>
                  {msg.pending && !msg.clientAcked && msg.fromMe && (
                    <div className="mt-1 mr-1 text-[10px] text-[#606266]">Sending...</div>
                  )}
                  {msg.status === 'Read' && <div className="text-[10px] text-[#9A9CA2] mt-1 mr-1">Read</div>}
                </div>
              </div>
            );
          })}

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/75 px-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            aria-label="Close image preview"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#101011] transition-colors hover:bg-white"
            onClick={() => setSelectedImage(null)}
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <img
            src={selectedImage}
            alt="Expanded attachment"
            className="max-h-[85vh] w-full max-w-5xl  object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

