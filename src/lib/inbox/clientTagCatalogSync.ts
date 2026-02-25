"use client";

import type { TagRow } from "@/types/tags";

export const INBOX_TAG_CATALOG_CHANGED_EVENT = "inboxTagCatalogChanged";

const INBOX_TAG_CATALOG_VERSION_KEY = "inbox_tag_catalog_version";

interface InboxTagCatalogChangedPayload {
  version: string;
  tags: TagRow[];
}

type CatalogChangedHandler = (tags: TagRow[] | null) => void;

function dispatchInboxTagCatalogChanged(tags: TagRow[]): void {
  window.dispatchEvent(
    new CustomEvent<TagRow[]>(INBOX_TAG_CATALOG_CHANGED_EVENT, {
      detail: tags,
    }),
  );
}

export function broadcastInboxTagCatalogChanged(tags: TagRow[]): void {
  if (typeof window === "undefined") return;

  dispatchInboxTagCatalogChanged(tags);

  try {
    const payload: InboxTagCatalogChangedPayload = {
      version: Date.now().toString(),
      tags,
    };
    localStorage.setItem(
      INBOX_TAG_CATALOG_VERSION_KEY,
      JSON.stringify(payload),
    );
  } catch (error) {
    console.error("[InboxTagCatalogSync] Failed to broadcast to other tabs:", error);
  }
}

export function subscribeInboxTagCatalogChanged(
  handler: CatalogChangedHandler,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const localHandler = (event: Event) => {
    const customEvent = event as CustomEvent<TagRow[]>;
    handler(Array.isArray(customEvent.detail) ? customEvent.detail : null);
  };
  const storageHandler = (event: StorageEvent) => {
    if (event.key !== INBOX_TAG_CATALOG_VERSION_KEY) return;
    if (!event.newValue) {
      handler(null);
      return;
    }
    try {
      const payload = JSON.parse(event.newValue) as InboxTagCatalogChangedPayload;
      handler(Array.isArray(payload.tags) ? payload.tags : null);
    } catch {
      handler(null);
    }
  };

  window.addEventListener(INBOX_TAG_CATALOG_CHANGED_EVENT, localHandler);
  window.addEventListener("storage", storageHandler);

  return () => {
    window.removeEventListener(INBOX_TAG_CATALOG_CHANGED_EVENT, localHandler);
    window.removeEventListener("storage", storageHandler);
  };
}
