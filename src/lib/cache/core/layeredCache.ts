"use client";

import { BufferedWriter } from "@/lib/cache/core/bufferedWriter";
import { KeyedMutex } from "@/lib/cache/core/mutex";
import type { AppCacheStoreName } from "@/lib/cache/idb/appDb";
import {
  idbClearStore,
  idbDelete,
  idbGet,
  idbSetMany,
} from "@/lib/cache/idb/kvStore";
import type { CacheValue } from "@/lib/cache/types";

interface LayeredCacheOptions {
  storeName: AppCacheStoreName;
  logLabel: string;
  writeDebounceMs?: number;
}

interface LayeredCacheNamespace {
  clear: () => Promise<void>;
  flush: () => Promise<void>;
  resetForDatabaseReset: () => void;
}

const registeredCaches = new Set<LayeredCacheNamespace>();

function toError(error: Error | null | undefined): Error {
  return error ?? new Error("[Cache] IndexedDB operation failed.");
}

function isClientEnvironment(): boolean {
  return typeof window !== "undefined";
}

export interface LayeredCache {
  peek: <T extends CacheValue>(key: string) => T | undefined;
  get: <T extends CacheValue>(key: string) => Promise<T | null>;
  set: <T extends CacheValue>(key: string, value: T) => Promise<void>;
  update: <T extends CacheValue>(
    key: string,
    updater: (current: T | null) => T,
  ) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  flush: () => Promise<void>;
  resetForDatabaseReset: () => void;
}

export function createLayeredCache(options: LayeredCacheOptions): LayeredCache {
  const memory = new Map<string, CacheValue>();
  const writeMutex = new KeyedMutex();
  let idbDisabled = !isClientEnvironment();
  let idbFailureLogged = false;

  const logStorageDisabled = (error: Error) => {
    if (idbFailureLogged) return;
    idbFailureLogged = true;
    console.warn(
      `[${options.logLabel}] IndexedDB disabled for this session. Falling back to memory cache.`,
      error,
    );
  };

  const disableIdb = (error: Error) => {
    idbDisabled = true;
    logStorageDisabled(error);
  };

  const writer = new BufferedWriter<CacheValue>({
    debounceMs: options.writeDebounceMs ?? 50,
    persist: async (entries) => {
      if (idbDisabled || entries.length === 0) return;
      try {
        await idbSetMany(options.storeName, entries);
      } catch (error) {
        throw toError(error as Error | null | undefined);
      }
    },
  });

  const api: LayeredCache = {
    peek: <T extends CacheValue>(key: string): T | undefined => {
      if (!memory.has(key)) return undefined;
      return memory.get(key) as T;
    },

    get: async <T extends CacheValue>(key: string): Promise<T | null> => {
      const hotValue = api.peek<T>(key);
      if (hotValue !== undefined) return hotValue;

      if (idbDisabled) return null;

      try {
        const persisted = await idbGet<T>(options.storeName, key);
        if (persisted !== null) {
          memory.set(key, persisted);
        }
        return persisted;
      } catch (error) {
        disableIdb(toError(error as Error | null | undefined));
        return null;
      }
    },

    set: async <T extends CacheValue>(key: string, value: T): Promise<void> => {
      memory.set(key, value);
      if (idbDisabled) return;

      try {
        await writer.set(key, value);
      } catch (error) {
        disableIdb(toError(error as Error | null | undefined));
      }
    },

    update: async <T extends CacheValue>(
      key: string,
      updater: (current: T | null) => T,
    ): Promise<void> => {
      await writeMutex.runExclusive(key, async () => {
        const current = await api.get<T>(key);
        const next = updater(current);
        await api.set<T>(key, next);
      });
    },

    delete: async (key: string): Promise<void> => {
      await writeMutex.runExclusive(key, async () => {
        memory.delete(key);
        writer.dropPendingKey(key);
        if (idbDisabled) return;

        try {
          await idbDelete(options.storeName, key);
        } catch (error) {
          disableIdb(toError(error as Error | null | undefined));
        }
      });
    },

    clear: async (): Promise<void> => {
      memory.clear();
      writer.clearPending();
      if (idbDisabled) return;

      try {
        await idbClearStore(options.storeName);
      } catch (error) {
        disableIdb(toError(error as Error | null | undefined));
      }
    },

    flush: async (): Promise<void> => {
      if (idbDisabled) return;
      try {
        await writer.flushNow();
      } catch (error) {
        disableIdb(toError(error as Error | null | undefined));
      }
    },

    resetForDatabaseReset: () => {
      memory.clear();
      writer.clearPending();
      idbDisabled = !isClientEnvironment();
      idbFailureLogged = false;
    },
  };

  registeredCaches.add(api);
  return api;
}

export async function flushAllLayeredCaches(): Promise<void> {
  await Promise.allSettled(
    Array.from(registeredCaches).map((cache) => cache.flush()),
  );
}

export async function clearAllLayeredCaches(): Promise<void> {
  await Promise.allSettled(
    Array.from(registeredCaches).map((cache) => cache.clear()),
  );
}

export function prepareLayeredCachesForDatabaseReset(): void {
  for (const cache of registeredCaches) {
    cache.resetForDatabaseReset();
  }
}
