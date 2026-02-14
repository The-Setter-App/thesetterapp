"use client";

import { Message } from '@/types/inbox';
import { useMemo } from 'react';
import AudioMessage from './AudioMessage';

interface ChatWindowProps {
  messages: Message[];
  loading?: boolean;
  statusUpdate?: {
    status: string;
    timestamp: Date | string;
  };
}

const PlayIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
  </svg>
);

const VolumeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
    <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
  </svg>
);

const StarIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
  </svg>
);

const AudioWave = ({ color }: { color: string }) => {
  const heights = useMemo(() => {
    return [...Array(20)].map(() => Math.random() * 100);
  }, []);

  return (
    <div className="flex items-center space-x-0.5 h-4 mx-2">
      {heights.map((height, i) => (
        <div key={i} className={`w-0.5 rounded-full ${color}`} style={{ height: `${height}%` }} />
      ))}
    </div>
  );
};

export default function ChatWindow({ messages, loading, statusUpdate }: ChatWindowProps) {
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
    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-2 bg-white scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
                  className="rounded-xl max-w-full max-h-96 object-cover"
                />
                {msg.text && <p className="px-3 py-2">{msg.text}</p>}
              </div>
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
    </div>
  );
}