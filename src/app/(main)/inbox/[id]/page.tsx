"use client";

import { useState, use, useCallback, useEffect, useRef } from 'react';
import ChatWindow from '@/components/inbox/ChatWindow';
import DetailsPanel from '@/components/inbox/DetailsPanel';
import ChatHeader from '@/components/inbox/ChatHeader';
import MessageInput from '@/components/inbox/MessageInput';
import { useChat } from '@/hooks/useChat';
import { useInboxSync } from '@/components/inbox/InboxSyncContext';

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { epoch, markChatReady } = useInboxSync();
  const [showVisible, setShowVisible] = useState(true);
  const [rightWidth, setRightWidth] = useState(400);
  const isResizingRightRef = useRef(false);
  
  const {
    user,
    chatHistory,
    loading,
    loadingOlder,
    hasMoreMessages,
    messageInput,
    setMessageInput,
    attachmentFile,
    attachmentPreview,
    handleFileSelect,
    handleAttachmentPaste,
    clearAttachment,
    handleSendMessage,
    handleSendAudio,
    statusUpdate,
    loadOlderMessages,
    conversationDetails,
    conversationDetailsSyncedAt,
    initialLoadSettled,
  } = useChat(id);

  const handleRightResizeStart = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    isResizingRightRef.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
  }, []);

  const handleRightResizeMove = useCallback((event: MouseEvent) => {
    if (!isResizingRightRef.current) return;
    const nextWidth = Math.max(320, Math.min(620, window.innerWidth - event.clientX));
    setRightWidth(nextWidth);
  }, []);

  const handleRightResizeEnd = useCallback(() => {
    isResizingRightRef.current = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleRightResizeMove);
    window.addEventListener('mouseup', handleRightResizeEnd);

    return () => {
      window.removeEventListener('mousemove', handleRightResizeMove);
      window.removeEventListener('mouseup', handleRightResizeEnd);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [handleRightResizeMove, handleRightResizeEnd]);

  useEffect(() => {
    if (!initialLoadSettled) return;
    markChatReady(epoch);
  }, [initialLoadSettled, markChatReady, epoch]);

  if (!user && !loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <p className="text-gray-500">User not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <main className="flex-1 flex flex-col min-w-0 bg-white border-r border-gray-200">
        <ChatHeader 
          user={user} 
          showVisible={showVisible} 
          onToggleVisible={() => setShowVisible(!showVisible)} 
        />

        <ChatWindow
          key={id}
          messages={chatHistory}
          loading={loading}
          loadingOlder={loadingOlder}
          hasMore={hasMoreMessages}
          onLoadMore={loadOlderMessages}
          statusUpdate={statusUpdate}
        />

        <MessageInput 
          messageInput={messageInput}
          setMessageInput={setMessageInput}
          handleSendMessage={handleSendMessage}
          user={user}
          attachmentFile={attachmentFile}
          attachmentPreview={attachmentPreview}
          handleFileSelect={handleFileSelect}
          handleAttachmentPaste={handleAttachmentPaste}
          clearAttachment={clearAttachment}
          handleSendAudio={handleSendAudio}
        />
      </main>

      {user && showVisible && (
        <>
          <div
            className="group hidden md:flex w-3 -mx-1 cursor-ew-resize items-stretch justify-center select-none touch-none"
            onMouseDown={handleRightResizeStart}
            aria-label="Resize right sidebar"
            role="separator"
          >
            <div className="w-px bg-stone-200 group-hover:bg-stone-300 transition-colors" />
          </div>
          <DetailsPanel
            user={user}
            width={rightWidth}
            syncedDetails={conversationDetails}
            syncedAt={conversationDetailsSyncedAt}
          />
        </>
      )}
    </div>
  );
}
