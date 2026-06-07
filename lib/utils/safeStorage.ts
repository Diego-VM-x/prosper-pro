/**
 * Safe storage wrapper with polyfill for private/incognito mode.
 * Falls back to in-memory storage when localStorage/sessionStorage
 * are unavailable (e.g. Safari private mode, sandboxed iframes).
 */

const memoryStore: Record<string, string> = {};

function createSafeStorage(
  store: Storage | undefined,
  name: string
): Storage {
  const isAvailable = (() => {
    if (typeof window === 'undefined') return false;
    try {
      const testKey = `__${name}_test__`;
      store!.setItem(testKey, '1');
      store!.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  })();

  if (isAvailable && store) {
    return store;
  }

  // In-memory fallback
  return {
    getItem(key: string): string | null {
      return memoryStore[key] ?? null;
    },
    setItem(key: string, value: string): void {
      memoryStore[key] = value;
    },
    removeItem(key: string): void {
      delete memoryStore[key];
    },
    clear(): void {
      Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
    },
    key(index: number): string | null {
      return Object.keys(memoryStore)[index] ?? null;
    },
    get length() {
      return Object.keys(memoryStore).length;
    },
  };
}

const safeLocalStorage = createSafeStorage(
  typeof window !== 'undefined' ? window.localStorage : undefined,
  'localStorage'
);

const safeSessionStorage = createSafeStorage(
  typeof window !== 'undefined' ? window.sessionStorage : undefined,
  'sessionStorage'
);

export { safeLocalStorage, safeSessionStorage };
