/* Offline vault — IndexedDB `maddei-vault` (store `kv`) with a localStorage mirror. */

import { APP_ID } from './defaults';

const DB_NAME = 'maddei-vault';
const STORE = 'kv';
const DB_VERSION = 1;
const LS_MIRROR_LIMIT = 2 * 1024 * 1024; // 2 MB

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

export function vaultKey(key: string): string {
  return `${APP_ID}.vault.${key}`;
}

export async function vaultGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  if (!db) return lsGet<T>(key);
  const value = await new Promise<T | null>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return value ?? lsGet<T>(key);
}

export async function vaultSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch {
        resolve();
      }
    });
  }
  // mirror small payloads so a blocked/absent IndexedDB still works
  try {
    const json = JSON.stringify(value);
    if (json && json.length <= LS_MIRROR_LIMIT) window.localStorage.setItem(vaultKey(key), json);
  } catch {
    /* quota or blocked storage — IndexedDB remains the source of truth */
  }
}

export async function vaultDel(key: string): Promise<void> {
  const db = await openDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
  try {
    window.localStorage.removeItem(vaultKey(key));
  } catch {
    /* ignore */
  }
}

export function lsGet<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(vaultKey(key));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function lsSet(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(vaultKey(key), JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function lsGetRaw<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function lsSetRaw(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function isStorageAvailable(): boolean {
  try {
    const probe = '__maddei_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
