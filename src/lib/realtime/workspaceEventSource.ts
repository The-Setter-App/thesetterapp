"use client";

import type { SSEEvent } from "@/types/inbox";

interface WorkspaceSseListener {
  onMessage?: (message: SSEEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
}

interface WorkspaceSseEntry {
  eventSource: EventSource;
  listeners: Map<number, WorkspaceSseListener>;
}

const workspaceSseEntries = new Map<string, WorkspaceSseEntry>();
let nextListenerId = 1;

function closeEntry(url: string): void {
  const entry = workspaceSseEntries.get(url);
  if (!entry || entry.listeners.size > 0) return;
  entry.eventSource.close();
  workspaceSseEntries.delete(url);
}

function createEntry(url: string): WorkspaceSseEntry {
  const listeners = new Map<number, WorkspaceSseListener>();
  const eventSource = new EventSource(url);

  eventSource.onopen = () => {
    for (const listener of listeners.values()) {
      listener.onOpen?.();
    }
  };

  eventSource.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data) as SSEEvent;
      for (const listener of listeners.values()) {
        listener.onMessage?.(message);
      }
    } catch (error) {
      console.error("[WorkspaceEventSource] Failed to parse message:", error);
    }
  };

  eventSource.onerror = (error) => {
    for (const listener of listeners.values()) {
      listener.onError?.(error);
    }
  };

  return {
    eventSource,
    listeners,
  };
}

export function subscribeWorkspaceEventSource(
  url: string,
  listener: WorkspaceSseListener,
): () => void {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return () => undefined;
  }

  let entry = workspaceSseEntries.get(trimmedUrl);
  if (!entry) {
    entry = createEntry(trimmedUrl);
    workspaceSseEntries.set(trimmedUrl, entry);
  }

  const listenerId = nextListenerId++;
  entry.listeners.set(listenerId, listener);

  return () => {
    const current = workspaceSseEntries.get(trimmedUrl);
    if (!current) return;
    current.listeners.delete(listenerId);
    closeEntry(trimmedUrl);
  };
}
