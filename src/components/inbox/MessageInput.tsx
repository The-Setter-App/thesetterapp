"use client";

import { useRef, useEffect } from 'react';
import { User } from '@/types/inbox';

interface MessageInputProps {
  messageInput: string;
  setMessageInput: (value: string) => void;
  handleSendMessage: () => void;
  sendingMessage: boolean;
  user: User | null;
  attachmentFile: File | null;
  attachmentPreview: string;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clearAttachment: () => void;
}

export default function MessageInput({
  messageInput,
  setMessageInput,
  handleSendMessage,
  sendingMessage,
  user,
  attachmentFile,
  attachmentPreview,
  handleFileSelect,
  clearAttachment
}: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize logic
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [messageInput]);

  return (
    <div className="p-4 bg-white mx-8 mb-4 flex-shrink-0 relative">
      {attachmentPreview && (
         <div className="absolute bottom-full left-0 mb-2 p-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
           <div className="relative group">
             <img src={attachmentPreview} alt="Attachment" className="h-32 w-auto rounded-md object-contain border border-gray-100 bg-gray-50" />
             <button 
               onClick={clearAttachment}
               className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md border border-gray-100 text-gray-500 hover:text-red-500 transition-colors"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
           </div>
         </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileSelect}
      />

      <div className="relative flex items-center border border-gray-200 rounded-lg px-2 shadow-sm">
        <div className="flex space-x-2 mr-2 text-gray-300">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className={`p-1 rounded-full transition-colors ${attachmentFile ? 'text-[#8771FF] bg-[#8771FF]/10' : 'hover:text-gray-500'}`}
            title="Attach Image"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        <textarea
          ref={textareaRef}
          className="flex-1 bg-transparent text-sm placeholder-gray-400 focus:outline-none resize-none min-h-[44px] max-h-[120px] py-3"
          placeholder="Write a message..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={sendingMessage || !user}
          rows={1}
        />
        {sendingMessage && (
          <div className="ml-2 h-4 w-4 border-2 border-[#8771FF] border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>
    </div>
  );
}