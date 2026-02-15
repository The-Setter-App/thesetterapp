import { useState, useEffect, useRef } from 'react';
import { getInboxUsers, updateConversationPreview } from '@/app/actions/inbox';
import { getCachedUsers, getCachedMessages, setCachedMessages } from '@/lib/clientCache';
import type { User, Message, MessagePageResponse, ConversationDetails } from '@/types/inbox';
import { useSSE } from '@/hooks/useSSE';

export function useChat(selectedUserId: string) {
  const INITIAL_PAGE_SIZE = 20;
  const [user, setUser] = useState<User | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState('');
  const [statusUpdate, setStatusUpdate] = useState<{ status: string; timestamp: Date | string } | undefined>(undefined);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [conversationDetails, setConversationDetails] = useState<ConversationDetails | null>(null);
  const [conversationDetailsSyncedAt, setConversationDetailsSyncedAt] = useState(0);

  // Refs for race condition handling and dedup
  const fetchGenRef = useRef(0);
  const pendingTempIdsRef = useRef<string[]>([]);
  const nextCursorRef = useRef<string | null>(null);
  const reconcileTimersRef = useRef<number[]>([]);

  const clearReconcileTimers = () => {
    for (const timer of reconcileTimersRef.current) {
      window.clearTimeout(timer);
    }
    reconcileTimersRef.current = [];
  };

  async function fetchMessagePage(limit: number, cursor?: string): Promise<MessagePageResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);

    const response = await fetch(`/api/inbox/conversations/${encodeURIComponent(selectedUserId)}/messages?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to load messages');
    }

    return response.json();
  }

  async function fetchLatestMessage(): Promise<Message | null> {
    const page = await fetchMessagePage(1);
    if (!page.messages.length) return null;
    return page.messages[page.messages.length - 1];
  }

  async function fetchConversationDetails(): Promise<ConversationDetails | null> {
    const response = await fetch(`/api/inbox/conversations/${encodeURIComponent(selectedUserId)}/details`);
    if (!response.ok) {
      throw new Error('Failed to load conversation details');
    }
    const data = await response.json();
    return data.details ?? null;
  }

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
        setLoadingOlder(false);
        setHasMoreMessages(true);
        nextCursorRef.current = null;
        clearReconcileTimers();
        setConversationDetails(null);
        setConversationDetailsSyncedAt(0);

        const cachedMessages = await getCachedMessages(selectedUserId);
        if (cachedMessages && cachedMessages.length > 0) {
          setChatHistory(cachedMessages.slice(-INITIAL_PAGE_SIZE));
          setLoading(false);
        }

        const [page, details] = await Promise.all([
          fetchMessagePage(INITIAL_PAGE_SIZE),
          fetchConversationDetails(),
        ]);
        if (gen !== fetchGenRef.current) return;

        setChatHistory(page.messages);
        setConversationDetails(details);
        setConversationDetailsSyncedAt(Date.now());
        nextCursorRef.current = page.nextCursor;
        setHasMoreMessages(page.hasMore);
        setCachedMessages(selectedUserId, page.messages).catch(e => console.error('Cache update failed:', e));
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
          const payloadUrl = attachment.payload?.url;
          if (attachment.image_data || attachment.type === 'image') {
            messageType = 'image';
            attachmentUrl = attachment.image_data?.url || payloadUrl;
          } else if (attachment.video_data || attachment.type === 'video') {
            messageType = 'video';
            attachmentUrl = attachment.video_data?.url || payloadUrl;
          } else if (attachment.file_url || payloadUrl || attachment.type === 'audio' || attachment.type === 'file') {
            const fileUrl = attachment.file_url || payloadUrl;
            const isAudio = attachment.type === 'audio' || Boolean(fileUrl && (fileUrl.includes('audio') || fileUrl.endsWith('.mp3') || fileUrl.endsWith('.m4a') || fileUrl.endsWith('.ogg')));
            messageType = isAudio ? 'audio' : 'file';
            attachmentUrl = fileUrl;
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
              if (!tempMsg || !tempMsg.pending) return false;
              if (tempMsg.text && newMessage.text) return tempMsg.text === newMessage.text;
              return tempMsg.type === newMessage.type;
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
                  pending: false,
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
    },
  });

  const loadOlderMessages = async () => {
    if (loadingOlder || !hasMoreMessages || !nextCursorRef.current) return;

    try {
      setLoadingOlder(true);
      const page = await fetchMessagePage(INITIAL_PAGE_SIZE, nextCursorRef.current);

      setChatHistory((prev) => {
        if (page.messages.length === 0) return prev;
        const seen = new Set(prev.map((msg) => msg.id));
        const older = page.messages.filter((msg) => !seen.has(msg.id));
        const updated = [...older, ...prev];
        setCachedMessages(selectedUserId, updated).catch(e => console.error('Cache update failed:', e));
        return updated;
      });

      nextCursorRef.current = page.nextCursor;
      setHasMoreMessages(page.hasMore);
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  };

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
        clientTempId: imageTempId,
        fromMe: true,
        type: 'image',
        text: '',
        timestamp: now,
        attachmentUrl: currentPreview || undefined,
        pending: true,
      });
    }

    if (hasText) {
      const textTempId = `temp_${Date.now()}_txt_${Math.random().toString(36).substr(2, 9)}`;
      tempIds.push(textTempId);
      optimisticMessages.push({
        id: textTempId,
        clientTempId: textTempId,
        fromMe: true,
        type: 'text',
        text: messageText,
        timestamp: now,
        pending: true,
      });
    }

    setChatHistory((prev) => [...prev, ...optimisticMessages]);
    pendingTempIdsRef.current.push(...tempIds);
    setMessageInput('');
    setAttachmentFile(null);
    setAttachmentPreview('');

    const previewTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const previewText = messageText || (hasAttachment ? 'Image' : 'Message');
    updateConversationPreview(selectedUserId, previewText, previewTime, false, true).catch(err => console.error('Failed to update preview:', err));

    try {
      if (currentFile) {
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('recipientId', user.recipientId);
        formData.append('type', 'image');

        const res = await fetch('/api/send-attachment', { method: 'POST', body: formData });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to send attachment');

        if (messageText) {
          const sendRes = await fetch(`/api/inbox/conversations/${encodeURIComponent(user.recipientId)}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: messageText, clientTempId: tempIds[tempIds.length - 1] }),
          });
          if (!sendRes.ok) throw new Error((await sendRes.json()).error || 'Failed to send message');
        }
      } else {
        const sendRes = await fetch(`/api/inbox/conversations/${encodeURIComponent(user.recipientId)}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: messageText, clientTempId: tempIds[tempIds.length - 1] }),
        });
        if (!sendRes.ok) throw new Error((await sendRes.json()).error || 'Failed to send message');
      }

      const timer = window.setTimeout(() => {
        const hasPending = tempIds.some((tempId) => pendingTempIdsRef.current.includes(tempId));
        if (!hasPending) return;

        fetchLatestMessage()
          .then((latest) => {
            if (!latest || !latest.fromMe) return;

            setChatHistory((prev) => {
              if (prev.some((msg) => msg.id === latest.id)) return prev;

              const queue = pendingTempIdsRef.current;
              const queueIdx = queue.findIndex((tempId) => {
                const tempMsg = prev.find((m) => m.id === tempId);
                return Boolean(
                  tempMsg?.pending &&
                  ((tempMsg.text && latest.text && tempMsg.text === latest.text) || tempMsg?.type === latest.type)
                );
              });
              if (queueIdx === -1) return prev;

              const matchedTempId = queue[queueIdx];
              queue.splice(queueIdx, 1);
              const updated = prev.map((msg) => {
                if (msg.id !== matchedTempId) return msg;
                return {
                  ...latest,
                  pending: false,
                  type: latest.type !== 'text' ? latest.type : msg.type,
                  attachmentUrl: latest.attachmentUrl || msg.attachmentUrl,
                };
              });
              setCachedMessages(selectedUserId, updated).catch(e => console.error('Cache update failed:', e));
              return updated;
            });
          })
          .catch((err) => console.error('Failed latest message fallback:', err));
      }, 3500);
      reconcileTimersRef.current.push(timer);
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
      clientTempId: tempId,
      fromMe: true,
      type: 'audio',
      timestamp: now,
      attachmentUrl: URL.createObjectURL(blob),
      duration: formatDuration(duration),
      pending: true,
    };

    setChatHistory((prev) => [...prev, optimisticMessage]);
    pendingTempIdsRef.current.push(tempId);

    // Update preview
    updateConversationPreview(selectedUserId, 'You sent a voice message', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), false, true)
      .catch(err => console.error('Failed to update preview:', err));

    try {
      const formData = new FormData();
      // Ensure we have a valid extension based on type, default to .mp4 or .webm
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'; 
      const file = new File([blob], `voice_note.${ext}`, { type: blob.type });
      
      formData.append('file', file);
      formData.append('recipientId', user.recipientId);
      formData.append('type', 'audio');
      formData.append('clientTempId', tempId);
      formData.append('duration', formatDuration(duration));

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

  useEffect(() => {
    return () => {
      clearReconcileTimers();
    };
  }, []);

  return {
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
    conversationDetails,
    conversationDetailsSyncedAt,
  };
}
