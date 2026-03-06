"use client";

type PendingWaiter = {
  resolve: () => void;
  reject: (error: Error) => void;
};

interface BufferedWriterOptions<T> {
  debounceMs: number;
  persist: (entries: ReadonlyArray<readonly [string, T]>) => Promise<void>;
}

interface FlushableWriter {
  flushNow: () => Promise<void>;
}

const registeredWriters = new Set<FlushableWriter>();
let lifecycleListenersBound = false;

function toError(error: Error | null | undefined): Error {
  return error ?? new Error("[Cache] Buffered write failed.");
}

async function flushAllWriters(): Promise<void> {
  const writers = Array.from(registeredWriters.values());
  await Promise.allSettled(writers.map((writer) => writer.flushNow()));
}

function ensureLifecycleFlushHooks(): void {
  if (lifecycleListenersBound) return;
  if (typeof window === "undefined") return;

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      void flushAllWriters();
    }
  };

  window.addEventListener("pagehide", () => {
    void flushAllWriters();
  });
  document.addEventListener("visibilitychange", onVisibilityChange);
  lifecycleListenersBound = true;
}

export class BufferedWriter<T> implements FlushableWriter {
  private readonly pendingEntries = new Map<string, T>();
  private readonly pendingWaiters = new Map<string, PendingWaiter[]>();
  private timerId: number | null = null;
  private flushInFlight: Promise<void> | null = null;
  private readonly debounceMs: number;
  private readonly persist: BufferedWriterOptions<T>["persist"];

  constructor(options: BufferedWriterOptions<T>) {
    this.debounceMs = Math.max(0, options.debounceMs);
    this.persist = options.persist;

    registeredWriters.add(this);
    ensureLifecycleFlushHooks();
  }

  set(key: string, value: T): Promise<void> {
    this.pendingEntries.set(key, value);
    const waiterPromise = new Promise<void>((resolve, reject) => {
      const waiters = this.pendingWaiters.get(key) ?? [];
      waiters.push({ resolve, reject });
      this.pendingWaiters.set(key, waiters);
    });

    this.scheduleFlush();
    return waiterPromise;
  }

  dropPendingKey(key: string): void {
    this.pendingEntries.delete(key);
    const waiters = this.pendingWaiters.get(key);
    if (!waiters) return;
    this.pendingWaiters.delete(key);
    for (const waiter of waiters) {
      waiter.resolve();
    }
  }

  clearPending(): void {
    this.pendingEntries.clear();
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }

    const keys = Array.from(this.pendingWaiters.keys());
    for (const key of keys) {
      this.dropPendingKey(key);
    }
  }

  private scheduleFlush(): void {
    if (this.timerId !== null) return;

    this.timerId = window.setTimeout(() => {
      this.timerId = null;
      void this.flushNow();
    }, this.debounceMs);
  }

  async flushNow(): Promise<void> {
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }

    if (this.flushInFlight) {
      await this.flushInFlight;
      if (this.pendingEntries.size > 0) {
        return this.flushNow();
      }
      return;
    }

    if (this.pendingEntries.size === 0) return;

    const entries = Array.from(this.pendingEntries.entries());
    this.pendingEntries.clear();

    const waitersByKey = new Map<string, PendingWaiter[]>();
    for (const [key] of entries) {
      const waiters = this.pendingWaiters.get(key) ?? [];
      this.pendingWaiters.delete(key);
      waitersByKey.set(key, waiters);
    }

    this.flushInFlight = this.persist(entries)
      .then(() => {
        for (const waiters of waitersByKey.values()) {
          for (const waiter of waiters) {
            waiter.resolve();
          }
        }
      })
      .catch((error: Error | null | undefined) => {
        const normalized = toError(error);
        for (const waiters of waitersByKey.values()) {
          for (const waiter of waiters) {
            waiter.reject(normalized);
          }
        }
        throw normalized;
      })
      .finally(() => {
        this.flushInFlight = null;
      });

    await this.flushInFlight;

    if (this.pendingEntries.size > 0) {
      await this.flushNow();
    }
  }
}
