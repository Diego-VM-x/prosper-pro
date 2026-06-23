/**
 * Send a global in-app + push notification to every Firebase Auth user.
 *
 * Requires Firebase Admin SDK credentials. Provide either:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service-account JSON file, or
 *   - FIREBASE_SERVICE_ACCOUNT_JSON env var containing the raw JSON string.
 *
 * Usage:
 *   node scripts/send-global-notification.js "1.0.4" "Nueva versión disponible" "Prosper Pro 1.0.4 ya está aquí..." "https://prosper-pro.vercel.app/prosper-pro.apk"
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');

const VERSION = process.argv[2] || '1.0.4';
const TITLE = process.argv[3] || `Prosper Pro ${VERSION} disponible`;
const MESSAGE =
  process.argv[4] ||
  `Actualiza a la versión ${VERSION} para disfrutar del historial de transacciones rediseñado, edición de movimientos y el nuevo widget de últimos movimientos.`;
const APK_URL = process.argv[5] || `https://prosper-pro.vercel.app/prosper-pro.apk`;

function getCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return cert(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  }
  return undefined;
}

function initAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  const credential = getCredential();
  if (credential) return initializeApp({ credential });
  return initializeApp();
}

const BATCH_LIMIT = 450; // Firestore batch limit is 500; keep margin
const PUSH_BATCH = 500;  // FCM multicast limit

async function main() {
  const adminApp = initAdminApp();
  const db = getFirestore(adminApp);
  const auth = getAuth(adminApp);
  const messaging = getMessaging(adminApp);

  let nextPageToken;
  let totalUsers = 0;
  let totalSent = 0;
  let totalPushSent = 0;
  let totalPushFailed = 0;
  const invalidTokens = [];

  console.log(`[send-global-notification] Sending notification for v${VERSION}...`);

  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    nextPageToken = listUsersResult.pageToken;
    const users = listUsersResult.users;
    totalUsers += users.length;

    for (let i = 0; i < users.length; i += BATCH_LIMIT) {
      const chunk = users.slice(i, i + BATCH_LIMIT);
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
          meta: { version: VERSION, url: APK_URL },
          createdAt: Date.now(),
        });
      }
      await batch.commit();
      totalSent += chunk.length;
    }

    console.log(`[send-global-notification] Processed ${totalUsers} users...`);
  } while (nextPageToken);

  // Send native push to all registered tokens
  console.log('[send-global-notification] Sending native push notifications...');
  const tokensSnap = await db.collection('push_tokens').get();
  const tokens = [];
  tokensSnap.forEach((doc) => {
    const data = doc.data();
    if (typeof data.token === 'string') tokens.push(data.token);
  });

  for (let i = 0; i < tokens.length; i += PUSH_BATCH) {
    const batch = tokens.slice(i, i + PUSH_BATCH);
    const response = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: { title: TITLE, body: MESSAGE },
      data: { type: 'app_update', version: VERSION, url: APK_URL },
      android: {
        priority: 'high',
        notification: { channelId: 'prosper_general_v2', sound: 'default' },
      },
    });
    totalPushSent += response.successCount;
    totalPushFailed += response.failureCount;
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const code = resp.error?.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          invalidTokens.push(batch[idx]);
        }
      }
    });
  }

  if (invalidTokens.length > 0) {
    const cleanup = db.batch();
    invalidTokens.forEach((token) => cleanup.delete(db.collection('push_tokens').doc(token)));
    await cleanup.commit();
  }

  console.log(
    `[send-global-notification] Done. Users: ${totalUsers}, In-app: ${totalSent}, Push: ${totalPushSent} sent / ${totalPushFailed} failed, Invalid tokens cleaned: ${invalidTokens.length}`
  );
}

main().catch((err) => {
  console.error('[send-global-notification] Error:', err);
  process.exit(1);
});
