import { useState, useEffect, useRef } from 'react';
import { getInboxUsers, updateConversationPreview } from '@/app/actions/inbox';
import {
  getCachedConversationDetails,
  getCachedMessagePageMeta,
  getCachedMessages,
  getCachedUsers,
  getHotCachedConversationDetails,
  getHotCachedMessagePageMeta,
  getHotCachedMessages,
  getHotCachedUsers,
  setCachedConversationDetails,
  setCachedMessagePageMeta,
  setCachedMessages,
} from '@/lib/cache';
import { applyConversationPreviewUpdate } from '@/lib/inbox/clientPreviewSync';
import {
  INBOX_CONVERSATIONS_REFRESHED_EVENT,
  INBOX_MESSAGE_EVENT,
  type InboxConversationsRefreshedDetail,
  type InboxRealtimeMessageDetail,
} from '@/lib/inbox/clientRealtimeEvents';
import type { User, Message, MessagePageResponse, ConversationDetails, SSEMessageData } from '@/types/inbox';
import { mapRealtimePayloadToMessage } from '@/lib/inbox/realtime/messageMapping';

const INITIAL_PAGE_SIZE = 20;
const PREFETCH_FRESH_MS = 5 * 60 * 1000;
const SESSION_VALIDATED_CONVERSATIONS = new Set<string>();

