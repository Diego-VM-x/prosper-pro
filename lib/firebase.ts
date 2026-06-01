import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validación de variables de entorno
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

let missingVars: string[] = [];
if (typeof window !== 'undefined') {
  missingVars = requiredEnvVars.filter(
    (v) => !process.env[v]
  );
  if (missingVars.length > 0) {
    console.error(
      '[Firebase] Variables de entorno faltantes:',
      missingVars.join(', '),
      '\nAsegúrate de configurarlas en Vercel Dashboard → Settings → Environment Variables.'
    );
  }
}

if (typeof window !== 'undefined') {
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

let app: FirebaseApp;
let db: ReturnType<typeof getFirestore>;
let auth: Auth | null = null;

try {
  const hasCriticalVars = firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId;

  if (hasCriticalVars && typeof window !== 'undefined') {
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key?.startsWith('firebase:')) sessionStorage.removeItem(key);
      }
    } catch {}
  }

  if (hasCriticalVars) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    if (typeof window !== 'undefined') {
      auth = getAuth(app);
    }
  } else {
    console.warn('[Firebase] Configuración incompleta. La app funcionará sin datos de Firebase.');
    app = !getApps().length
      ? initializeApp({ apiKey: 'dummy', projectId: 'dummy', appId: 'dummy' })
      : getApp();
    db = getFirestore(app);
  }
} catch (e) {
  console.error('[Firebase] Error al inicializar:', e);
  // Fallback: crear app con config inválida para prevenir crashes
  try {
    app = !getApps().length
      ? initializeApp({ apiKey: 'invalid', projectId: 'invalid', appId: 'invalid' })
      : getApp();
    db = getFirestore(app);
  } catch (fallbackErr) {
    console.error('[Firebase] Fallback también falló:', fallbackErr);
    app = {} as FirebaseApp;
    db = {} as ReturnType<typeof getFirestore>;
  }
}

export { app, auth, db };

export function enableOfflinePersistence() {
  if (typeof window === 'undefined' || !db) return Promise.resolve();
  return import('firebase/firestore').then(({ enableMultiTabIndexedDbPersistence }) =>
    enableMultiTabIndexedDbPersistence(db).catch(() => {})
  );
}
