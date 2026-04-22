import { useEffect, useRef, useState } from "react";
import { subscribeWorkspaceEventSource } from "@/lib/realtime/workspaceEventSource";
import type { SSEEvent } from "@/types/inbox";

interface UseSSEOptions {
  onMessage?: (message: SSEEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
}

export function useSSE(url: string, options: UseSSEOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use refs to keep callbacks fresh without triggering re-connection
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const unsubscribe = subscribeWorkspaceEventSource(url, {
      onOpen: () => {
        setIsConnected(true);
        setError(null);
        optionsRef.current.onOpen?.();
      },
      onMessage: (message) => {
        optionsRef.current.onMessage?.(message);
      },
      onError: (event) => {
        setIsConnected(false);
        setError(new Error("SSE connection error"));
        optionsRef.current.onError?.(event);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [url]);

  return {
    isConnected,
    error,
    close: () => undefined,
  };
}
