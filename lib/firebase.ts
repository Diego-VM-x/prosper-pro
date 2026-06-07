import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';

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

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || HARDCODED_CONFIG.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || HARDCODED_CONFIG.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || HARDCODED_CONFIG.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || HARDCODED_CONFIG.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || HARDCODED_CONFIG.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || HARDCODED_CONFIG.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || HARDCODED_CONFIG.measurementId,
};

// Validación de variables de entorno (solo en cliente para evitar ruido en build)
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
    console.error(
      '[Firebase] Variables de entorno faltantes:',
      missingVars.join(', '),
      '\nAsegúrate de configurarlas en Vercel Dashboard → Settings → Environment Variables.'
    );
  }
}

// Polyfill de sessionStorage para modo privado / sandbox
if (isBrowser) {
  try {
    sessionStorage.getItem('__test');
  } catch {
    const store: Record<string, string> = {};
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); },
        key: (i: number) => Object.keys(store)[i] ?? null,
        get length() { return Object.keys(store).length; },
      },
      configurable: true,
    });
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

try {
  if (hasCriticalVars) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

    if (isBrowser) {
      // Cliente: inicializar Firestore y Auth normalmente
      const { getFirestore } = require('firebase/firestore');
      const { getAuth } = require('firebase/auth');
      db = getFirestore(app);
      auth = getAuth(app);

      // Limpiar sessionStorage de firebase en cada inicio (evita conflictos con tabs)
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (key?.startsWith('firebase:')) sessionStorage.removeItem(key);
        }
      } catch {}
    } else {
      // SSR: usar mocks para evitar que el SDK web de Firestore falle en Node.js
      db = createFirestoreMock();
      auth = null;
    }
  } else if (isBrowser) {
    // Cliente sin config válida: app funciona sin datos de Firebase
    console.warn('[Firebase] Configuración incompleta. La app funcionará sin datos de Firebase.');
    app = !getApps().length
      ? initializeApp({ apiKey: 'dummy', projectId: 'dummy', appId: 'dummy' })
      : getApp();
    const { getFirestore } = require('firebase/firestore');
    db = getFirestore(app);
  } else {
    // SSR sin config válida: usar mocks
    app = {} as FirebaseApp;
    db = createFirestoreMock();
  }
} catch (e) {
  console.error('[Firebase] Error al inicializar:', e);
  if (isBrowser) {
    try {
      app = !getApps().length
        ? initializeApp({ apiKey: 'invalid', projectId: 'invalid', appId: 'invalid' })
        : getApp();
      const { getFirestore } = require('firebase/firestore');
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
