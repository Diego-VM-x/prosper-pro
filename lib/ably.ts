import Ably from 'ably';

// Validación de variables de entorno
const ablyApiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;

if (typeof window !== 'undefined') {
  if (!ablyApiKey) {
    console.error(
      '[Ably] Variable NEXT_PUBLIC_ABLY_API_KEY no configurada.',
      '\nAgrega la variable en Vercel Dashboard → Settings → Environment Variables.'
    );
  }
}

// Singleton de Ably
let ablyInstance: Ably.Realtime | null = null;

export function getAblyClient(): Ably.Realtime | null {
  if (ablyInstance) return ablyInstance;

  if (!ablyApiKey) {
    console.warn('[Ably] API Key no configurada. El chat en tiempo real no estará disponible.');
    return null;
  }

  try {
    ablyInstance = new Ably.Realtime({
      key: ablyApiKey,
      clientId: 'anonymous',
    });
    return ablyInstance;
  } catch (e) {
    console.error('[Ably] Error al inicializar:', e);
    return null;
  }
}

// Canal de comunidad (prefijo para evitar colisiones)
export function getCommunityChannel(communityId: string): Ably.RealtimeChannel | null {
  const client = getAblyClient();
  if (!client) return null;
  return client.channels.get(`community:${communityId}`);
}

// Tipos de mensaje para el chat
export interface AblyChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  timestamp: number;
  likes: string[];
  replyTo?: string;
}

// Suscribirse a mensajes en tiempo real
export function subscribeToChat(
  communityId: string,
  onMessage: (msg: AblyChatMessage) => void
): (() => void) {
  const channel = getCommunityChannel(communityId);
  if (!channel) return () => {};

  channel.subscribe('chat-message', (message: Ably.Message) => {
    const data = message.data as AblyChatMessage;
    onMessage(data);
  });

  return () => {
    channel.unsubscribe('chat-message');
  };
}

// Publicar mensaje en el chat
export async function publishChatMessage(
  communityId: string,
  message: AblyChatMessage
): Promise<boolean> {
  const channel = getCommunityChannel(communityId);
  if (!channel) return false;

  try {
    channel.publish('chat-message', message);
    return true;
  } catch (e) {
    console.error('[Ably] Error al publicar mensaje:', e);
    return false;
  }
}

// Suscribirse a likes en tiempo real
export function subscribeToLikes(
  communityId: string,
  messageId: string,
  onLike: (msgId: string, userId: string) => void
): (() => void) {
  const channel = getCommunityChannel(communityId);
  if (!channel) return () => {};

  channel.subscribe('like', (message: Ably.Message) => {
    const data = message.data as { messageId: string; userId: string };
    if (data.messageId === messageId) {
      onLike(data.messageId, data.userId);
    }
  });

  return () => {
    channel.unsubscribe('like');
  };
}

// Publicar like
export async function publishLike(
  communityId: string,
  messageId: string,
  userId: string
): Promise<boolean> {
  const channel = getCommunityChannel(communityId);
  if (!channel) return false;

  try {
    channel.publish('like', { messageId, userId });
    return true;
  } catch (e) {
    console.error('[Ably] Error al publicar like:', e);
    return false;
  }
}
