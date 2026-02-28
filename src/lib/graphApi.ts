import type { RawGraphConversationsResponse, RawGraphMessage } from '@/types/inbox';

/**
 * Facebook Graph API Service
 * Responsibility: Direct HTTP communication with Facebook Graph API
 * Architecture: Pure functions relying on dependency injection for credentials
 */

interface GraphApiError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

const DEFAULT_GRAPH_VERSION = 'v24.0';
const DEFAULT_MESSAGE_TAG = 'HUMAN_AGENT';
const GRAPH_MIN_CHUNK = 5;
const GRAPH_MIN_CONVERSATION_CHUNK = 5;
const GRAPH_CODE_REDUCE_PAYLOAD = 1;
const GRAPH_DEBUG = process.env.GRAPH_API_DEBUG === 'true';

type OutboundMessageTag = 'HUMAN_AGENT';

type SendMessageOptions = {
  tag?: OutboundMessageTag;
};

function debugLog(...args: unknown[]) {
  if (GRAPH_DEBUG) {
    console.log(...args);
  }
}

type GraphPaging = {
  cursors?: {
    before?: string;
    after?: string;
  };
  next?: string;
  previous?: string;
};

type RawGraphConversationPageItem = {
  id: string;
  name?: string;
  updated_time?: string;
  participants?: {
    data: Array<{
      id: string;
      username?: string;
      email?: string;
    }>;
  };
  messages?: {
    data: RawGraphMessage[];
  };
};

type RawGraphMessagesChunkResponse = {
  data: RawGraphMessage[];
  paging?: GraphPaging;
};

type RawGraphConversationsPageResponse = {
  data: RawGraphConversationPageItem[];
  paging?: GraphPaging;
};

function parseGraphApiError(errorBody: string): string {
  try {
    const errorData = JSON.parse(errorBody) as GraphApiError;
    return `Graph API Error: ${errorData.error.message} (Code: ${errorData.error.code})`;
  } catch {
    return `Graph API Error: ${errorBody}`;
  }
}

function parseGraphApiErrorData(errorBody: string): GraphApiError | null {
  try {
    return JSON.parse(errorBody) as GraphApiError;
  } catch {
    return null;
  }
}

export async function fetchConversationsPage(
  pageId: string,
  accessToken: string,
  options?: {
    limit?: number;
    after?: string;
    fields?: string;
    graphVersion?: string;
  }
): Promise<RawGraphConversationsPageResponse> {
  const limit = options?.limit ?? 50;
  const fields = options?.fields ?? 'id,name';
  const graphVersion = options?.graphVersion ?? DEFAULT_GRAPH_VERSION;
  const after = options?.after;
  const baseUrl = `https://graph.facebook.com/${graphVersion}`;
  let conversationLimit = Math.max(1, limit);

  while (true) {
    const url = new URL(`${baseUrl}/${pageId}/conversations`);
    url.searchParams.append('fields', fields);
    url.searchParams.append('platform', 'instagram');
    url.searchParams.append('limit', String(conversationLimit));
    if (after) {
      url.searchParams.append('after', after);
    }
    url.searchParams.append('access_token', accessToken);

    const response = await fetch(url.toString());
    if (response.ok) {
      const data: RawGraphConversationsPageResponse = await response.json();
      return data;
    }

    const errorBody = await response.text();
    const errorData = parseGraphApiErrorData(errorBody);
    const errorCode = errorData?.error?.code;
    if (errorCode === GRAPH_CODE_REDUCE_PAYLOAD && conversationLimit > GRAPH_MIN_CONVERSATION_CHUNK) {
      conversationLimit = Math.max(GRAPH_MIN_CONVERSATION_CHUNK, Math.floor(conversationLimit / 2));
      await new Promise((resolve) => setTimeout(resolve, 200));
      continue;
    }

    debugLog(`[GraphAPI DEBUG] Raw error response: ${errorBody}`);
    throw new Error(parseGraphApiError(errorBody));
  }

  throw new Error('Graph API Error: Failed to fetch conversations');
}

/**
 * Fetch all conversations for the configured page
 * Uses Page ID as the root node with platform=instagram
 */
