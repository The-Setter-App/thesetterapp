import { useState, useEffect, useRef } from 'react';
import { getInboxUsers, getConversationMessages, sendNewMessage, updateConversationPreview } from '@/app/actions/inbox';
import { getCachedUsers, getCachedMessages, setCachedMessages } from '@/lib/clientCache';
import type { User, Message } from '@/types/inbox';
import { useSSE } from '@/hooks/useSSE';

export function useChat(selectedUserId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState('');
  const [statusUpdate, setStatusUpdate] = useState<{ status: string; timestamp: Date | string } | undefined>(undefined);

  // Refs for race condition handling and dedup
  const fetchGenRef = useRef(0);
  const pendingTempIdsRef = useRef<string[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachmentFile(file);
    setAttachmentPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const clearAttachment = () => {
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    setAttachmentFile(null);
    setAttachmentPreview('');
  };

  // Load User
  useEffect(() => {
    async function loadUser() {
      try {
        const cachedUsers = await getCachedUsers();
        const foundUser = cachedUsers?.find(u => u.recipientId === selectedUserId);
        if (foundUser) setUser(foundUser);

        const users = await getInboxUsers();
        const target = users.find(u => u.recipientId === selectedUserId);
        if (target) setUser(target);
      } catch (err) {
        console.error('Error loading user:', err);
      }
    }
    loadUser();
  }, [selectedUserId]);

  // Load Messages
  useEffect(() => {
    const gen = ++fetchGenRef.current;
    async function loadMessages() {
      try {
        setLoading(true);
        const cachedMessages = await getCachedMessages(selectedUserId);
        if (cachedMessages && cachedMessages.length > 0) {
          setChatHistory(cachedMessages);
          setLoading(false);
        }

        const messages = await getConversationMessages(selectedUserId);
        if (gen !== fetchGenRef.current) return;

        setChatHistory(messages);
        setCachedMessages(selectedUserId, messages).catch(e => console.error('Cache update failed:', e));
        setLoading(false);
      } catch (err) {
        console.error('Error loading messages:', err);
        if (gen === fetchGenRef.current) setLoading(false);
      }
    }
    pendingTempIdsRef.current = [];
    loadMessages();
  }, [selectedUserId]);

  // SSE
  useSSE('/api/sse', {
    onMessage: (message) => {
      if (message.type === 'new_message' || message.type === 'message_echo') {
        const { fromMe: sseFromMe, text, messageId, timestamp, attachments } = message.data;
        const isForThisConversation =
          message.data.senderId === selectedUserId ||
          message.data.recipientId === selectedUserId;

        if (!isForThisConversation) return;

        fetchGenRef.current++;
        const fromMe = sseFromMe ?? message.type === 'message_echo';

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
          if (prev.some((msg) => msg.id === messageId)) return prev;

          if (message.type === 'message_echo' && fromMe) {
            const queue = pendingTempIdsRef.current;
            const queueIdx = queue.findIndex((tempId) => {
              const tempMsg = prev.find((m) => m.id === tempId);
              return tempMsg && tempMsg.text === newMessage.text;
            });

            if (queueIdx !== -1) {
              const matchedTempId = queue[queueIdx];
              queue.splice(queueIdx, 1);
              const updated = prev.map((msg) => {
                if (msg.id !== matchedTempId) return msg;
                return {
                  ...newMessage,
                  type: newMessage.type !== 'text' ? newMessage.type : msg.type,
                  attachmentUrl: newMessage.attachmentUrl || msg.attachmentUrl,
                };
              });
              setCachedMessages(selectedUserId, updated).catch(e => console.error('Cache update failed:', e));
              return updated;
            }
          }
          const updated = [...prev, newMessage];
          setCachedMessages(selectedUserId, updated).catch(e => console.error('Cache update failed:', e));
          return updated;
        });
      }

      if (message.type === 'messages_synced') {
        const syncedRecipientId = message.data?.recipientId;
        if (syncedRecipientId === selectedUserId) {
          getConversationMessages(selectedUserId).then((freshMessages) => {
            if (freshMessages && freshMessages.length > 0) {
              setChatHistory(freshMessages);
              setCachedMessages(selectedUserId, freshMessages).catch(e => console.error('Cache update failed:', e));
            }
          }).catch(err => console.error('Failed to refresh after sync:', err));
        }
      }
    },
  });

  const handleSendMessage = async () => {
    const hasText = messageInput.trim().length > 0;
    const hasAttachment = !!attachmentFile;
    if ((!hasText && !hasAttachment) || !user?.recipientId) return;

    const messageText = messageInput.trim();
    const currentFile = attachmentFile;
    const currentPreview = attachmentPreview;
    const now = new Date().toISOString();
    const tempIds: string[] = [];
    const optimisticMessages: Message[] = [];

    if (hasAttachment) {
      const imageTempId = `temp_${Date.now()}_img_${Math.random().toString(36).substr(2, 9)}`;
      tempIds.push(imageTempId);
      optimisticMessages.push({
        id: imageTempId,
        fromMe: true,
        type: 'image',
        text: '',
        timestamp: now,
        attachmentUrl: currentPreview || undefined,
      });
    }

    if (hasText) {
      const textTempId = `temp_${Date.now()}_txt_${Math.random().toString(36).substr(2, 9)}`;
      tempIds.push(textTempId);
      optimisticMessages.push({
        id: textTempId,
        fromMe: true,
        type: 'text',
        text: messageText,
        timestamp: now,
      });
    }

    setChatHistory((prev) => [...prev, ...optimisticMessages]);
    pendingTempIdsRef.current.push(...tempIds);
    setMessageInput('');
    setAttachmentFile(null);
    setAttachmentPreview('');

    const previewTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const previewText = messageText || (hasAttachment ? '📷 Image' : 'Message');
    updateConversationPreview(selectedUserId, previewText, previewTime, false).catch(err => console.error('Failed to update preview:', err));

    try {
      setSendingMessage(true);
      if (currentFile) {
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('recipientId', user.recipientId);
        formData.append('type', 'image');

        const res = await fetch('/api/send-attachment', { method: 'POST', body: formData });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to send attachment');
        
        if (messageText) await sendNewMessage(user.recipientId, messageText);
      } else {
        await sendNewMessage(user.recipientId, messageText);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      const tempIdSet = new Set(tempIds);
      setChatHistory((prev) => prev.filter(msg => !tempIdSet.has(msg.id)));
      setMessageInput(messageText);
      if (currentFile && currentPreview) {
        setAttachmentFile(currentFile);
        setAttachmentPreview(currentPreview);
      }
      alert('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendAudio = async (blob: Blob, duration: number) => {
    if (!user?.recipientId) return;

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const now = new Date().toISOString();
    const tempId = `temp_${Date.now()}_audio_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create optimistic message
    const optimisticMessage: Message = {
      id: tempId,
      fromMe: true,
      type: 'audio',
      timestamp: now,
      attachmentUrl: URL.createObjectURL(blob),
      duration: formatDuration(duration),
    };

    setChatHistory((prev) => [...prev, optimisticMessage]);
    pendingTempIdsRef.current.push(tempId);

    // Update preview
    updateConversationPreview(selectedUserId, '🎤 Voice Message', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), false)
      .catch(err => console.error('Failed to update preview:', err));

    try {
      const formData = new FormData();
      // Ensure we have a valid extension based on type, default to .mp4 or .webm
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'; 
      const file = new File([blob], `voice_note.${ext}`, { type: blob.type });
      
      formData.append('file', file);
      formData.append('recipientId', user.recipientId);
      formData.append('type', 'audio');

      const res = await fetch('/api/send-attachment', { method: 'POST', body: formData });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to send audio');
      
    } catch (err) {
      console.error('Error sending audio:', err);
      setChatHistory((prev) => prev.filter(msg => msg.id !== tempId));
      alert('Failed to send voice note');
    }
  };

  // Listen for local status updates
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.userId === selectedUserId) {
        setStatusUpdate({
          status: customEvent.detail.status,
          timestamp: new Date()
        });
      }
    };
    window.addEventListener('userStatusUpdated', handler);
    return () => window.removeEventListener('userStatusUpdated', handler);
  }, [selectedUserId]);

  return {
    user,
    chatHistory,
    loading,
    messageInput,
    setMessageInput,
    sendingMessage,
    attachmentFile,
    attachmentPreview,
    handleFileSelect,
    clearAttachment,
    handleSendMessage,
    handleSendAudio,
    statusUpdate
  };
}