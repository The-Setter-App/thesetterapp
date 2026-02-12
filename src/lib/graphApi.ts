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
  const baseUrl = `https://graph.facebook.com/${graphVersion}`;

  const url = new URL(`${baseUrl}/${pageId}/conversations`);
  // Reduced messages limit to 1 to prevent "reduce amount of data" errors
  url.searchParams.append('fields', 'id,updated_time,participants,messages.limit(1){from,to,message,created_time,id}');
  url.searchParams.append('platform', 'instagram');
  url.searchParams.append('limit', limit.toString());
  url.searchParams.append('access_token', accessToken);

  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[GraphAPI DEBUG] Raw error response: ${errorBody}`);
      const errorData: GraphApiError = JSON.parse(errorBody);
      throw new Error(`Graph API Error: ${errorData.error.message} (Code: ${errorData.error.code})`);
    }

    const data: RawGraphConversationsResponse = await response.json();
    console.log(`[GraphAPI] Fetched ${data.data.length} conversations`);
    
    return data;
  } catch (error) {
    console.error('[GraphAPI] Error fetching conversations:', error);
    throw error;
  }
}

/**
 * Fetch all messages for a specific conversation
 * @param conversationId - The conversation ID
 */
export async function fetchMessages(
  conversationId: string,
  accessToken: string,
  graphVersion: string = DEFAULT_GRAPH_VERSION
): Promise<RawGraphMessage[]> {
  const baseUrl = `https://graph.facebook.com/${graphVersion}`;

  const url = new URL(`${baseUrl}/${conversationId}`);
  url.searchParams.append('fields', 'messages{id,created_time,from,to,message,sticker,attachments{id,image_data,mime_type,name,size,video_data,file_url}}');
  url.searchParams.append('platform', 'instagram');
  url.searchParams.append('access_token', accessToken);

  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorData: GraphApiError = await response.json();
      throw new Error(`Graph API Error: ${errorData.error.message} (Code: ${errorData.error.code})`);
    }

    const data = await response.json();
    const messages = data.messages?.data || [];
    
    console.log(`[GraphAPI] Fetched ${messages.length} messages for conversation ${conversationId}`);
    
    return messages;
  } catch (error) {
    console.error(`[GraphAPI] Error fetching messages for ${conversationId}:`, error);
    throw error;
  }
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
  graphVersion: string = DEFAULT_GRAPH_VERSION
): Promise<void> {
  const baseUrl = `https://graph.facebook.com/${graphVersion}`;

  const url = new URL(`${baseUrl}/${pageId}/messages`);
  url.searchParams.append('platform', 'instagram');
  url.searchParams.append('access_token', accessToken);

  const payload = {
    recipient: { id: recipientId },
    message: { text },
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

    const result = await response.json();
    console.log(`[GraphAPI] Message sent successfully:`, result);
  } catch (error) {
    console.error('[GraphAPI] Error sending message:', error);
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
  const url = new URL(`${baseUrl}/${userId}`);
  url.searchParams.append('fields', 'profile_pic');
  url.searchParams.append('access_token', accessToken);

  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
        // We don't want to throw here, just return null as it's not critical
        console.warn(`[GraphAPI] Failed to fetch profile pic for ${userId}: ${response.status}`);
        return null;
    }

    const data = await response.json();
    return data.profile_pic || null;
  } catch (error) {
    console.error(`[GraphAPI] Error fetching profile pic for ${userId}:`, error);
    return null;
  }
}