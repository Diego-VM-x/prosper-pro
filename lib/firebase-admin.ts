import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function getCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) as ServiceAccount);
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return cert(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  }
  return undefined;
}

function initAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  const credential = getCredential();
  if (credential) {
    return initializeApp({ credential });
  }
  // Will use application-default credentials when running locally with gcloud.
  return initializeApp();
}

const adminApp = initAdminApp();

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
export const adminMessaging = getMessaging(adminApp);

export { adminApp };
