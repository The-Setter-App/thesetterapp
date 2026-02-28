"use client";

import { useRef, useEffect } from 'react';
import { User } from '@/types/inbox';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

interface MessageInputProps {
  messageInput: string;
  setMessageInput: (value: string) => void;
  handleSendMessage: () => void;
  user: User | null;
  attachmentFile: File | null;
  attachmentPreview: string;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAttachmentPaste: (file: File) => void;
  clearAttachment: () => void;
  handleSendAudio?: (blob: Blob, duration: number) => void;
}

export default function MessageInput({
  messageInput,
  setMessageInput,
  handleSendMessage,
  user,
  attachmentFile,
  attachmentPreview,
  handleFileSelect,
  handleAttachmentPaste,
  clearAttachment,
  handleSendAudio
}: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isRecording, recordingTime, startRecording, stopRecording, cancelRecording } = useAudioRecorder();

  // Auto-resize logic
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [messageInput]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleStopAndSend = async () => {
    const result = await stopRecording();
    if (result && handleSendAudio) {
      handleSendAudio(result.audioBlob, result.duration);
    }
  };

  return (
    <div className="p-4 bg-white mx-8 mb-4 flex-shrink-0 relative">
      {attachmentPreview && (
         <div className="absolute bottom-full left-0 mb-2 p-2 bg-white border border-[#F0F2F6] rounded-lg shadow-lg z-10">
           <div className="relative group">
             <img src={attachmentPreview} alt="Attachment" className="h-32 w-auto rounded-md object-contain border border-[#F0F2F6] bg-[#F8F7FF]" />
             <button 
               onClick={clearAttachment}
               className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md border border-[#F0F2F6] text-[#606266] hover:text-red-500 transition-colors"
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

      <div className="relative flex items-center border border-[#F0F2F6] rounded-lg px-2 shadow-sm min-h-[50px]">
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between py-2 px-2">
            <div className="flex items-center space-x-3 text-red-500 animate-pulse">
              <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm"></div>
              <span className="font-mono font-medium text-sm">{formatTime(recordingTime)}</span>
              <span className="text-xs text-[#9A9CA2] font-normal">Recording...</span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={cancelRecording} 
                className="p-2 text-[#9A9CA2] hover:text-red-500 rounded-full hover:bg-[#F8F7FF] transition-colors"
                title="Cancel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button 
                onClick={handleStopAndSend} 
                className="p-2 text-white bg-[#8771FF] rounded-full hover:bg-[#7660EE] transition-all shadow-sm hover:shadow-md hover:scale-105"
                title="Send"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex space-x-1 mr-2 text-[#B0B3BA]">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 rounded-full transition-colors ${attachmentFile ? 'text-[#8771FF] bg-[#8771FF]/10' : 'hover:text-[#606266] hover:bg-[#F8F7FF]'}`}
                title="Attach Image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              
              <button 
                onClick={startRecording}
                className="p-2 rounded-full hover:text-[#606266] hover:bg-[#F8F7FF] transition-colors"
                title="Record Voice Note"
                disabled={!user}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
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
              onPaste={(e) => {
                const imageItem = Array.from(e.clipboardData.items).find(
                  (item) => item.kind === 'file' && item.type.startsWith('image/')
                );
                if (!imageItem) return;
                const pastedImage = imageItem.getAsFile();
                if (!pastedImage) return;
                e.preventDefault();
                handleAttachmentPaste(pastedImage);
              }}
              disabled={!user}
              rows={1}
            />
          </>
        )}
      </div>
    </div>
  );
}

