"use client";

import { getInboxConnectionState, getInboxUsers } from "@/app/actions/inbox";
import {
  setCachedLeads,
  setCachedMessagePageMeta,
  setCachedMessages,
  setCachedUsers,
} from "@/lib/clientCache";
import { mapInboxUsersToLeadRows } from "@/lib/leads/mapInboxUserToLeadRow";
import type { MessagePageResponse, User } from "@/types/inbox";

const INTENT_KEY = "inbox_cache_warmup_intent_v1";
const STATUS_KEY = "inbox_cache_warmup_status_v1";
const MESSAGE_LIMIT = 20;
const FETCH_CONCURRENCY = 4;

export const INBOX_CACHE_WARMUP_STATUS_EVENT = "inboxCacheWarmupStatus";
export const INBOX_CACHE_WARMUP_REQUEST_EVENT = "inboxCacheWarmupRequested";

export type InboxCacheWarmupState = "idle" | "running" | "completed" | "failed";

export interface InboxCacheWarmupStatus {
  state: InboxCacheWarmupState;
  totalConversations: number;
  completedConversations: number;
  failedConversations: number;
  startedAt?: number;
  finishedAt?: number;
  lastError?: string;
}

let activeWarmupRun: Promise<void> | null = null;

function isClientEnvironment(): boolean {
  return typeof window !== "undefined";
}

function getDefaultStatus(): InboxCacheWarmupStatus {
  return {
    state: "idle",
    totalConversations: 0,
    completedConversations: 0,
    failedConversations: 0,
  };
}

function toStatus(
  value: Partial<InboxCacheWarmupStatus> | null,
): InboxCacheWarmupStatus {
  if (!value) return getDefaultStatus();
  return {
    state: value.state ?? "idle",
    totalConversations: value.totalConversations ?? 0,
    completedConversations: value.completedConversations ?? 0,
    failedConversations: value.failedConversations ?? 0,
    startedAt: value.startedAt,
    finishedAt: value.finishedAt,
    lastError: value.lastError,
  };
}

function getErrorMessage(error: Error | string | null | undefined): string {
  if (!error) return "Unknown warmup error";
  if (typeof error === "string") return error;
  return error.message || "Unknown warmup error";
}

function emitStatus(status: InboxCacheWarmupStatus): void {
  if (!isClientEnvironment()) return;
  window.dispatchEvent(
    new CustomEvent<InboxCacheWarmupStatus>(INBOX_CACHE_WARMUP_STATUS_EVENT, {
      detail: status,
    }),
  );
}

function writeStatus(status: InboxCacheWarmupStatus): void {
  if (!isClientEnvironment()) return;
  localStorage.setItem(STATUS_KEY, JSON.stringify(status));
  emitStatus(status);
}

function clearWarmupIntent(): void {
  if (!isClientEnvironment()) return;
  localStorage.removeItem(INTENT_KEY);
}

function setWarmupIntent(): void {
  if (!isClientEnvironment()) return;
  localStorage.setItem(INTENT_KEY, String(Date.now()));
}

export function hasInboxCacheWarmupIntent(): boolean {
  if (!isClientEnvironment()) return false;
  return Boolean(localStorage.getItem(INTENT_KEY));
}

export function readInboxCacheWarmupStatus(): InboxCacheWarmupStatus {
  if (!isClientEnvironment()) return getDefaultStatus();

  const raw = localStorage.getItem(STATUS_KEY);
  if (!raw) return getDefaultStatus();

  try {
    const parsed = JSON.parse(raw) as Partial<InboxCacheWarmupStatus>;
    return toStatus(parsed);
  } catch {
    return getDefaultStatus();
  }
}

export function requestInboxCacheWarmup(): void {
  if (!isClientEnvironment()) return;

  const current = readInboxCacheWarmupStatus();
  if (current.state !== "running") {
    writeStatus(getDefaultStatus());
  }

  setWarmupIntent();
  window.dispatchEvent(new CustomEvent(INBOX_CACHE_WARMUP_REQUEST_EVENT));
}

