"use client";

import { type AppCacheStoreName, openAppCacheDb } from "@/lib/cache/idb/appDb";
import type { CacheValue } from "@/lib/cache/types";

function waitForRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("[CacheDB] IndexedDB request failed."));
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(
        transaction.error ??
          new Error("[CacheDB] IndexedDB transaction aborted."),
      );
    transaction.onerror = () =>
      reject(
        transaction.error ??
          new Error("[CacheDB] IndexedDB transaction failed."),
      );
  });
}

export async function idbGet<T extends CacheValue>(
  storeName: AppCacheStoreName,
  key: string,
): Promise<T | null> {
  const database = await openAppCacheDb();
  const transaction = database.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  const request = store.get(key);
  const result = await waitForRequest<CacheValue | undefined>(request);
  return (result ?? null) as T | null;
}

export async function idbSet<T extends CacheValue>(
  storeName: AppCacheStoreName,
  key: string,
  value: T,
): Promise<void> {
  const database = await openAppCacheDb();
  const transaction = database.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  store.put(value, key);
  await waitForTransaction(transaction);
}

export async function idbSetMany<T extends CacheValue>(
  storeName: AppCacheStoreName,
  entries: ReadonlyArray<readonly [string, T]>,
): Promise<void> {
  if (entries.length === 0) return;

  const database = await openAppCacheDb();
  const transaction = database.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  for (const [key, value] of entries) {
    store.put(value, key);
  }
  await waitForTransaction(transaction);
}

export async function idbDelete(
  storeName: AppCacheStoreName,
  key: string,
): Promise<void> {
  const database = await openAppCacheDb();
  const transaction = database.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  store.delete(key);
  await waitForTransaction(transaction);
}

export async function idbClearStore(
  storeName: AppCacheStoreName,
): Promise<void> {
  const database = await openAppCacheDb();
  const transaction = database.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  store.clear();
  await waitForTransaction(transaction);
}
