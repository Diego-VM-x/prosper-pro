import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Re-export firestore functions for centralized imports (better chunk deduplication)
export {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  getDoc,
  onSnapshot,
  increment,
  orderBy,
  limit,
  arrayUnion,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';

export {
  onAuthStateChanged,
  signOut,
  updateCurrentUser,
  sendEmailVerification,
  type User,
} from 'firebase/auth';

const isBrowser = typeof window !== 'undefined';

const HARDCODED_CONFIG = {
  apiKey: 'AIzaSyDUGxu2cfgxVrgSS1xamE0NaVUOv7TnX2E',
  authDomain: 'prospeweb.firebaseapp.com',
  projectId: 'prospeweb',
  storageBucket: 'prospeweb.firebasestorage.app',
  messagingSenderId: '144762699678',
  appId: '1:144762699678:web:e7ce0d3bc2533b2175e08f',
  measurementId: 'G-R7D5M4J5L5',
};

function pickValidEnv(envVal: string | undefined, fallback: string, validator: (v: string) => boolean): string {
  const trimmed = envVal?.trim();
  if (trimmed && validator(trimmed)) return trimmed;
  return fallback;
}

const firebaseConfig = {
  apiKey: pickValidEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, HARDCODED_CONFIG.apiKey, (v) => v.startsWith('AIza')),
  authDomain: pickValidEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, HARDCODED_CONFIG.authDomain, (v) => v.includes('.')),
  projectId: pickValidEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, HARDCODED_CONFIG.projectId, (v) => v.length > 2),
  storageBucket: pickValidEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, HARDCODED_CONFIG.storageBucket, (v) => v.includes('.')),
  messagingSenderId: pickValidEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, HARDCODED_CONFIG.messagingSenderId, (v) => /^\d+$/.test(v)),
  appId: pickValidEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, HARDCODED_CONFIG.appId, (v) => v.includes(':')),
  measurementId: pickValidEnv(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, HARDCODED_CONFIG.measurementId, (v) => v.startsWith('G-')),
};

// Validación silenciosa de variables de entorno (solo en cliente, sin console.error)
if (isBrowser) {
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    // Silencio: los fallbacks hardcoded ya están activos
  }
}

// Polyfill de localStorage/sessionStorage para modo privado / sandbox
const memoryStoreLS: Record<string, string> = {};
const memoryStoreSS: Record<string, string> = {};

function createMemoryStorage(store: Record<string, string>): Storage {
  return {
    getItem(key: string): string | null { return store[key] ?? null; },
    setItem(key: string, value: string): void { store[key] = value; },
    removeItem(key: string): void { delete store[key]; },
    clear(): void { Object.keys(store).forEach((k) => delete store[k]); },
    key(index: number): string | null { return Object.keys(store)[index] ?? null; },
    get length() { return Object.keys(store).length; },
  };
}

if (isBrowser) {
  // Polyfill localStorage
  try {
    const test = localStorage.getItem('__test');
    void test;
  } catch {
    try {
      (window as any).localStorage = createMemoryStorage(memoryStoreLS);
    } catch {
      try {
        Object.defineProperty(window, 'localStorage', {
          value: createMemoryStorage(memoryStoreLS),
          configurable: true,
          writable: true,
        });
      } catch {
        // Fallback: some browsers block all storage access
      }
    }
  }
  // Polyfill sessionStorage
  try {
    const test = sessionStorage.getItem('__test');
    void test;
  } catch {
    try {
      (window as any).sessionStorage = createMemoryStorage(memoryStoreSS);
    } catch {
      try {
        Object.defineProperty(window, 'sessionStorage', {
          value: createMemoryStorage(memoryStoreSS),
          configurable: true,
          writable: true,
        });
      } catch {
        // Fallback: some browsers block all storage access
      }
    }
  }
}

// Mock de Firestore para SSR (evita "Service firestore is not available" en build)
const createFirestoreMock = (): any => {
  const noop = () => Promise.resolve();
  const noopUnsub = () => {};
  return {
    type: 'firestore-mock' as const,
    collection: () => ({ doc: () => ({ get: noop, set: noop, update: noop, delete: noop }) }),
    doc: () => ({ get: noop, set: noop, update: noop, delete: noop }),
    getDoc: noop,
    setDoc: noop,
    updateDoc: noop,
    deleteDoc: noop,
    addDoc: noop,
    query: () => ({ get: noop }),
    where: () => ({}),
    orderBy: () => ({}),
    limit: () => ({}),
    onSnapshot: () => noopUnsub,
  };
};

let app: FirebaseApp;
let db: any;
let auth: any = null;

const hasCriticalVars = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

function safeLog(...args: any[]) {
  try { console.log(...args); } catch {}
}
function safeWarn(...args: any[]) {
  try { console.warn(...args); } catch {}
}
function safeError(...args: any[]) {
  try { console.error(...args); } catch {}
}

if (isBrowser) {
  safeLog('[Firebase DEBUG] apiKey starts with:', firebaseConfig.apiKey?.slice(0, 8));
  safeLog('[Firebase DEBUG] projectId:', firebaseConfig.projectId);
  safeLog('[Firebase DEBUG] appId:', firebaseConfig.appId);
}

try {
  if (hasCriticalVars) {
    safeLog('[Firebase DEBUG] hasCriticalVars = true, initializing...');
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    safeLog('[Firebase DEBUG] app initialized, name:', app.name);

    if (isBrowser) {
      safeLog('[Firebase DEBUG] Browser mode, loading Firestore + Auth...');
      db = getFirestore(app);
      auth = getAuth(app);
      safeLog('[Firebase DEBUG] auth object:', auth ? 'present' : 'NULL');

      // Limpiar sessionStorage de firebase en cada inicio (evita conflictos con tabs)
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (key?.startsWith('firebase:')) sessionStorage.removeItem(key);
        }
      } catch {}
    } else {
      safeLog('[Firebase DEBUG] SSR mode, using mocks');
      db = createFirestoreMock();
      auth = null;
    }
  } else if (isBrowser) {
    safeWarn('[Firebase] Configuración incompleta. La app funcionará sin datos de Firebase.');
    app = !getApps().length
      ? initializeApp({ apiKey: 'dummy', projectId: 'dummy', appId: 'dummy' })
      : getApp();
    db = getFirestore(app);
  } else {
    app = {} as FirebaseApp;
    db = createFirestoreMock();
  }
} catch (e) {
  safeError('[Firebase] Error al inicializar:', e);
  if (isBrowser) {
    try {
      app = !getApps().length
        ? initializeApp({ apiKey: 'invalid', projectId: 'invalid', appId: 'invalid' })
        : getApp();
      db = getFirestore(app);
    } catch {
      app = {} as FirebaseApp;
      db = createFirestoreMock();
    }
  } else {
    app = {} as FirebaseApp;
    db = createFirestoreMock();
  }
}

export { app, auth, db };

export function enableOfflinePersistence() {
  if (!isBrowser || !db || db.type === 'firestore-mock') return Promise.resolve();
  return import('firebase/firestore').then(({ enableMultiTabIndexedDbPersistence }) =>
    enableMultiTabIndexedDbPersistence(db).catch(() => {})
  );
}
