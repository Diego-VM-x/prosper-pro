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

function getEnvVar(name: string, validator: (v: string) => boolean): string | undefined {
  const val = process.env[name]?.trim();
  if (val && validator(val)) return val;
  return undefined;
}

const envApiKey = getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY', (v) => v.startsWith('AIza'));
const envAuthDomain = getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', (v) => v.includes('.'));
const envProjectId = getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID', (v) => v.length > 2);
const envStorageBucket = getEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', (v) => v.includes('.'));
const envMessagingSenderId = getEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', (v) => /^\d+$/.test(v));
const envAppId = getEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID', (v) => v.includes(':'));
const envMeasurementId = getEnvVar('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID', (v) => v.startsWith('G-'));

// En el navegador, advertir si faltan variables de entorno (pero no bloquear para evitar crash)
if (isBrowser && (!envApiKey || !envProjectId || !envAppId)) {
  console.warn('[Firebase] Faltan variables de entorno. Configura NEXT_PUBLIC_FIREBASE_* en .env.local');
}

const firebaseConfig = {
  apiKey: envApiKey || 'MISSING_API_KEY',
  authDomain: envAuthDomain || 'missing.firebaseapp.com',
  projectId: envProjectId || 'missing-project',
  storageBucket: envStorageBucket || 'missing.appspot.com',
  messagingSenderId: envMessagingSenderId || '000000000000',
  appId: envAppId || '1:000000000000:web:missing',
  measurementId: envMeasurementId || 'G-MISSING',
};

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

const isDev = process.env.NODE_ENV === 'development';

function safeLog(...args: any[]) {
  if (isDev) try { console.log(...args); } catch {}
}
function safeWarn(...args: any[]) {
  try { console.warn(...args); } catch {}
}
function safeError(...args: any[]) {
  if (isDev) try { console.error(...args); } catch {}
}

if (isBrowser && isDev) {
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
