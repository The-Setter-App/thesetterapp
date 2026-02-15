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
  statusUpdate?: {
    status: string;
    timestamp: Date | string;
  };
}

const StarIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
  </svg>
);

export default function ChatWindow({
  messages,
  loading,
  loadingOlder,
  hasMore,
  onLoadMore,
  statusUpdate
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const previousCountRef = useRef(0);
  const previousScrollHeightRef = useRef(0);
  const prependingRef = useRef(false);
  const loadingOlderRef = useRef(Boolean(loadingOlder));

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
      });
    }
    previousCountRef.current = messages.length;
  }, [messages]);

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
            <div className={`rounded-2xl p-4 max-w-[60%] animate-pulse ${i % 2 === 0 ? 'bg-[#F3F0FF]' : 'bg-gray-100'}`}>
              <div className={`h-4 bg-gray-200 rounded mb-2 ${i % 2 === 0 ? 'w-48' : 'w-32'}`}></div>
              <div className="h-3 w-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const formatStatusTimestamp = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
    
    return `${dayName}, ${monthName} ${day}, ${year} ${hours}:${minutesStr} ${ampm}`;
  };

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-8 py-6 space-y-2 bg-white scrollbar-none"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {(loadingOlder || hasMore) && (
        <div className="flex justify-center py-2">
          {hasMore ? (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingOlder}
              className="h-11 rounded-full bg-stone-100 px-4 text-xs font-medium text-stone-800 transition-colors hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loadingOlder ? 'Loading older messages...' : 'Load more messages'}
            </button>
          ) : (
            <div className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700">
              No more messages
            </div>
          )}
        </div>
      )}

      {messages.map((msg) => (
        <div key={msg.id} className={`flex flex-col ${msg.fromMe ? 'items-end' : 'items-start'}`}>
          <div
            className={`text-sm ${
              msg.type === 'audio' 
                ? 'bg-transparent p-0' 
                : `max-w-[80%] rounded-[12px] ${msg.fromMe ? 'bg-[#8771FF] text-white shadow-[0_2px_4px_rgba(0,0,0,0.1)]' : 'bg-[rgba(135,113,255,0.05)] text-[#2B2B2C] border border-[#F0F2F6] shadow-[0_2px_4px_rgba(0,0,0,0.08)]'}`
            } ${
              msg.type === 'audio' 
                ? '' 
                : msg.type === 'image' || msg.type === 'video' ? 'p-1' : 'px-3 py-2'
            }`}
          >
            {msg.type === 'text' && (
              <div className="whitespace-pre-wrap break-words">{msg.text}</div>
            )}
            
            {msg.type === 'image' && msg.attachmentUrl && (
              <div>
                <img 
                  src={msg.attachmentUrl} 
                  alt="Attachment" 
                  className="rounded-xl max-w-full max-h-96 object-cover cursor-pointer"
                  onClick={() => setSelectedImage(msg.attachmentUrl || null)}
                />
                {msg.text && <p className="px-3 py-2">{msg.text}</p>}
              </div>
            )}
            {msg.type === 'image' && !msg.attachmentUrl && (
              <div className="px-3 py-2 text-xs text-stone-600">Image unavailable</div>
            )}
            
            {msg.type === 'video' && msg.attachmentUrl && (
              <div>
                <video 
                  src={msg.attachmentUrl} 
                  controls 
                  className="rounded-xl max-w-full max-h-96"
                />
                {msg.text && <p className="px-3 py-2">{msg.text}</p>}
              </div>
            )}
            
            {msg.type === 'audio' && (
              <AudioMessage 
                src={msg.attachmentUrl || ''} 
                duration={msg.duration} 
                isOwn={msg.fromMe} 
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
          {msg.pending && msg.fromMe && (
            <div className="mt-1 mr-1 text-[10px] text-stone-500">Sending...</div>
          )}
          {msg.status === 'Read' && <div className="text-[10px] text-gray-400 mt-1 mr-1">Read</div>}
        </div>
      ))}

      {/* Status Update Marker */}
      {statusUpdate && (
        <div className="flex flex-col items-center py-6">
          <StarIcon className="w-6 h-6 text-yellow-400 mb-2" />
          <div className="font-bold text-sm text-gray-800">Status Update: {statusUpdate.status}</div>
          <div className="text-[10px] text-gray-400">{formatStatusTimestamp(statusUpdate.timestamp)}</div>
        </div>
      )}
      
      {/* Scroll anchor */}
      <div ref={bottomRef} />

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/75 px-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            aria-label="Close image preview"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-stone-900 transition-colors hover:bg-white"
            onClick={() => setSelectedImage(null)}
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <img
            src={selectedImage}
            alt="Expanded attachment"
            className="max-h-[85vh] w-full max-w-5xl rounded-2xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
