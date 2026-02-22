import { useState, useEffect, useRef } from 'react';
import { getInboxUsers, updateConversationPreview } from '@/app/actions/inbox';
import { getCachedUsers, getCachedMessages, getCachedConversationDetails, setCachedConversationDetails, setCachedMessages } from '@/lib/clientCache';
import { applyConversationPreviewUpdate } from '@/lib/inbox/clientPreviewSync';
import { INBOX_MESSAGE_EVENT, type InboxRealtimeMessageDetail } from '@/lib/inbox/clientRealtimeEvents';
import type { User, Message, MessagePageResponse, ConversationDetails, SSEMessageData } from '@/types/inbox';
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
  const [initialLoadSettled, setInitialLoadSettled] = useState(false);

  // Refs for race condition handling and dedup
  const fetchGenRef = useRef(0);
  const pendingTempIdsRef = useRef<string[]>([]);
  const nextCursorRef = useRef<string | null>(null);
  const reconcileTimersRef = useRef<number[]>([]);
  const detailsRefreshTimerRef = useRef<number | null>(null);
  const latestRefreshTimerRef = useRef<number | null>(null);
  const latestRefreshInFlightRef = useRef(false);
  const NO_MESSAGES_PLACEHOLDER_REGEX = /^no messages yet$/i;

  const clearReconcileTimers = () => {
    for (const timer of reconcileTimersRef.current) {
      window.clearTimeout(timer);
    }
    reconcileTimersRef.current = [];
  };

  const mergeMessages = (base: Message[], incoming: Message[]): Message[] => {
    const messageById = new Map<string, Message>();
    for (const message of base) {
      messageById.set(message.id, message);
    }
    for (const message of incoming) {
      const existing = messageById.get(message.id);
      if (!existing) {
        messageById.set(message.id, message);
        continue;
      }

      messageById.set(message.id, {
        ...existing,
        ...message,
        text: message.text || existing.text,
        duration: message.duration || existing.duration,
        attachmentUrl: message.attachmentUrl || existing.attachmentUrl,
        type: message.type !== 'text' ? message.type : existing.type,
      });
    }

    return Array.from(messageById.values()).sort((a, b) => {
      const aTs = Date.parse(a.timestamp || '');
      const bTs = Date.parse(b.timestamp || '');
      if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) {
        return aTs - bTs;
      }
      return a.id.localeCompare(b.id);
    });
  };

  const scheduleConversationDetailsRefresh = () => {
    if (detailsRefreshTimerRef.current) {
      window.clearTimeout(detailsRefreshTimerRef.current);
    }
    detailsRefreshTimerRef.current = window.setTimeout(async () => {
      try {
        const details = await fetchConversationDetails();
        setConversationDetails(details);
        setConversationDetailsSyncedAt(Date.now());
        if (details) {
          setCachedConversationDetails(selectedUserId, details).catch(e => console.error('Cache update failed:', e));
        }
      } catch (err) {
        console.error('Failed to refresh conversation details:', err);
      }
    }, 250);
  };

  async function fetchMessagePage(limit: number, cursor?: string): Promise<MessagePageResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);

    const response = await fetch(
      `/api/inbox/conversations/${encodeURIComponent(selectedUserId)}/messages?${params.toString()}`,
      { cache: 'no-store' }
    );
    if (!response.ok) {
      throw new Error('Failed to load messages');
    }

    return response.json();
  }

  const refreshLatestMessages = async (limit = 10) => {
    if (latestRefreshInFlightRef.current) return;
    if (document.visibilityState !== 'visible') return;
    latestRefreshInFlightRef.current = true;
    try {
      const page = await fetchMessagePage(limit);
      setChatHistory((prev) => {
        const merged = mergeMessages(prev, page.messages);
        setCachedMessages(selectedUserId, merged).catch(e => console.error('Cache update failed:', e));
        return merged;
      });
    } catch (err) {
      console.error('Failed to refresh latest messages:', err);
    } finally {
      latestRefreshInFlightRef.current = false;
    }
  };

  async function fetchLatestMessage(): Promise<Message | null> {
    const page = await fetchMessagePage(1);
    if (!page.messages.length) return null;
    return page.messages[page.messages.length - 1];
  }

  async function fetchConversationDetails(): Promise<ConversationDetails | null> {
    const response = await fetch(
      `/api/inbox/conversations/${encodeURIComponent(selectedUserId)}/details`,
      { cache: 'no-store' }
    );
    if (!response.ok) {
      throw new Error('Failed to load conversation details');
    }
    const data = await response.json();
    return data.details ?? null;
  }

  function getMessagePreviewText(message: Message): string {
    const text = typeof message.text === 'string' ? message.text.trim() : '';
    if (text) return text;

    if (message.type === 'audio') {
      return message.fromMe ? 'You sent a voice message' : 'Sent a voice message';
    }
    if (message.type === 'image') {
      return message.fromMe ? 'You sent an image' : 'Sent an image';
    }
    if (message.type === 'video') {
      return message.fromMe ? 'You sent a video' : 'Sent a video';
    }
    if (message.type === 'file') {
      return message.fromMe ? 'You sent an attachment' : 'Sent an attachment';
    }

    return message.fromMe ? 'You sent a message' : 'Sent a message';
  }

  async function hydrateSidebarPreviewFromMessages(messages: Message[]) {
    if (!messages.length) return;

    const latest = [...messages].reverse().find((msg) => {
      const text = typeof msg.text === 'string' ? msg.text.trim() : '';
      return Boolean(text) || msg.type !== 'text' || Boolean(msg.attachmentUrl);
    });
    if (!latest) return;

    const previewText = getMessagePreviewText(latest);
    if (!previewText) return;

    const previewTime = latest.timestamp
      ? new Date(latest.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const previewUpdatedAt = latest.timestamp ? new Date(latest.timestamp).toISOString() : new Date().toISOString();

    const cachedUsers = await getCachedUsers();
    const target = cachedUsers?.find((u) => u.id === selectedUserId);
    const currentPreview = target?.lastMessage?.trim() || user?.lastMessage?.trim() || '';

    if (currentPreview && !NO_MESSAGES_PLACEHOLDER_REGEX.test(currentPreview)) return;

    applyConversationPreviewUpdate({
      conversationId: selectedUserId,
      lastMessage: previewText,
      time: previewTime,
      updatedAt: previewUpdatedAt,
    }).catch((e) => console.error('Preview sync failed:', e));

    updateConversationPreview(selectedUserId, previewText, previewTime, false, false).catch((err) =>
      console.error('Failed to hydrate conversation preview:', err)
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    setAttachmentFile(file);
    setAttachmentPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleAttachmentPaste = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    setAttachmentFile(file);
    setAttachmentPreview(URL.createObjectURL(file));
  };

  const clearAttachment = () => {
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    setAttachmentFile(null);
    setAttachmentPreview('');
  };

  const handleAudioDurationResolved = (messageId: string, duration: string) => {
    setChatHistory((prev) => {
      let changed = false;
      const updated = prev.map((message) => {
        if (message.id !== messageId || message.type !== 'audio') return message;
        if (message.duration === duration) return message;
        changed = true;
        return { ...message, duration };
      });

      if (!changed) return prev;

      setCachedMessages(selectedUserId, updated).catch((e) =>
        console.error('Cache update failed:', e),
      );
      return updated;
    });
  };

  // Load User
  useEffect(() => {
    async function loadUser() {
      try {
        const cachedUsers = await getCachedUsers();
        const foundUser = cachedUsers?.find((u) => u.id === selectedUserId);
        if (foundUser) setUser(foundUser);

        const users = await getInboxUsers();
        const target = users.find((u) => u.id === selectedUserId);
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
        setInitialLoadSettled(false);
        setLoading(false);
        setLoadingOlder(false);
        setHasMoreMessages(true);
        nextCursorRef.current = null;
        clearReconcileTimers();
        setChatHistory([]);
        setConversationDetails(null);
        setConversationDetailsSyncedAt(0);

        const [cachedMessages, cachedDetails] = await Promise.all([
          getCachedMessages(selectedUserId),
          getCachedConversationDetails(selectedUserId),
        ]);
        if (gen !== fetchGenRef.current) return;

        const hasCachedMessages = Boolean(cachedMessages && cachedMessages.length > 0);
        if (!hasCachedMessages) {
          setLoading(true);
        }
        if (cachedMessages && cachedMessages.length > 0) {
          setChatHistory(cachedMessages.slice(-INITIAL_PAGE_SIZE));
          setLoading(false);
        }
        if (cachedDetails) {
          setConversationDetails(cachedDetails);
          setConversationDetailsSyncedAt(Date.now());
        }

        const [page, details] = await Promise.all([
          fetchMessagePage(INITIAL_PAGE_SIZE),
          fetchConversationDetails(),
        ]);
        if (gen !== fetchGenRef.current) return;

        setChatHistory((prev) => {
          const merged = mergeMessages(page.messages, prev);
          setCachedMessages(selectedUserId, merged).catch(e => console.error('Cache update failed:', e));
          hydrateSidebarPreviewFromMessages(merged).catch((e) => console.error('Preview hydration failed:', e));
          return merged;
        });
        setConversationDetails(details);
        setConversationDetailsSyncedAt(Date.now());
        nextCursorRef.current = page.nextCursor;
        setHasMoreMessages(page.hasMore);
        if (details) {
          setCachedConversationDetails(selectedUserId, details).catch(e => console.error('Cache update failed:', e));
        }
        setLoading(false);
        setInitialLoadSettled(true);
      } catch (err) {
        console.error('Error loading messages:', err);
        if (gen === fetchGenRef.current) {
          setLoading(false);
          setInitialLoadSettled(true);
        }
      }
    }
    pendingTempIdsRef.current = [];
    loadMessages();
  }, [selectedUserId]);

  const applyRealtimeMessageToChat = (eventType: 'new_message' | 'message_echo', data: SSEMessageData) => {
    const { fromMe: sseFromMe, text, messageId, timestamp, attachments, duration } = data;
    const sameConversationId = data.conversationId === selectedUserId;
    const sameParticipant =
      Boolean(user?.recipientId) &&
      (data.senderId === user?.recipientId || data.recipientId === user?.recipientId);
    const sameAccount = !user?.accountId || !data.accountId || user.accountId === data.accountId;
    const isForThisConversation = sameConversationId || (sameParticipant && sameAccount);

    if (!isForThisConversation) return;

    const fromMe = sseFromMe ?? eventType === 'message_echo';

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
      duration,
      timestamp: new Date(timestamp).toISOString(),
      attachmentUrl,
    };

    setChatHistory((prev) => {
      const queue = pendingTempIdsRef.current;
      const queueIdx = fromMe
        ? queue.findIndex((tempId) => {
            const tempMsg = prev.find((m) => m.id === tempId);
            if (!tempMsg || !tempMsg.pending) return false;
            if (tempMsg.text && newMessage.text) return tempMsg.text === newMessage.text;
            return tempMsg.type === newMessage.type;
          })
        : -1;

      if (queueIdx !== -1) {
        const matchedTempId = queue[queueIdx];
        queue.splice(queueIdx, 1);
        const alreadyExists = prev.some((msg) => msg.id === messageId);

        const updated = alreadyExists
          ? prev
              .filter((msg) => msg.id !== matchedTempId)
              .map((msg) => {
                if (msg.id !== messageId) return msg;
                return {
                  ...msg,
                  pending: false,
                  type: newMessage.type !== 'text' ? newMessage.type : msg.type,
                  attachmentUrl: newMessage.attachmentUrl || msg.attachmentUrl,
                  duration: newMessage.duration || msg.duration,
                };
              })
          : prev.map((msg) => {
              if (msg.id !== matchedTempId) return msg;
              return {
                ...newMessage,
                type: newMessage.type !== 'text' ? newMessage.type : msg.type,
                attachmentUrl: newMessage.attachmentUrl || msg.attachmentUrl,
                duration: newMessage.duration || msg.duration,
                pending: false,
              };
            });

        setCachedMessages(selectedUserId, updated).catch(e => console.error('Cache update failed:', e));
        return updated;
      }

      if (prev.some((msg) => msg.id === messageId)) {
        const updated = prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          return {
            ...msg,
            ...newMessage,
            text: newMessage.text || msg.text,
            duration: newMessage.duration || msg.duration,
            attachmentUrl: newMessage.attachmentUrl || msg.attachmentUrl,
            type: newMessage.type !== 'text' ? newMessage.type : msg.type,
          };
        });
        setCachedMessages(selectedUserId, updated).catch(e => console.error('Cache update failed:', e));
        return updated;
      }

      const updated = [...prev, newMessage];
      setCachedMessages(selectedUserId, updated).catch(e => console.error('Cache update failed:', e));
      return updated;
    });

    scheduleConversationDetailsRefresh();
  };

  // SSE
  useSSE('/api/sse', {
    onMessage: (message) => {
      if (message.type === 'new_message' || message.type === 'message_echo') {
        const sameConversationId = message.data.conversationId === selectedUserId;
        const sameParticipant =
          Boolean(user?.recipientId) &&
          (message.data.senderId === user?.recipientId || message.data.recipientId === user?.recipientId);
        const sameAccount = !user?.accountId || !message.data.accountId || user.accountId === message.data.accountId;
        const isForConversation = sameConversationId || (sameParticipant && sameAccount);
        if (!isForConversation) return;

        applyRealtimeMessageToChat(message.type, message.data);
        refreshLatestMessages(INITIAL_PAGE_SIZE)
          .catch((error) => {
            console.error('Failed to refresh messages from raw realtime SSE:', error);
          });
        return;
      }

      if (message.type === 'messages_synced') {
        if (message.data.conversationId !== selectedUserId) {
          const sameParticipant =
            Boolean(user?.recipientId) &&
            message.data.recipientId === user?.recipientId;
          if (!sameParticipant) return;
        }
        refreshLatestMessages(INITIAL_PAGE_SIZE).catch((error) =>
          console.error('Failed to refresh messages after sync event:', error)
        );
        scheduleConversationDetailsRefresh();
      }
    },
  });

  useEffect(() => {
    const REFRESH_INTERVAL_MS = 12000;

    const stop = () => {
      if (latestRefreshTimerRef.current) {
        window.clearInterval(latestRefreshTimerRef.current);
        latestRefreshTimerRef.current = null;
      }
    };

    const start = () => {
      if (latestRefreshTimerRef.current) return;
      latestRefreshTimerRef.current = window.setInterval(() => {
        refreshLatestMessages().catch(() => {});
      }, REFRESH_INTERVAL_MS);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshLatestMessages().catch(() => {});
        start();
        return;
      }
      stop();
    };

    const onFocus = () => {
      refreshLatestMessages().catch(() => {});
    };

    if (document.visibilityState === 'visible') {
      start();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
      stop();
    };
  }, [selectedUserId]);

  useEffect(() => {
    const realtimeMessageHandler = (event: Event) => {
      const customEvent = event as CustomEvent<InboxRealtimeMessageDetail>;
      const detail = customEvent.detail;
      if (!detail?.data || !detail?.type) return;

      const sameConversationId = detail.data.conversationId === selectedUserId;
      const sameParticipant =
        Boolean(user?.recipientId) &&
        (detail.data.senderId === user?.recipientId || detail.data.recipientId === user?.recipientId);
      const sameAccount = !user?.accountId || !detail.data.accountId || user.accountId === detail.data.accountId;
      const isForConversation = sameConversationId || (sameParticipant && sameAccount);
      if (!isForConversation) return;

      refreshLatestMessages(INITIAL_PAGE_SIZE)
        .then(() => {
          scheduleConversationDetailsRefresh();
        })
        .catch((error) => {
          console.error('Failed to refresh messages from synchronized realtime event:', error);
          applyRealtimeMessageToChat(detail.type, detail.data);
        });
    };

    window.addEventListener(INBOX_MESSAGE_EVENT, realtimeMessageHandler);
    return () => {
      window.removeEventListener(INBOX_MESSAGE_EVENT, realtimeMessageHandler);
    };
  }, [selectedUserId, user]);

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
    if ((!hasText && !hasAttachment) || !user?.id) return;

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
    const previewUpdatedAt = new Date().toISOString();
    applyConversationPreviewUpdate({
      conversationId: selectedUserId,
      lastMessage: previewText,
      time: previewTime,
      updatedAt: previewUpdatedAt,
    }).catch((err) => console.error('Failed to sync preview locally:', err));
    updateConversationPreview(selectedUserId, previewText, previewTime, false, true).catch(err => console.error('Failed to update preview:', err));

    try {
      if (currentFile) {
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('conversationId', user.id);
        formData.append('type', 'image');

        const res = await fetch('/api/send-attachment', { method: 'POST', body: formData });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to send attachment');

        if (messageText) {
          const sendRes = await fetch(`/api/inbox/conversations/${encodeURIComponent(user.id)}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: messageText, clientTempId: tempIds[tempIds.length - 1] }),
          });
          if (!sendRes.ok) throw new Error((await sendRes.json()).error || 'Failed to send message');
        }
      } else {
        const sendRes = await fetch(`/api/inbox/conversations/${encodeURIComponent(user.id)}/send`, {
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
              const queue = pendingTempIdsRef.current;
              const queueIdx = queue.findIndex((tempId) => {
                const tempMsg = prev.find((m) => m.id === tempId);
                return Boolean(
                  tempMsg?.pending &&
                  ((tempMsg.text && latest.text && tempMsg.text === latest.text) || tempMsg?.type === latest.type)
                );
              });
              if (queueIdx === -1) {
                if (prev.some((msg) => msg.id === latest.id)) return prev;
                return prev;
              }

              const matchedTempId = queue[queueIdx];
              queue.splice(queueIdx, 1);
              const alreadyExists = prev.some((msg) => msg.id === latest.id);
              const updated = alreadyExists
                ? prev
                    .filter((msg) => msg.id !== matchedTempId)
                    .map((msg) => {
                      if (msg.id !== latest.id) return msg;
                      return {
                        ...msg,
                        pending: false,
                        type: latest.type !== 'text' ? latest.type : msg.type,
                        attachmentUrl: latest.attachmentUrl || msg.attachmentUrl,
                      };
                    })
                : prev.map((msg) => {
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
    if (!user?.id) return;

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
    const audioPreviewTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    applyConversationPreviewUpdate({
      conversationId: selectedUserId,
      lastMessage: 'You sent a voice message',
      time: audioPreviewTime,
      updatedAt: new Date().toISOString(),
    }).catch((err) => console.error('Failed to sync preview locally:', err));
    updateConversationPreview(selectedUserId, 'You sent a voice message', audioPreviewTime, false, true)
      .catch(err => console.error('Failed to update preview:', err));

    try {
      const formData = new FormData();
      // Ensure we have a valid extension based on type, default to .mp4 or .webm
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'; 
      const file = new File([blob], `voice_note.${ext}`, { type: blob.type });
      
      formData.append('file', file);
      formData.append('conversationId', user.id);
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
      if (detailsRefreshTimerRef.current) {
        window.clearTimeout(detailsRefreshTimerRef.current);
      }
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
    handleAttachmentPaste,
    clearAttachment,
    handleSendMessage,
    handleSendAudio,
    statusUpdate,
    loadOlderMessages,
    handleAudioDurationResolved,
    conversationDetails,
    conversationDetailsSyncedAt,
    initialLoadSettled,
  };
}
