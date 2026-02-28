"use client";

export const APP_CACHE_DB_NAME = "setter_app_cache_db";
export const APP_CACHE_DB_VERSION = 1;

export const APP_CACHE_STORES = {
  inbox: "inbox_kv",
  leads: "leads_kv",
  tags: "tags_kv",
  setterAi: "setter_ai_kv",
} as const;

export type AppCacheStoreName =
  (typeof APP_CACHE_STORES)[keyof typeof APP_CACHE_STORES];

const LEGACY_CACHE_DATABASES = [
  "inbox_cache_db",
  "setter_ai_cache_db",
] as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function isClientEnvironment(): boolean {
  return typeof window !== "undefined";
}

function createOpenRequest(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(APP_CACHE_DB_NAME, APP_CACHE_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      for (const storeName of Object.values(APP_CACHE_STORES)) {
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName);
        }
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
      };
      resolve(database);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("[CacheDB] Failed to open IndexedDB."));
    };
  });
}

export async function openAppCacheDb(): Promise<IDBDatabase> {
  if (!isClientEnvironment()) {
    throw new Error("[CacheDB] IndexedDB is unavailable on the server.");
  }

  if (!dbPromise) {
    dbPromise = createOpenRequest();
  }

  return dbPromise;
}

function deleteDatabase(databaseName: string): Promise<void> {
  if (!isClientEnvironment()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(
        request.error ??
          new Error(`[CacheDB] Failed to delete database "${databaseName}".`),
      );
    request.onblocked = () => {
      console.warn(
        `[CacheDB] Delete blocked for "${databaseName}". Close other tabs to fully clear cache.`,
      );
      resolve();
    };
  });
}

export async function resetAppCacheDb(): Promise<void> {
  if (!isClientEnvironment()) return;

  if (dbPromise) {
    try {
      const database = await dbPromise;
      database.close();
    } catch {
      // Best-effort close only.
    } finally {
      dbPromise = null;
    }
  }

  await deleteDatabase(APP_CACHE_DB_NAME);
}

export async function deleteLegacyCacheDatabases(): Promise<void> {
  if (!isClientEnvironment()) return;
  await Promise.allSettled(
    LEGACY_CACHE_DATABASES.map((databaseName) => deleteDatabase(databaseName)),
  );
}
