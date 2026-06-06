/**
 * Safe wrappers for localStorage / sessionStorage.
 * Handles private mode, storage disabled, and quota exceeded errors gracefully.
 */

const isBrowser = typeof window !== 'undefined';

function safeGet(storage: Storage | undefined, key: string): string | null {
  if (!isBrowser || !storage) return null;
  try { return storage.getItem(key); } catch { return null; }
}

function safeSet(storage: Storage | undefined, key: string, value: string): boolean {
  if (!isBrowser || !storage) return false;
  try { storage.setItem(key, value); return true; } catch { return false; }
}

function safeRemove(storage: Storage | undefined, key: string): boolean {
  if (!isBrowser || !storage) return false;
  try { storage.removeItem(key); return true; } catch { return false; }
}

export const safeLocalStorage = {
  getItem: (key: string) => safeGet(isBrowser ? localStorage : undefined, key),
  setItem: (key: string, value: string) => safeSet(isBrowser ? localStorage : undefined, key, value),
  removeItem: (key: string) => safeRemove(isBrowser ? localStorage : undefined, key),
};

export const safeSessionStorage = {
  getItem: (key: string) => safeGet(isBrowser ? sessionStorage : undefined, key),
  setItem: (key: string, value: string) => safeSet(isBrowser ? sessionStorage : undefined, key, value),
  removeItem: (key: string) => safeRemove(isBrowser ? sessionStorage : undefined, key),
};