async function fetchRecentMessagesPage(
  conversationId: string,
): Promise<MessagePageResponse> {
  const response = await fetch(
    `/api/inbox/conversations/${encodeURIComponent(conversationId)}/messages?limit=${MESSAGE_LIMIT}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch messages for conversation ${conversationId}`,
    );
  }

  return (await response.json()) as MessagePageResponse;
}

async function syncConversationMessages(
  users: User[],
  onProgress: (completed: number, failed: number) => void,
): Promise<void> {
  if (users.length === 0) return;

  let index = 0;
  let completed = 0;
  let failed = 0;

  async function worker(): Promise<void> {
    while (index < users.length) {
      const nextIndex = index;
      index += 1;

      const user = users[nextIndex];
      try {
        const page = await fetchRecentMessagesPage(user.id);
        const messages = Array.isArray(page.messages) ? page.messages : [];
        await Promise.all([
          setCachedMessages(user.id, messages),
          setCachedMessagePageMeta(user.id, {
            nextCursor: page.nextCursor ?? null,
            hasMore: Boolean(page.hasMore),
            fetchedAt: Date.now(),
          }),
        ]);
      } catch {
        failed += 1;
      } finally {
        completed += 1;
        onProgress(completed, failed);
      }
    }
  }

  const workerCount = Math.min(FETCH_CONCURRENCY, users.length);
  const workers: Promise<void>[] = [];
  for (let i = 0; i < workerCount; i += 1) {
    workers.push(worker());
  }
  await Promise.all(workers);
}

export async function runInboxCacheWarmup(options?: {
  force?: boolean;
}): Promise<void> {
  if (!isClientEnvironment()) return;

  if (activeWarmupRun) {
    return activeWarmupRun;
  }

  const force = Boolean(options?.force);
  const current = readInboxCacheWarmupStatus();
  if (!force && !hasInboxCacheWarmupIntent() && current.state !== "running") {
    return;
  }

  activeWarmupRun = (async () => {
    const startTime = Date.now();
    writeStatus({
      state: "running",
      totalConversations: 0,
      completedConversations: 0,
      failedConversations: 0,
      startedAt: startTime,
      finishedAt: undefined,
      lastError: undefined,
    });

    try {
      const connection = await getInboxConnectionState();
      if (!connection.hasConnectedAccounts) {
        await setCachedLeads([]);
        writeStatus({
          state: "completed",
          totalConversations: 0,
          completedConversations: 0,
          failedConversations: 0,
          startedAt: startTime,
          finishedAt: Date.now(),
          lastError: undefined,
        });
        clearWarmupIntent();
        return;
      }

      const users = await getInboxUsers();
      await Promise.all([
        setCachedUsers(users),
        setCachedLeads(mapInboxUsersToLeadRows(users)),
      ]);

      writeStatus({
        state: "running",
        totalConversations: users.length,
        completedConversations: 0,
        failedConversations: 0,
        startedAt: startTime,
        finishedAt: undefined,
        lastError: undefined,
      });

      await syncConversationMessages(
        users,
        (completedConversations, failedConversations) => {
          writeStatus({
            state: "running",
            totalConversations: users.length,
            completedConversations,
            failedConversations,
            startedAt: startTime,
            finishedAt: undefined,
            lastError: undefined,
          });
        },
      );

      const terminalState: InboxCacheWarmupState =
        readInboxCacheWarmupStatus().failedConversations > 0
          ? "failed"
          : "completed";
      writeStatus({
        ...readInboxCacheWarmupStatus(),
        state: terminalState,
        finishedAt: Date.now(),
        lastError:
          terminalState === "failed"
            ? "Some conversations failed to sync."
            : undefined,
      });
      clearWarmupIntent();
    } catch (error) {
      const message = getErrorMessage(error instanceof Error ? error : null);
      writeStatus({
        ...readInboxCacheWarmupStatus(),
        state: "failed",
        finishedAt: Date.now(),
        lastError: message,
      });
      clearWarmupIntent();
    } finally {
      activeWarmupRun = null;
    }
  })();

  return activeWarmupRun;
}
