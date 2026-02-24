import { NextRequest } from 'next/server';
import { EventEmitter } from 'events';
import { AccessError, requireInboxWorkspaceContext } from '@/lib/workspace';
import type { SSEEvent } from '@/types/inbox';

// Global event emitter for SSE broadcasts
export const sseEmitter = new EventEmitter();
sseEmitter.setMaxListeners(100); // Support up to 100 concurrent connections

interface WorkspaceScopedSseEvent {
  workspaceOwnerEmail: string;
  event: SSEEvent;
}

export function emitWorkspaceSseEvent(workspaceOwnerEmail: string, event: SSEEvent): void {
  sseEmitter.emit('message', { workspaceOwnerEmail, event } satisfies WorkspaceScopedSseEvent);
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let workspaceOwnerEmail = '';
  try {
    const context = await requireInboxWorkspaceContext();
    workspaceOwnerEmail = context.workspaceOwnerEmail;
  } catch (error) {
    if (error instanceof AccessError) {
      return new Response(JSON.stringify({ error: error.message }), { status: error.status });
    }
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`;
      controller.enqueue(encoder.encode(initialMessage));

      // Handler for new messages
      const messageHandler = (data: WorkspaceScopedSseEvent) => {
        if (data.workspaceOwnerEmail !== workspaceOwnerEmail) return;
        const message = `data: ${JSON.stringify(data.event)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // Register listener
      sseEmitter.on('message', messageHandler);

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 30000); // Every 30 seconds

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        sseEmitter.off('message', messageHandler);
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering for nginx
    },
  });
}
