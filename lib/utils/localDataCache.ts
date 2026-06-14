/**
 * Caché local de datos de Firestore/APIs.
 * Usa safeLocalStorage como mecanismo por defecto para no depender de
 * plugins extra en Capacitor. Si un día se necesita más capacidad se puede
 * migrar a IndexedDB o @capacitor/preferences sin cambiar la interfaz.
 */

import { safeLocalStorage } from './safeStorage';

const CACHE_PREFIX = 'prosper_data_cache_';

interface CachedEntry<T> {
  data: T;
  updatedAt: number;
}

export function getLocalCache<T>(key: string): T | null {
  try {
    const raw = safeLocalStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry<T>;
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

export function setLocalCache<T>(key: string, data: T): void {
  try {
    const entry: CachedEntry<T> = { data, updatedAt: Date.now() };
    safeLocalStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    console.warn('[localDataCache] failed to save', key, e);
  }
}

export function clearLocalCache(key?: string): void {
  try {
    if (key) {
      safeLocalStorage.removeItem(CACHE_PREFIX + key);
      return;
    }
    for (let i = safeLocalStorage.length - 1; i >= 0; i--) {
      const k = safeLocalStorage.key(i);
      if (k?.startsWith(CACHE_PREFIX)) {
        safeLocalStorage.removeItem(k);
      }
    }
  } catch {
    // ignore
  }
}
