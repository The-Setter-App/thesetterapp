import { EventEmitter } from "events";
import type { SSEEvent } from "@/types/inbox";

export interface WorkspaceScopedSseEvent {
  workspaceOwnerEmail: string;
  event: SSEEvent;
}

const SSE_BUS_EVENT = "message";
const GLOBAL_SSE_BUS_KEY = "__setterapp_inbox_sse_bus__";

function getSseBus(): EventEmitter {
  const globalWithBus = globalThis as typeof globalThis & {
    [GLOBAL_SSE_BUS_KEY]?: EventEmitter;
  };
  const existing = globalWithBus[GLOBAL_SSE_BUS_KEY];
  if (existing) return existing;

  const created = new EventEmitter();
  created.setMaxListeners(250);
  globalWithBus[GLOBAL_SSE_BUS_KEY] = created;
  return created;
}

export function emitWorkspaceSseEvent(
  workspaceOwnerEmail: string,
  event: SSEEvent,
): void {
  getSseBus().emit(SSE_BUS_EVENT, { workspaceOwnerEmail, event } satisfies WorkspaceScopedSseEvent);
}

export function onWorkspaceSseEvent(
  handler: (payload: WorkspaceScopedSseEvent) => void,
): () => void {
  const bus = getSseBus();
  bus.on(SSE_BUS_EVENT, handler);
  return () => {
    bus.off(SSE_BUS_EVENT, handler);
  };
}
