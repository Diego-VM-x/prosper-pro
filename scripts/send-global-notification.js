/**
 * Send a global in-app notification to every Firebase Auth user.
 *
 * Requires Firebase Admin SDK credentials. Provide either:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service-account JSON file, or
 *   - FIREBASE_SERVICE_ACCOUNT_JSON env var containing the raw JSON string.
 *
 * Usage:
 *   node scripts/send-global-notification.js "1.0.4" "Nueva versión disponible" "Prosper Pro 1.0.4 ya está aquí con historial rediseñado, edición de transacciones y más."
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

const VERSION = process.argv[2] || '1.0.4';
const TITLE = process.argv[3] || `Prosper Pro ${VERSION} disponible`;
const MESSAGE =
  process.argv[4] ||
  `Actualiza a la versión ${VERSION} para disfrutar del historial de transacciones rediseñado, edición de movimientos y el nuevo widget de últimos movimientos.`;

function getCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return cert(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  }
  return undefined;
}

async function main() {
  if (!getApps().length) {
    const credential = getCredential();
    if (credential) {
      initializeApp({ credential });
    } else {
      // Will use application-default credentials (e.g. gcloud auth application-default login)
      initializeApp();
    }
  }

  const db = getFirestore();
  const auth = getAuth();

  let nextPageToken;
  let totalUsers = 0;
  let totalSent = 0;
  const batchLimit = 450; // Firestore batch limit is 500; keep margin

  console.log(`[send-global-notification] Sending notification for v${VERSION}...`);

  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    nextPageToken = listUsersResult.pageToken;
    const users = listUsersResult.users;
    totalUsers += users.length;

    for (let i = 0; i < users.length; i += batchLimit) {
      const chunk = users.slice(i, i + batchLimit);
      const batch = db.batch();
      for (const user of chunk) {
        const docId = `version_${VERSION}_${user.uid}`;
        const ref = db.collection('notifications').doc(docId);
        batch.set(ref, {
          ownerId: user.uid,
          title: TITLE,
          message: MESSAGE,
          type: 'app_update',
          read: false,
          meta: { version: VERSION },
          createdAt: Date.now(),
        });
      }
      await batch.commit();
      totalSent += chunk.length;
    }

    console.log(`[send-global-notification] Processed ${totalUsers} users...`);
  } while (nextPageToken);

  console.log(`[send-global-notification] Done. Users: ${totalUsers}, Notifications sent: ${totalSent}`);
}

main().catch((err) => {
  console.error('[send-global-notification] Error:', err);
  process.exit(1);
});