export function useChat(selectedUserId: string) {
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
  const revalidateInFlightRef = useRef(false);
  const NO_MESSAGES_PLACEHOLDER_REGEX = /^no messages yet$/i;

  const clearReconcileTimers = () => {
    for (const timer of reconcileTimersRef.current) {
      window.clearTimeout(timer);
    }
    reconcileTimersRef.current = [];
  };

  const markTempMessagesClientAcked = (tempIds: string[]) => {
    if (tempIds.length === 0) return;

    setChatHistory((prev) => {
      let changed = false;
      const next = prev.map((message) => {
        if (!tempIds.includes(message.id) || !message.pending || message.clientAcked) {
          return message;
        }
        changed = true;
        return { ...message, clientAcked: true };
      });

      if (!changed) return prev;
      setCachedMessages(selectedUserId, next).catch((e) =>
        console.error("Cache update failed:", e),
      );
      return next;
    });
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
        await refreshConversationDetails();
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

  function applyLatestMessagePage(page: MessagePageResponse): void {
    setChatHistory((prev) => {
      const merged = mergeMessages(page.messages, prev);
      setCachedMessages(selectedUserId, merged).catch((e) =>
        console.error('Cache update failed:', e),
      );
      setCachedMessagePageMeta(selectedUserId, {
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        fetchedAt: Date.now(),
      }).catch((e) => console.error('Cache update failed:', e));
      hydrateSidebarPreviewFromMessages(merged).catch((e) =>
        console.error('Preview hydration failed:', e),
      );
      return merged;
    });

    nextCursorRef.current = page.nextCursor;
    setHasMoreMessages(page.hasMore);
    SESSION_VALIDATED_CONVERSATIONS.add(selectedUserId);
  }

  async function refreshLatestMessages(expectedGen?: number): Promise<void> {
    const page = await fetchMessagePage(INITIAL_PAGE_SIZE);
    if (
      typeof expectedGen === 'number' &&
      expectedGen !== fetchGenRef.current
    ) {
      return;
    }

    applyLatestMessagePage(page);
  }

  async function refreshConversationDetails(expectedGen?: number): Promise<void> {
    try {
      const details = await fetchConversationDetails();
      if (
        typeof expectedGen === 'number' &&
        expectedGen !== fetchGenRef.current
      ) {
        return;
      }

      setConversationDetails(details);
      setConversationDetailsSyncedAt(Date.now());
      if (details) {
        setCachedConversationDetails(selectedUserId, details).catch((e) =>
          console.error('Cache update failed:', e),
        );
      }
    } catch (error) {
      console.error('Error loading conversation details:', error);
    }
  }

  function revalidateConversationSnapshot(): void {
    if (document.visibilityState === 'hidden') return;
    if (revalidateInFlightRef.current) return;

    const expectedGen = fetchGenRef.current;
    revalidateInFlightRef.current = true;

    refreshLatestMessages(expectedGen)
      .then(() => refreshConversationDetails(expectedGen))
      .catch((error) => {
        console.error('Failed to refresh latest conversation data:', error);
      })
      .finally(() => {
        if (expectedGen === fetchGenRef.current) {
          revalidateInFlightRef.current = false;
        }
      });
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
    const hasCurrentPreview =
      Boolean(currentPreview) && !NO_MESSAGES_PLACEHOLDER_REGEX.test(currentPreview);
    const currentUpdatedAtMs = Date.parse(target?.updatedAt ?? user?.updatedAt ?? '');
    const previewUpdatedAtMs = Date.parse(previewUpdatedAt);

    if (hasCurrentPreview) {
      const canCompareUpdatedAt =
        Number.isFinite(currentUpdatedAtMs) && Number.isFinite(previewUpdatedAtMs);

      if (canCompareUpdatedAt && currentUpdatedAtMs >= previewUpdatedAtMs) {
        return;
      }

      if (!canCompareUpdatedAt && currentPreview === previewText) {
        return;
      }
    }

    applyConversationPreviewUpdate({
      conversationId: selectedUserId,
      lastMessage: previewText,
      time: previewTime,
      updatedAt: previewUpdatedAt,
    }).catch((e) => console.error('Preview sync failed:', e));

    updateConversationPreview(selectedUserId, previewText, previewTime, false, false, previewUpdatedAt).catch((err) =>
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

  const applyConversationSnapshot = (
    messages: Message[] | null,
    details: ConversationDetails | null,
    messageMeta:
      | {
          nextCursor: string | null;
          hasMore: boolean;
          fetchedAt: number;
        }
      | null,
  ): boolean => {
    const hasCachedMessages = Boolean(messages && messages.length > 0);
    setLoading(!hasCachedMessages);
    setLoadingOlder(false);
    setHasMoreMessages(messageMeta ? Boolean(messageMeta.hasMore) : true);
    nextCursorRef.current = messageMeta?.nextCursor ?? null;

    if (hasCachedMessages && messages) {
      setChatHistory(messages.slice(-INITIAL_PAGE_SIZE));
    } else {
      setChatHistory([]);
    }

    if (details) {
      setConversationDetails(details);
      setConversationDetailsSyncedAt(Date.now());
    } else {
      setConversationDetails(null);
      setConversationDetailsSyncedAt(0);
    }

    return hasCachedMessages;
  };

  // Load User
  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const hotCachedUsers = getHotCachedUsers();
        const hotFoundUser = hotCachedUsers?.find((u) => u.id === selectedUserId);
        if (hotFoundUser) {
          setUser(hotFoundUser);
        }

        const cachedUsers = await getCachedUsers();
        if (cancelled) return;
        const foundUser = cachedUsers?.find((u) => u.id === selectedUserId);
        if (foundUser) {
          setUser(foundUser);
          return;
        }

        if (hotFoundUser) return;
        const users = await getInboxUsers();
        if (cancelled) return;
        const target = users.find((u) => u.id === selectedUserId);
        if (target) setUser(target);
      } catch (err) {
        console.error('Error loading user:', err);
      }
    }
    loadUser();

    return () => {
      cancelled = true;
    };
  }, [selectedUserId]);

  // Load Messages
  useEffect(() => {
    const gen = ++fetchGenRef.current;

    async function loadMessages() {
      try {
        setInitialLoadSettled(false);
        clearReconcileTimers();

        const hotCachedMessages = getHotCachedMessages(selectedUserId);
        const hotCachedDetails = getHotCachedConversationDetails(selectedUserId);
        const hotCachedMessageMeta = getHotCachedMessagePageMeta(selectedUserId);
        applyConversationSnapshot(
          hotCachedMessages,
          hotCachedDetails,
          hotCachedMessageMeta,
        );

        const [cachedMessages, cachedDetails, cachedMessageMeta] = await Promise.all([
          getCachedMessages(selectedUserId),
          getCachedConversationDetails(selectedUserId),
          getCachedMessagePageMeta(selectedUserId),
        ]);
        if (gen !== fetchGenRef.current) return;

        const resolvedMessages = cachedMessages ?? hotCachedMessages;
        const resolvedDetails = cachedDetails ?? hotCachedDetails;
        const resolvedMessageMeta = cachedMessageMeta ?? hotCachedMessageMeta;
        const hasCachedMessages = applyConversationSnapshot(
          resolvedMessages,
          resolvedDetails,
          resolvedMessageMeta,
        );

        const hasSessionValidation = SESSION_VALIDATED_CONVERSATIONS.has(selectedUserId);
        const canSkipMessageFetch =
          hasCachedMessages &&
          Boolean(resolvedMessageMeta) &&
          Date.now() - (resolvedMessageMeta?.fetchedAt ?? 0) < PREFETCH_FRESH_MS &&
          hasSessionValidation;
        const shouldBlockForDetails = !resolvedDetails;
        const detailsRefreshPromise = refreshConversationDetails(gen);

        if (canSkipMessageFetch) {
          if (shouldBlockForDetails) {
            await detailsRefreshPromise;
            if (gen !== fetchGenRef.current) return;
          } else {
            detailsRefreshPromise.catch((error) => {
              console.error('Error loading conversation details:', error);
            });
          }
          setLoading(false);
          setInitialLoadSettled(true);
          return;
        }

        await refreshLatestMessages(gen);
        if (gen !== fetchGenRef.current) return;

        if (shouldBlockForDetails) {
          await detailsRefreshPromise;
          if (gen !== fetchGenRef.current) return;
        } else {
          detailsRefreshPromise.catch((error) => {
            console.error('Error loading conversation details:', error);
          });
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

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        revalidateConversationSnapshot();
      }
    };

    window.addEventListener('focus', revalidateConversationSnapshot);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', revalidateConversationSnapshot);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      revalidateInFlightRef.current = false;
    };
  }, [selectedUserId]);

  useEffect(() => {
    const sidebarRefreshHandler = (event: Event) => {
      const customEvent = event as CustomEvent<InboxConversationsRefreshedDetail>;
      const conversationIds = customEvent.detail?.conversationIds;
      if (!Array.isArray(conversationIds) || !conversationIds.includes(selectedUserId)) {
        return;
      }

      revalidateConversationSnapshot();
    };

    window.addEventListener(INBOX_CONVERSATIONS_REFRESHED_EVENT, sidebarRefreshHandler);
    return () => {
      window.removeEventListener(INBOX_CONVERSATIONS_REFRESHED_EVENT, sidebarRefreshHandler);
    };
  }, [selectedUserId]);

  const applyRealtimeMessageToChat = (eventType: 'new_message' | 'message_echo', data: SSEMessageData) => {
    const sameConversationId = data.conversationId === selectedUserId;
    const sameParticipant =
      Boolean(user?.recipientId) &&
      (data.senderId === user?.recipientId || data.recipientId === user?.recipientId);
    const sameAccount = !user?.accountId || !data.accountId || user.accountId === data.accountId;
    const isForThisConversation = sameConversationId || (sameParticipant && sameAccount);

    if (!isForThisConversation) return;

    const newMessage: Message = {
      ...mapRealtimePayloadToMessage(eventType, data),
      pending: false,
      clientAcked: undefined,
    };

    setChatHistory((prev) => {
      const queue = pendingTempIdsRef.current;
      const queueIdx = newMessage.fromMe
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
        const alreadyExists = prev.some((msg) => msg.id === newMessage.id);

        const updated = alreadyExists
          ? prev
              .filter((msg) => msg.id !== matchedTempId)
              .map((msg) => {
                if (msg.id !== newMessage.id) return msg;
                return {
                  ...msg,
                  pending: false,
                  clientAcked: undefined,
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
                clientAcked: undefined,
              };
            });

        setCachedMessages(selectedUserId, updated).catch(e => console.error('Cache update failed:', e));
        return updated;
      }

      if (prev.some((msg) => msg.id === newMessage.id)) {
        const updated = prev.map((msg) => {
          if (msg.id !== newMessage.id) return msg;
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

  useEffect(() => {
    const realtimeMessageHandler = (event: Event) => {
      const customEvent = event as CustomEvent<InboxRealtimeMessageDetail>;
      const detail = customEvent.detail;
      if (!detail?.data || !detail?.type) return;
      applyRealtimeMessageToChat(detail.type, detail.data);
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
        setCachedMessagePageMeta(selectedUserId, {
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          fetchedAt: Date.now(),
        }).catch((e) => console.error('Cache update failed:', e));
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
    const sendDate = new Date();
    const nowIso = sendDate.toISOString();
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
        timestamp: nowIso,
        attachmentUrl: currentPreview || undefined,
        pending: true,
        clientAcked: false,
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
        timestamp: nowIso,
        pending: true,
        clientAcked: false,
      });
    }

    setChatHistory((prev) => {
      const updated = [...prev, ...optimisticMessages];
      setCachedMessages(selectedUserId, updated).catch((e) =>
        console.error("Cache update failed:", e),
      );
      return updated;
    });
    pendingTempIdsRef.current.push(...tempIds);
    setMessageInput('');
    setAttachmentFile(null);
    setAttachmentPreview('');

    const previewTime = sendDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const previewText = messageText || (hasAttachment ? 'Image' : 'Message');
    const previewUpdatedAt = nowIso;
    applyConversationPreviewUpdate({
      conversationId: selectedUserId,
      lastMessage: previewText,
      time: previewTime,
      updatedAt: previewUpdatedAt,
      clearUnread: true,
    }).catch((err) => console.error('Failed to sync preview locally:', err));
    updateConversationPreview(selectedUserId, previewText, previewTime, false, true, previewUpdatedAt).catch(err => console.error('Failed to update preview:', err));

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

      markTempMessagesClientAcked(tempIds);

      const STUCK_PENDING_FALLBACK_MS = 15000;
      const timer = window.setTimeout(() => {
        const hasPending = tempIds.some((tempId) => pendingTempIdsRef.current.includes(tempId));
        if (!hasPending) return;

        fetchMessagePage(INITIAL_PAGE_SIZE)
          .then((page) => {
            const outgoing = page.messages.filter((message) => message.fromMe);
            if (outgoing.length === 0) return;

            setChatHistory((prev) => {
              let next = prev;
              const usedIds = new Set<string>();
              const matchWindowMs = 2 * 60 * 1000;

              const takeMatch = (temp: Message): Message | null => {
                const tempText = (temp.text || "").trim();
                const tempTs = Date.parse(temp.timestamp || "");
                const candidates = outgoing.filter((candidate) => {
                  if (usedIds.has(candidate.id)) return false;
                  if (candidate.type !== temp.type) return false;
                  if (temp.type === "text" && tempText) {
                    return (candidate.text || "").trim() === tempText;
                  }
                  const candidateTs = Date.parse(candidate.timestamp || "");
                  if (
                    Number.isFinite(tempTs) &&
                    Number.isFinite(candidateTs) &&
                    Math.abs(candidateTs - tempTs) > matchWindowMs
                  ) {
                    return false;
                  }
                  return true;
                });
                const match = candidates[candidates.length - 1];
                if (!match) return null;
                usedIds.add(match.id);
                return match;
              };

              for (const tempId of tempIds) {
                if (!pendingTempIdsRef.current.includes(tempId)) continue;
                const tempMsg = next.find((message) => message.id === tempId);
                if (!tempMsg?.pending) continue;

                const match = takeMatch(tempMsg);
                if (!match) continue;

                const alreadyExists = next.some((message) => message.id === match.id);
                const queueIndex = pendingTempIdsRef.current.indexOf(tempId);
                if (queueIndex !== -1) {
                  pendingTempIdsRef.current.splice(queueIndex, 1);
                }

                next = alreadyExists
                  ? next
                      .filter((message) => message.id !== tempId)
                      .map((message) => {
                        if (message.id !== match.id) return message;
                        return {
                          ...message,
                          ...match,
                          pending: false,
                          clientAcked: undefined,
                          type: match.type !== "text" ? match.type : message.type,
                          attachmentUrl: match.attachmentUrl || message.attachmentUrl,
                          duration: match.duration || message.duration,
                        };
                      })
                  : next.map((message) => {
                      if (message.id !== tempId) return message;
                      return {
                        ...match,
                        pending: false,
                        clientAcked: undefined,
                        type: match.type !== "text" ? match.type : message.type,
                        attachmentUrl: match.attachmentUrl || message.attachmentUrl,
                        duration: match.duration || message.duration,
                      };
                    });
              }

              if (next === prev) return prev;
              setCachedMessages(selectedUserId, next).catch((e) =>
                console.error("Cache update failed:", e),
              );
              return next;
            });
          })
          .catch((err) =>
            console.error("Failed stuck-pending reconcile fetch:", err),
          );
      }, STUCK_PENDING_FALLBACK_MS);
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

    const sendDate = new Date();
    const nowIso = sendDate.toISOString();
    const tempId = `temp_${Date.now()}_audio_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create optimistic message
    const optimisticMessage: Message = {
      id: tempId,
      clientTempId: tempId,
      fromMe: true,
      type: 'audio',
      timestamp: nowIso,
      attachmentUrl: URL.createObjectURL(blob),
      duration: formatDuration(duration),
      pending: true,
      clientAcked: false,
    };

    setChatHistory((prev) => {
      const updated = [...prev, optimisticMessage];
      setCachedMessages(selectedUserId, updated).catch((e) =>
        console.error("Cache update failed:", e),
      );
      return updated;
    });
    pendingTempIdsRef.current.push(tempId);

    // Update preview
    const audioPreviewTime = sendDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    applyConversationPreviewUpdate({
      conversationId: selectedUserId,
      lastMessage: 'You sent a voice message',
      time: audioPreviewTime,
      updatedAt: nowIso,
      clearUnread: true,
    }).catch((err) => console.error('Failed to sync preview locally:', err));
    updateConversationPreview(selectedUserId, 'You sent a voice message', audioPreviewTime, false, true, nowIso)
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
      markTempMessagesClientAcked([tempId]);
      
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
