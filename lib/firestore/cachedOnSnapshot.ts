import type { Query, DocumentReference, QuerySnapshot, DocumentSnapshot } from 'firebase/firestore';
import { onSnapshot, getDocs } from '../firebase';
import { getLocalCache, setLocalCache } from '@/lib/utils/localDataCache';

function isEmptyData<T>(data: T): boolean {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object') return Object.keys(data).length === 0;
  return false;
}

/**
 * Decide whether to overwrite local cache for a snapshot.
 * We avoid overwriting non-empty cached data with an empty *fromCache* snapshot,
 * because Firestore's IndexedDB may be empty on a fresh install/launch and would
 * wipe our local fallback.
 */
function shouldCacheSnapshot<T>(data: T, snapshot: QuerySnapshot | DocumentSnapshot): boolean {
  const fromCache = snapshot.metadata?.fromCache ?? false;
  if (!fromCache) return true; // server snapshot is authoritative
  return !isEmptyData(data); // only cache non-empty cache snapshots
}

/**
 * Wrapper around onSnapshot for queries that:
 * 1. Emits the latest locally cached data immediately (if any).
 * 2. Persists each successful snapshot to localStorage.
 * 3. Falls back to cached data when the snapshot fails (offline).
 */
export function cachedQuerySnapshot<T>(
  q: Query,
  cacheKey: string,
  transform: (snapshot: QuerySnapshot) => T,
  callback: (data: T) => void
): () => void {
  // Show stale data right away while the network snapshot is in flight.
  const cached = getLocalCache<T>(cacheKey);
  if (cached !== null) {
    callback(cached);
  }

  return onSnapshot(q, (snapshot) => {
    const data = transform(snapshot);
    if (shouldCacheSnapshot(data, snapshot)) {
      setLocalCache(cacheKey, data);
    }
    callback(data);
  }, (error) => {
    console.error(`[cachedQuerySnapshot] ${cacheKey} error:`, error);
    const fallback = getLocalCache<T>(cacheKey);
    if (fallback !== null) {
      callback(fallback);
    }
  });
}

/**
 * Wrapper around onSnapshot for single documents with the same cache-first
 * behavior.
 */
export function cachedDocSnapshot<T>(
  ref: DocumentReference,
  cacheKey: string,
  transform: (snapshot: DocumentSnapshot) => T,
  callback: (data: T) => void
): () => void {
  const cached = getLocalCache<T>(cacheKey);
  if (cached !== null) {
    callback(cached);
  }

  return onSnapshot(ref, (snapshot) => {
    const data = transform(snapshot);
    if (shouldCacheSnapshot(data, snapshot)) {
      setLocalCache(cacheKey, data);
    }
    callback(data);
  }, (error) => {
    console.error(`[cachedDocSnapshot] ${cacheKey} error:`, error);
    const fallback = getLocalCache<T>(cacheKey);
    if (fallback !== null) {
      callback(fallback);
    }
  });
}

/**
 * Wrapper around getDocs that caches the transformed result and returns it
 * on subsequent offline failures.
 */
export async function cachedGetDocs<T>(
  q: Query,
  cacheKey: string,
  transform: (snapshot: QuerySnapshot) => T
): Promise<T> {
  try {
    const snapshot = await getDocs(q);
    const data = transform(snapshot);
    setLocalCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`[cachedGetDocs] ${cacheKey} error:`, error);
    const cached = getLocalCache<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }
    throw error;
  }
}
