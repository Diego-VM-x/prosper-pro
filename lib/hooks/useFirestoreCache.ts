'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Caché en memoria compartido a nivel de módulo.
 * Persiste durante toda la sesión del usuario en la pestaña.
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const globalCache = new Map<string, CacheEntry<unknown>>();

/**
 * Hook genérico para caché de datos Firestore.
 * - Primera carga: ejecuta fetchFn y guarda en caché.
 * - Navegación entre vistas: retorna datos de caché sin leer Firestore.
 * - staleMs: tiempo antes de considerar datos "viejos" (default: 5 min).
 * - forceRefresh: función para forzar re-lectura de Firestore.
 */
export function useFirestoreCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  staleMs: number = 5 * 60 * 1000, // 5 minutos
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const loadData = useCallback(async (force = false) => {
    const cached = globalCache.get(key) as CacheEntry<T> | undefined;
    const isFresh = cached && (Date.now() - cached.timestamp < staleMs);

    if (!force && cached && isFresh) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await fetchRef.current();
      globalCache.set(key, { data: result, timestamp: Date.now() });
      setData(result);
    } catch (err) {
      console.error(`useFirestoreCache error (${key}):`, err);
    } finally {
      setLoading(false);
    }
  }, [key, staleMs]);

  const forceRefresh = useCallback(() => {
    return loadData(true);
  }, [loadData]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  return { data, loading, forceRefresh };
}

/**
 * Invalidar una entrada de caché específica.
 */
export function invalidateCache(key: string) {
  globalCache.delete(key);
}

/**
 * Invalidar todas las entradas de caché.
 */
export function invalidateAllCache() {
  globalCache.clear();
}
