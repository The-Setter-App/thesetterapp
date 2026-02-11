import type { RawGraphConversationsResponse, RawGraphMessage } from '@/types/inbox';

/**
 * Facebook Graph API Service
 * Responsibility: Direct HTTP communication with Facebook Graph API
 */

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const FB_GRAPH_VERSION = process.env.FB_GRAPH_VERSION || 'v24.0';
const BASE_URL = `https://graph.facebook.com/${FB_GRAPH_VERSION}`;

interface GraphApiError {
  error: {
    message: string;
    type: string;
    code: number;
  };
}

/**
 * Fetch all conversations for the configured page
 */
export async function fetchConversations(): Promise<RawGraphConversationsResponse> {
  if (!FB_ACCESS_TOKEN || !FB_PAGE_ID) {
    throw new Error('Missing Facebook API credentials. Check your .env.local file.');
  }

  const url = new URL(`${BASE_URL}/${FB_PAGE_ID}/conversations`);
  url.searchParams.append('fields', 'id,updated_time,participants,messages.limit(3){from,to,message,created_time,id}');
  url.searchParams.append('platform', 'instagram');
  url.searchParams.append('access_token', FB_ACCESS_TOKEN);

  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorData: GraphApiError = await response.json();
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
export async function fetchMessages(conversationId: string): Promise<RawGraphMessage[]> {
  if (!FB_ACCESS_TOKEN) {
    throw new Error('Missing Facebook API credentials. Check your .env.local file.');
  }

  const url = new URL(`${BASE_URL}/${conversationId}`);
  url.searchParams.append('fields', 'messages{id,created_time,from,to,message,sticker,attachments{id,image_data,mime_type,name,size,video_data,file_url}}');
  url.searchParams.append('platform', 'instagram');
  url.searchParams.append('access_token', FB_ACCESS_TOKEN);

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
 * @param recipientId - Instagram user ID (IGSID)
 * @param text - Message text content
 */
export async function sendMessage(recipientId: string, text: string): Promise<void> {
  if (!FB_ACCESS_TOKEN || !FB_PAGE_ID) {
    throw new Error('Missing Facebook API credentials. Check your .env.local file.');
  }

  const url = new URL(`${BASE_URL}/${FB_PAGE_ID}/messages`);
  url.searchParams.append('access_token', FB_ACCESS_TOKEN);

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