export async function fetchConversations(
  pageId: string, 
  accessToken: string,
  limit: number = 50,
  graphVersion: string = DEFAULT_GRAPH_VERSION
): Promise<RawGraphConversationsResponse> {
  try {
    const data = await fetchConversationsPage(pageId, accessToken, {
      limit,
      fields: 'id,updated_time,participants,messages.limit(1){from,to,message,created_time,id}',
      graphVersion,
    });
    debugLog(`[GraphAPI] Fetched ${data.data.length} conversations`);

    return data as RawGraphConversationsResponse;
  } catch (error) {
    console.error('[GraphAPI] Error fetching conversations:', error);
    throw error;
  }
}

/**
 * Fetch conversations across all available pages for this Page node using `after` cursor pagination.
 * `maxPages` caps API calls to avoid runaway sync jobs.
 */
export async function fetchAllConversations(
  pageId: string,
  accessToken: string,
  options?: {
    pageLimit?: number;
    maxPages?: number;
    graphVersion?: string;
  }
): Promise<RawGraphConversationsResponse> {
  const pageLimit = options?.pageLimit ?? 25;
  const maxPages = options?.maxPages ?? 20;
  const graphVersion = options?.graphVersion ?? DEFAULT_GRAPH_VERSION;
  const fields = 'id,updated_time,participants,messages.limit(1){from,to,message,created_time,id}';

  const conversations: RawGraphConversationsResponse['data'] = [];
  let after: string | undefined;
  let pageCount = 0;

  while (pageCount < maxPages) {
    const chunk = await fetchConversationsPage(pageId, accessToken, {
      limit: pageLimit,
      after,
      fields,
      graphVersion,
    });
    conversations.push(...(chunk.data as RawGraphConversationsResponse['data']));
    pageCount += 1;

    const nextAfter = chunk.paging?.cursors?.after;
    if (!nextAfter) break;
    after = nextAfter;
  }

  debugLog(`[GraphAPI] Fetched ${conversations.length} conversations across ${pageCount} page(s) for page ${pageId}`);

  return { data: conversations };
}

/**
 * Fetch all messages for a specific conversation
 * @param conversationId - The conversation ID
 */
export async function fetchMessages(
  conversationId: string,
  accessToken: string,
  limit: number = 25,
  graphVersion: string = DEFAULT_GRAPH_VERSION
): Promise<RawGraphMessage[]> {
  const chunk = await fetchMessagesChunk(conversationId, accessToken, limit, undefined, graphVersion);
  return chunk.messages;
}

export async function fetchMessagesChunk(
  conversationId: string,
  accessToken: string,
  limit: number = 20,
  before?: string,
  graphVersion: string = DEFAULT_GRAPH_VERSION
): Promise<{ messages: RawGraphMessage[]; nextBeforeCursor: string | null }> {
  const baseUrl = `https://graph.facebook.com/${graphVersion}`;
  const targetLimit = Math.max(1, limit);
  let chunkLimit = targetLimit;

  while (chunkLimit >= GRAPH_MIN_CHUNK) {
    const url = new URL(`${baseUrl}/${conversationId}/messages`);
    url.searchParams.append('fields', 'id,created_time,from,to,message,sticker,attachments{id,image_data,mime_type,name,size,video_data,file_url}');
    url.searchParams.append('platform', 'instagram');
    url.searchParams.append('limit', chunkLimit.toString());
    if (before) {
      url.searchParams.append('before', before);
    }
    url.searchParams.append('access_token', accessToken);

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: GraphApiError | null = null;
        try {
          errorData = JSON.parse(errorText) as GraphApiError;
        } catch {
          errorData = null;
        }

        const errorCode = errorData?.error?.code;
        if (errorCode === 1 && chunkLimit > GRAPH_MIN_CHUNK) {
          chunkLimit = Math.max(GRAPH_MIN_CHUNK, Math.floor(chunkLimit / 2));
          await new Promise((resolve) => setTimeout(resolve, 200));
          continue;
        }

        if (errorData) {
          throw new Error(`Graph API Error: ${errorData.error.message} (Code: ${errorData.error.code})`);
        }
        throw new Error(`Graph API Error: ${errorText}`);
      }

      const data: RawGraphMessagesChunkResponse = await response.json();
      const messages = data.data || [];
      const nextBeforeCursor = data.paging?.cursors?.before || null;

      debugLog(`[GraphAPI] Fetched ${messages.length} messages for conversation ${conversationId}`);

      return { messages, nextBeforeCursor };
    } catch (error) {
      console.error(`[GraphAPI] Error fetching messages for ${conversationId}:`, error);
      throw error;
    }
  }

  return { messages: [], nextBeforeCursor: null };
}

