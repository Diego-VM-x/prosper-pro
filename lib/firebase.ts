import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

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

let app: FirebaseApp;
let db: Firestore;
let auth: Auth | null = null;

try {
  // Verificar que al menos las variables críticas existan
  const hasCriticalVars = firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId;

  if (hasCriticalVars) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    if (typeof window !== 'undefined') {
      auth = getAuth(app);
    }
  } else {
    // Firebase no configurado - crear app dummy para evitar crashes
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
    // Último recurso: usar valores undefined (las páginas deben manejar auth/db null)
    app = {} as FirebaseApp;
    db = {} as Firestore;
  }
}

export { app, auth, db };
