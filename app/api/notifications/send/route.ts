import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/utils/verifyAdminServer';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';

interface SendRequestBody {
  title: string;
  body: string;
  data?: Record<string, string>;
  tokens?: string[];
  userIds?: string[];
  all?: boolean;
}

const BATCH_SIZE = 500;

function sanitizeData(data?: Record<string, string>): Record<string, string> | undefined {
  if (!data) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = String(v);
  }
  return out;
}

async function getTokensForUserIds(userIds: string[]): Promise<string[]> {
  const tokens = new Set<string>();
  // Tokens are stored in push_tokens/{token} with ownerId.
  const snapshot = await adminDb.collection('push_tokens').get();
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (userIds.includes(data.ownerId) && typeof data.token === 'string') {
      tokens.add(data.token);
    }
  });
  return Array.from(tokens);
}

async function getAllTokens(): Promise<string[]> {
  const tokens: string[] = [];
  const snapshot = await adminDb.collection('push_tokens').get();
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (typeof data.token === 'string') {
      tokens.push(data.token);
    }
  });
  return tokens;
}

export async function POST(request: NextRequest) {
  const adminUid = await verifyAdminSession();
  if (!adminUid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: SendRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title, body: messageBody, data, tokens: explicitTokens, userIds, all } = body;

  if (!title || !messageBody) {
    return NextResponse.json({ error: 'Missing title or body' }, { status: 400 });
  }

  try {
    let tokens: string[] = [];

    if (Array.isArray(explicitTokens) && explicitTokens.length > 0) {
      tokens = explicitTokens;
    } else if (Array.isArray(userIds) && userIds.length > 0) {
      tokens = await getTokensForUserIds(userIds);
    } else if (all) {
      tokens = await getAllTokens();
    } else {
      return NextResponse.json(
        { error: 'Provide tokens, userIds, or all=true' },
        { status: 400 }
      );
    }

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, sent: 0, failed: 0, invalidTokens: [] });
    }

    const cleanData = sanitizeData(data);
    let sent = 0;
    let failed = 0;
    const invalidTokens: string[] = [];

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE);
      // Data-only messages are handled by our custom FirebaseMessagingService
      // in Android, which guarantees the notification is shown even when the
      // app is closed. Keep priority high so Doze mode allows delivery.
      // Estructura FCM HTTP v1 para forzar el despertar del dispositivo:
      // - android.priority = 'high'  -> evita que Doze Mode retrase/descarte el mensaje.
      // - Sin objeto "notification"  -> fuerza a Android a entregar el payload al
      //   servicio/handler correspondiente en lugar de mostrar una notificación
      //   estándar pasiva que el sistema puede retrasar.
      // - directBootOk = true        -> permite la entrega temprana tras reinicio.
      const response = await adminMessaging.sendEachForMulticast({
        tokens: batch,
        data: {
          title,
          body: messageBody,
          ...cleanData,
        },
        android: {
          priority: 'high',
          directBootOk: true,
        },
      });

      sent += response.successCount;
      failed += response.failureCount;

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const token = batch[idx];
          const code = resp.error?.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            invalidTokens.push(token);
          }
        }
      });
    }

    // Clean up invalid tokens in background
    if (invalidTokens.length > 0) {
      const batch = adminDb.batch();
      invalidTokens.forEach((token) => {
        batch.delete(adminDb.collection('push_tokens').doc(token));
      });
      batch.commit().catch((e) => {
        console.error('[Push API] Failed to cleanup invalid tokens:', e);
      });
    }

    return NextResponse.json({
      success: failed === 0,
      sent,
      failed,
      invalidTokens,
      total: tokens.length,
    });
  } catch (error: any) {
    console.error('[Push API] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send notifications' },
      { status: 500 }
    );
  }
}
