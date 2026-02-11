/**
 * Webhook Event Broadcaster
 * Responsibility: Manage real-time message broadcasting to connected clients
 */

type MessageListener = (event: WebhookMessageEvent) => void;

export interface WebhookMessageEvent {
  type: 'new_message' | 'message_read' | 'message_delivery';
  conversationId: string;
  senderId: string;
  recipientId: string;
  timestamp: number;
  message?: {
    id: string;
    text?: string;
    attachments?: any[];
  };
}

class WebhookBroadcaster {
  private listeners: Set<MessageListener> = new Set();

  /**
   * Subscribe to webhook events
   */
  subscribe(listener: MessageListener): () => void {
    this.listeners.add(listener);
    console.log(`[Broadcaster] New subscriber added (total: ${this.listeners.size})`);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
      console.log(`[Broadcaster] Subscriber removed (total: ${this.listeners.size})`);
    };
  }

  /**
   * Broadcast event to all subscribers
   */
  broadcast(event: WebhookMessageEvent): void {
    console.log(`[Broadcaster] Broadcasting event to ${this.listeners.size} listeners:`, event.type);
    
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[Broadcaster] Error in listener:', error);
      }
    }
  }

  /**
   * Get current subscriber count
   */
  getSubscriberCount(): number {
    return this.listeners.size;
  }
}

// Singleton instance
export const webhookBroadcaster = new WebhookBroadcaster();