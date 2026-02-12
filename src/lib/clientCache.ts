'use client';

/**
 * Client-Side Cache Helper (IndexedDB)
 * Responsibility: Provide async access to cached data using IndexedDB
 * Why: localStorage is synchronous and blocks the main thread. IndexedDB is async and handles larger data.
 */

import type { User, Message } from '@/types/inbox';

const DB_NAME = 'inbox_cache_db';
const DB_VERSION = 1;
const STORE_NAME = 'key_value_store';

class InboxCache {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('IndexedDB not available server-side'));
    }

    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => resolve((request.result as T) || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`[InboxCache] Error getting key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`[InboxCache] Error setting key ${key}:`, error);
    }
  }
  
  async update<T>(key: string, updater: (current: T | null) => T): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        
        request.onsuccess = () => {
             const current = request.result as T;
             const newValue = updater(current);
             const putRequest = store.put(newValue, key);
             putRequest.onsuccess = () => resolve();
             putRequest.onerror = () => reject(putRequest.error);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
       console.error(`[InboxCache] Error updating key ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
     try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
       console.error(`[InboxCache] Error clearing cache:`, error);
    }
  }

  async reset(): Promise<void> {
    try {
      // Close any open connection first
      if (this.dbPromise) {
        const db = await this.dbPromise;
        db.close();
        this.dbPromise = null;
      }
      
      return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => {
          console.warn('[InboxCache] Delete database blocked by another tab');
          resolve(); // Don't hang the app
        };
      });
    } catch (error) {
      console.error('[InboxCache] Error resetting cache:', error);
    }
  }
}

const inboxCache = new InboxCache();

export async function getCachedUsers(): Promise<User[] | null> {
  return inboxCache.get<User[]>('users');
}

export async function setCachedUsers(users: User[]): Promise<void> {
  return inboxCache.set('users', users);
}

export async function getCachedMessages(recipientId: string): Promise<Message[] | null> {
  return inboxCache.get<Message[]>(`messages_${recipientId}`);
}

export async function setCachedMessages(recipientId: string, messages: Message[]): Promise<void> {
  return inboxCache.set(`messages_${recipientId}`, messages);
}

export async function updateCachedMessages(recipientId: string, updater: (msgs: Message[] | null) => Message[]): Promise<void> {
  return inboxCache.update<Message[]>(`messages_${recipientId}`, updater);
}

export async function clearCache(): Promise<void> {
  return inboxCache.clear();
}

export async function resetCache(): Promise<void> {
  return inboxCache.reset();
}