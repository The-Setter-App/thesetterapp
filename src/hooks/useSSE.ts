import { useEffect, useRef, useState } from 'react';
import type { SSEEvent } from '@/types/inbox';

interface UseSSEOptions {
  onMessage?: (message: SSEEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
}

export function useSSE(url: string, options: UseSSEOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // Use refs to keep callbacks fresh without triggering re-connection
  const optionsRef = useRef(options);
  
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    // Create EventSource connection
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      optionsRef.current.onOpen?.();
    };

    eventSource.onmessage = (event) => {
      try {
        const message: SSEEvent = JSON.parse(event.data);
        optionsRef.current.onMessage?.(message);
      } catch (err) {
        console.error('[SSE] Failed to parse message:', err);
      }
    };

    eventSource.onerror = (event) => {
      setIsConnected(false);
      setError(new Error('SSE connection error'));
      optionsRef.current.onError?.(event);
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [url]);

  return {
    isConnected,
    error,
    close: () => eventSourceRef.current?.close(),
  };
}
