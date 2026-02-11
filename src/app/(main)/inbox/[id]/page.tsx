"use client";

import { useState, useEffect, useRef, use } from 'react';
import { getInboxUsers, getConversationMessages, sendNewMessage, updateConversationPreview } from '@/app/actions/inbox';
import { getCachedUsers, getCachedMessages, setCachedMessages, updateCachedMessages } from '@/lib/clientCache';
import type { User, Message, SSEMessageData } from '@/types/inbox';
import ChatWindow from '@/components/inbox/ChatWindow';
import DetailsPanel from '@/components/inbox/DetailsPanel';
import { useSSE } from '@/hooks/useSSE';

const EyeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params using React.use()
  const { id: selectedUserId } = use(params);
  
  const [user, setUser] = useState<User | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [showVisible, setShowVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Fix B: Fetch-generation counter prevents stale loadMessages responses
  // from overwriting messages that arrived via SSE while the fetch was in-flight.
  const fetchGenRef = useRef(0);

  // Fix E: FIFO queue of pending temp IDs awaiting echo confirmation.
  // When multiple messages with identical text are sent rapidly, findIndex
  // always matched the FIRST temp — leaving the second as a duplicate.
  // A queue pops from the front so each echo consumes exactly one temp.
  const pendingTempIdsRef = useRef<string[]>([]);

  // Load User Details
  useEffect(() => {
    async function loadUser() {
      try {
        // Try to find user in cache first (populated by Sidebar)
        const cachedUsers = await getCachedUsers();
        const foundUser = cachedUsers?.find(u => u.recipientId === selectedUserId);
        
        if (foundUser) {
          setUser(foundUser);
        } else {
          // If not in cache, fetch fresh
          const users = await getInboxUsers();
          const target = users.find(u => u.recipientId === selectedUserId);
          if (target) setUser(target);
        }
      } catch (err) {
        console.error('Error loading user:', err);
      }
    }
    loadUser();
  }, [selectedUserId]);

  // Load Messages (Fix B: fetch-generation guard)
  useEffect(() => {
    // Increment generation on every mount / conversation switch.
    // If an SSE message arrives while the fetch is in-flight, the
    // generation will have advanced and we skip the stale overwrite.
    const gen = ++fetchGenRef.current;

    async function loadMessages() {
      try {
        setLoading(true);

        // Load cached messages instantly for perceived speed
        const cachedMessages = await getCachedMessages(selectedUserId);
        if (cachedMessages && cachedMessages.length > 0) {
          setChatHistory(cachedMessages);
          setLoading(false); // Fix: Show content immediately if we have cache
        }

        // Fetch fresh messages from server
        const messages = await getConversationMessages(selectedUserId);

        // Guard: only apply if this is still the latest fetch
        if (gen !== fetchGenRef.current) return;

        setChatHistory(messages);
        setCachedMessages(selectedUserId, messages).catch(e => console.error('Cache update failed:', e));
        
        // Ensure loading is false (in case we had no cache)
        setLoading(false);
      } catch (err) {
        console.error('Error loading messages:', err);
        if (gen === fetchGenRef.current) setLoading(false);
      }
    }

    // Reset the FIFO queue when switching conversations
    pendingTempIdsRef.current = [];
    loadMessages();
  }, [selectedUserId]);

  // Real-time SSE connection (Fix B: uses conversationId from payload, Fix E: FIFO dedup)
  useSSE('/api/sse', {
    onMessage: (message) => {
      if (message.type === 'new_message' || message.type === 'message_echo') {
        const { fromMe: sseFromMe, text, messageId, timestamp, attachments } = message.data;

        // Route SSE messages by matching the participant's recipientId (the URL key).
        // Since selectedUserId is now a recipientId, we match directly against
        // the sender/recipient IDs in the SSE payload.
        const isForThisConversation =
          message.data.senderId === selectedUserId ||
          message.data.recipientId === selectedUserId;

        if (!isForThisConversation) return;

        // Bump the fetch generation so any in-flight loadMessages won't
        // overwrite messages we're about to add via SSE (Fix B).
        fetchGenRef.current++;

        // Use the server-determined fromMe flag (Fix A)
        const fromMe = sseFromMe ?? message.type === 'message_echo';

        // Determine message type from attachments
        let messageType: Message['type'] = 'text';
        let attachmentUrl: string | undefined;

        if (attachments && attachments.length > 0) {
          const attachment = attachments[0];
          if (attachment.image_data) {
            messageType = 'image';
            attachmentUrl = attachment.image_data.url;
          } else if (attachment.video_data) {
            messageType = 'video';
            attachmentUrl = attachment.video_data.url;
          } else if (attachment.file_url) {
            messageType = 'file';
            attachmentUrl = attachment.file_url;
          }
        }

        const newMessage: Message = {
          id: messageId,
          fromMe,
          type: messageType,
          text: text || '',
          timestamp: new Date(timestamp).toISOString(),
          attachmentUrl,
        };

        setChatHistory((prev) => {
          // Deduplication: skip if message with this real ID already exists
          if (prev.some((msg) => msg.id === messageId)) return prev;

          // Fix E: FIFO queue dedup for message_echo events.
          // Instead of findIndex (which always matches the FIRST temp with
          // the same text), we pop the oldest pending temp ID from the queue
          // so each echo consumes exactly one optimistic message.
          if (message.type === 'message_echo' && fromMe) {
            const queue = pendingTempIdsRef.current;
            // Find the first queued temp whose text matches
            const queueIdx = queue.findIndex((tempId) => {
              const tempMsg = prev.find((m) => m.id === tempId);
              return tempMsg && tempMsg.text === newMessage.text;
            });

            if (queueIdx !== -1) {
              const matchedTempId = queue[queueIdx];
              // Remove from FIFO queue
              queue.splice(queueIdx, 1);

              const updated = prev.map((msg) =>
                msg.id === matchedTempId ? newMessage : msg
              );
              setCachedMessages(selectedUserId, updated).catch(e => console.error('Cache update failed:', e));
              return updated;
            }
          }

          // No temp match — append as a genuinely new message
          const updated = [...prev, newMessage];
          setCachedMessages(selectedUserId, updated).catch(e => console.error('Cache update failed:', e));
              return updated;
        });
      }
    },
  });

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !user?.recipientId) return;

    const messageText = messageInput.trim();
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Optimistic UI Update: Add message immediately
    const optimisticMessage: Message = {
      id: tempId,
      fromMe: true,
      type: 'text',
      text: messageText,
      timestamp: new Date().toISOString(),
    };

    setChatHistory((prev) => [...prev, optimisticMessage]);
    // Fix E: Push temp ID to FIFO queue so the echo handler can match it
    pendingTempIdsRef.current.push(tempId);
    setMessageInput('');

    // Optimistically update conversation metadata in MongoDB
    // so the sidebar preview stays in sync even after page reload
    const previewTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    updateConversationPreview(selectedUserId, messageText, previewTime, false).catch(
      (err) => console.error('[ChatPage] Failed to update conversation preview:', err)
    );

    try {
      setSendingMessage(true);
      
      // Send message to API (this will trigger webhook echo)
      await sendNewMessage(
        user.recipientId,
        messageText
      );
      
      // Note: We don't update chat history here because:
      // 1. Optimistic message is already shown
      // 2. Webhook will send the real message with actual ID
      // 3. Deduplication will replace temp message with real one
      
    } catch (err) {
      console.error('Error sending message:', err);
      
      // Remove optimistic message on error
      setChatHistory((prev) => prev.filter(msg => msg.id !== tempId));
      setMessageInput(messageText); // Restore input
      alert('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  if (!user && !loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <p className="text-gray-500">User not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white border-r border-gray-200">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover mr-3" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-400 to-yellow-300 mr-3 flex items-center justify-center text-white font-bold text-xs">
                ●
              </div>
            )}
            <div>
              <div className="font-bold text-sm text-gray-900">{user?.name?.replace('@', '') || 'Loading...'}</div>
              <div className="text-xs text-gray-400">{user?.name || ''}</div>
            </div>
          </div>
          <div className="flex items-center">
            <button onClick={() => setShowVisible((v) => !v)} className="mr-4 focus:outline-none">
              {showVisible ? (
                <div className="flex items-center justify-center w-7 h-7 rounded-md border border-gray-200">
                  <EyeIcon className="w-4 h-4 text-gray-500" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-7 h-7 rounded-md border border-gray-200">
                  <img src="/icons/Hidden.svg" alt="Hidden" className="w-4 h-4" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto">
             <ChatWindow messages={chatHistory} loading={loading} />
        </div>

        {/* Message Input */}
        <div className="p-4 bg-white mx-8 mb-4 flex-shrink-0">
          <div className="relative flex items-center border border-gray-200 rounded-lg p-2 shadow-sm">
            <div className="flex space-x-2 mr-2 text-gray-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </div>
            <input
              className="flex-1 bg-transparent text-sm placeholder-gray-400 focus:outline-none"
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
            />
            {sendingMessage && (
              <div className="ml-2 h-4 w-4 border-2 border-[#8771FF] border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
        </div>
      </main>

      {/* Details Panel (Right) */}
      {user && <DetailsPanel user={user} />}
    </div>
  );
}