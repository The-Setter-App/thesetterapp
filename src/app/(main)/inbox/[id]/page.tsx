"use client";

import { useState, use } from 'react';
import ChatWindow from '@/components/inbox/ChatWindow';
import DetailsPanel from '@/components/inbox/DetailsPanel';
import ChatHeader from '@/components/inbox/ChatHeader';
import MessageInput from '@/components/inbox/MessageInput';
import { useChat } from '@/hooks/useChat';

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [showVisible, setShowVisible] = useState(true);
  
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
    clearAttachment,
    handleSendMessage,
    handleSendAudio,
    statusUpdate,
    loadOlderMessages,
  } = useChat(id);

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
          clearAttachment={clearAttachment}
          handleSendAudio={handleSendAudio}
        />
      </main>

      {user && showVisible && <DetailsPanel user={user} />}
    </div>
  );
}
