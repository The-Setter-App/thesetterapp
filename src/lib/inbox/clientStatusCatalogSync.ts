"use client";

import type { TagRow } from "@/types/tags";

const BROADCAST_CHANNEL = "inbox-status-catalog";
export const INBOX_STATUS_CATALOG_CHANGED_EVENT = "inboxStatusCatalogChanged";

interface StatusCatalogMessage {
  source: string;
  statuses: TagRow[];
}

type CatalogChangedHandler = (statuses: TagRow[] | null) => void;

function dispatchInboxStatusCatalogChanged(statuses: TagRow[]): void {
  window.dispatchEvent(
    new CustomEvent<TagRow[]>(INBOX_STATUS_CATALOG_CHANGED_EVENT, {
      detail: statuses,
    }),
  );
}

export function broadcastInboxStatusCatalogChanged(statuses: TagRow[]): void {
  if (typeof window === "undefined") return;
  dispatchInboxStatusCatalogChanged(statuses);

  if (typeof BroadcastChannel === "undefined") return;

  const channel = new BroadcastChannel(BROADCAST_CHANNEL);
  channel.postMessage({
    source: window.location.pathname,
    statuses,
  } satisfies StatusCatalogMessage);
  channel.close();
}

export function subscribeInboxStatusCatalogChanged(
  handler: CatalogChangedHandler,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const eventHandler = (event: Event) => {
    const customEvent = event as CustomEvent<TagRow[]>;
    handler(Array.isArray(customEvent.detail) ? customEvent.detail : null);
  };

  window.addEventListener(INBOX_STATUS_CATALOG_CHANGED_EVENT, eventHandler);

  if (typeof BroadcastChannel === "undefined") {
    return () =>
      window.removeEventListener(INBOX_STATUS_CATALOG_CHANGED_EVENT, eventHandler);
  }

  const channel = new BroadcastChannel(BROADCAST_CHANNEL);
  channel.onmessage = (event: MessageEvent<StatusCatalogMessage>) => {
    const payload = event.data;
    if (!payload || !Array.isArray(payload.statuses)) {
      handler(null);
      return;
    }
    handler(payload.statuses);
  };

  return () => {
    window.removeEventListener(INBOX_STATUS_CATALOG_CHANGED_EVENT, eventHandler);
    channel.close();
  };
}
