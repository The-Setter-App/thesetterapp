"use client";

import type { SSEEvent } from "@/types/inbox";

export type SyncDomain =
  | "users"
  | "messages"
  | "calendar"
  | "leads"
  | "dashboard";

export const SYNC_DOMAINS_INVALIDATED_EVENT = "syncDomainsInvalidated";

export interface SyncDomainsInvalidatedDetail {
  domains: SyncDomain[];
  source: "sse" | "cache";
  eventType?: SSEEvent["type"];
}

function uniqueDomains(domains: SyncDomain[]): SyncDomain[] {
  return Array.from(new Set(domains));
}

export function resolveInvalidatedDomainsForSseEvent(
  event: SSEEvent,
): SyncDomain[] {
  switch (event.type) {
    case "new_message":
    case "message_echo":
      return ["users", "messages", "leads", "dashboard"];
    case "messages_synced":
      return ["messages", "dashboard"];
    case "user_status_updated":
    case "conversation_priority_updated":
      return ["users", "leads", "dashboard"];
    case "calendly_call_updated":
      return ["calendar", "dashboard"];
    default:
      return [];
  }
}

export function emitSyncDomainsInvalidated(
  detail: SyncDomainsInvalidatedDetail,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<SyncDomainsInvalidatedDetail>(
      SYNC_DOMAINS_INVALIDATED_EVENT,
      {
        detail: {
          ...detail,
          domains: uniqueDomains(detail.domains),
        },
      },
    ),
  );
}

export function subscribeSyncDomainsInvalidated(
  listener: (detail: SyncDomainsInvalidatedDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<SyncDomainsInvalidatedDetail>;
    if (!customEvent.detail) return;
    listener(customEvent.detail);
  };

  window.addEventListener(SYNC_DOMAINS_INVALIDATED_EVENT, handler);
  return () => {
    window.removeEventListener(SYNC_DOMAINS_INVALIDATED_EVENT, handler);
  };
}

export function detailIncludesDomain(
  detail: SyncDomainsInvalidatedDetail,
  domain: SyncDomain,
): boolean {
  return detail.domains.includes(domain);
}