/**
 * Send a text message to a recipient
 * @param pageId - The Facebook Page ID linked to the Instagram account
 * @param recipientId - The user ID to receive the message
 * @param text - Message text content
 */
export async function sendMessage(
  pageId: string,
  recipientId: string, 
  text: string,
  accessToken: string,
  graphVersion: string = DEFAULT_GRAPH_VERSION,
  options?: SendMessageOptions
): Promise<void> {
  const baseUrl = `https://graph.facebook.com/${graphVersion}`;
  const tag = options?.tag ?? DEFAULT_MESSAGE_TAG;

  const url = new URL(`${baseUrl}/${pageId}/messages`);
  url.searchParams.append('platform', 'instagram');
  url.searchParams.append('access_token', accessToken);

  const payload = {
    recipient: { id: recipientId },
    message: { text },
    tag,
  };

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData: GraphApiError = await response.json();
      throw new Error(`Graph API Error: ${errorData.error.message} (Code: ${errorData.error.code})`);
    }

    await response.json();
  } catch (error) {
    console.error('[GraphAPI] Error sending message:', error);
    throw error;
  }
}

/**
 * Send an attachment message by uploading the file binary directly to the Graph API.
 * Uses multipart/form-data with the `filedata` field so no external file hosting is needed.
 * Facebook will host the file and generate its own CDN URL.
 */
export async function sendAttachmentMessage(
  pageId: string,
  recipientId: string,
  file: File,
  attachmentType: 'image' | 'audio' | 'video' | 'file',
  accessToken: string,
  graphVersion: string = DEFAULT_GRAPH_VERSION,
  options?: SendMessageOptions
): Promise<void> {
  const baseUrl = `https://graph.facebook.com/${graphVersion}`;
  const tag = options?.tag ?? DEFAULT_MESSAGE_TAG;

  const url = new URL(`${baseUrl}/${pageId}/messages`);
  url.searchParams.append('platform', 'instagram');
  url.searchParams.append('access_token', accessToken);

  const recipient = JSON.stringify({ id: recipientId });
  const message = JSON.stringify({
    attachment: {
      type: attachmentType,
      payload: {
        is_reusable: true,
      },
    },
  });

  const formData = new FormData();
  formData.append('recipient', recipient);
  formData.append('message', message);
  formData.append('tag', tag);
  formData.append('filedata', file, file.name);

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData: GraphApiError = await response.json();
      throw new Error(`Graph API Error: ${errorData.error.message} (Code: ${errorData.error.code})`);
    }

    await response.json();
  } catch (error) {
    console.error('[GraphAPI] Error sending attachment:', error);
    throw error;
  }
}

/**
 * Fetch the profile picture of a user
 * @param userId - The user ID
 */
export async function fetchUserProfile(
  userId: string,
  accessToken: string,
  graphVersion: string = DEFAULT_GRAPH_VERSION
): Promise<string | null> {
  const baseUrl = `https://graph.facebook.com/${graphVersion}`;
  const primaryUrl = new URL(`${baseUrl}/${userId}`);
  primaryUrl.searchParams.append('fields', 'profile_pic,name,username');
  primaryUrl.searchParams.append('access_token', accessToken);

  try {
    const response = await fetch(primaryUrl.toString());

    if (!response.ok) {
      // Fallback to minimal field set if the node rejects expanded fields.
      const fallbackUrl = new URL(`${baseUrl}/${userId}`);
      fallbackUrl.searchParams.append('fields', 'profile_pic');
      fallbackUrl.searchParams.append('access_token', accessToken);
      const fallbackRes = await fetch(fallbackUrl.toString());
      if (!fallbackRes.ok) {
        console.warn(`[GraphAPI] Failed to fetch profile pic for ${userId}: ${fallbackRes.status}`);
        return null;
      }
      const fallbackData = await fallbackRes.json();
      return fallbackData.profile_pic || null;
    }

    const data = await response.json();
    return data.profile_pic || null;
  } catch (error) {
    console.error(`[GraphAPI] Error fetching profile pic for ${userId}:`, error);
    return null;
  }
}
