import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { PrivateConversation, PrivateMessage, UserProfile } from '@/types';

const CONVERSATIONS_COLLECTION = 'private_conversations';
const MESSAGES_COLLECTION = 'private_messages';
const USERS_COLLECTION = 'users';
const FRIENDS_COLLECTION = 'friendships';
const REQUESTS_COLLECTION = 'friend_requests';

// ==================== USER SEARCH ====================

export async function getAllUsers(currentUserId: string): Promise<UserProfile[]> {
  const q = query(collection(db, USERS_COLLECTION));
  const snapshot = await getDocs(q);
  
  const usersMap = new Map<string, UserProfile>();
  snapshot.forEach((d) => {
    const data = d.data();
    // Filtrar usuarios eliminados (sin displayName ni email)
    // También filtrar documentos huérfanos de cuentas eliminadas
    if (d.id !== currentUserId && (data.displayName || data.email)) {
      const uid = d.id;
      const email = data.email || '';
      // Si ya existe un usuario con este email, mantener el más reciente
      if (email) {
        const existing = usersMap.get(email);
        if (!existing || (data.createdAt || 0) > (existing.createdAt || 0)) {
          usersMap.set(email, { uid, ...data } as UserProfile);
        }
      } else {
        usersMap.set(uid, { uid, ...data } as UserProfile);
      }
    }
  });
  
  return Array.from(usersMap.values());
}

export function subscribeToAllUsers(currentUserId: string, callback: (users: UserProfile[]) => void) {
  const q = query(collection(db, USERS_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const usersMap = new Map<string, UserProfile>();
    snapshot.forEach((d) => {
      const data = d.data();
      // Filtrar usuarios eliminados
      if (d.id !== currentUserId && (data.displayName || data.email)) {
        const uid = d.id;
        const email = data.email || '';
        // Si ya existe un usuario con este email, mantener el más reciente
        if (email) {
          const existing = usersMap.get(email);
          if (!existing || (data.createdAt || 0) > (existing.createdAt || 0)) {
            usersMap.set(email, { uid, ...data } as UserProfile);
          }
        } else {
          usersMap.set(uid, { uid, ...data } as UserProfile);
        }
      }
    });
    callback(Array.from(usersMap.values()));
  }, (error) => {
    console.error('subscribeToAllUsers error:', error);
    callback([]);
  });
}

export async function searchUsers(searchTerm: string, currentUserId: string): Promise<UserProfile[]> {
  if (!searchTerm.trim()) return [];
  
  const users = await getAllUsers(currentUserId);
  const term = searchTerm.toLowerCase();
  
  return users.filter(u =>
    (u.displayName && u.displayName.toLowerCase().includes(term)) ||
    (u.email && u.email.toLowerCase().includes(term))
  ).slice(0, 20);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docSnap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!docSnap.exists()) return null;
  return { uid: docSnap.id, ...docSnap.data() } as UserProfile;
}

// ==================== CONVERSATIONS ====================

// Obtener o crear una conversación 1:1 (solo si son amigos)
export async function getOrCreateConversation(userId1: string, userId2: string): Promise<string | null> {
  // Verificar que son amigos
  const friends = await areFriends(userId1, userId2);
  if (!friends) {
    console.warn('No se puede crear conversación: no son amigos');
    return null;
  }
  
  // Buscar conversación existente
  const q = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where('participants', 'array-contains', userId1)
  );
  const snapshot = await getDocs(q);
  
  for (const d of snapshot.docs) {
    const data = d.data();
    if (data.participants.includes(userId2)) {
      return d.id;
    }
  }
  
  // Crear nueva conversación
  const docRef = await addDoc(collection(db, CONVERSATIONS_COLLECTION), {
    participants: [userId1, userId2],
    lastMessage: '',
    lastMessageAt: Date.now(),
    unreadCount: { [userId1]: 0, [userId2]: 0 },
  });
  
  return docRef.id;
}

// Obtener todas las conversaciones de un usuario
export function subscribeToConversations(
  userId: string,
  callback: (conversations: (PrivateConversation & { otherUser?: UserProfile })[]) => void
) {
  const q = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where('participants', 'array-contains', userId)
  );
  
  return onSnapshot(q, async (snapshot) => {
    const conversations: (PrivateConversation & { otherUser?: UserProfile })[] = [];
    
    for (const d of snapshot.docs) {
      const data = d.data() as PrivateConversation;
      const otherUserId = data.participants.find((p) => p !== userId);
      
      let otherUser: UserProfile | undefined;
      if (otherUserId) {
        const userDoc = await getDoc(doc(db, USERS_COLLECTION, otherUserId));
        if (userDoc.exists()) {
          otherUser = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
        }
      }
      
      conversations.push({ ...data, id: d.id, otherUser });
    }
    
    // Ordenar en el cliente por lastMessageAt
    conversations.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
    callback(conversations);
  }, (error) => {
    console.error('subscribeToConversations error:', error);
    callback([]);
  });
}

// ==================== MESSAGES ====================

export function subscribeToPrivateMessages(
  conversationId: string,
  currentUserId: string,
  callback: (messages: PrivateMessage[]) => void
) {
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where('conversationId', '==', conversationId)
  );
  
  let previousCount = 0;
  
  return onSnapshot(q, (snapshot) => {
    const messages: PrivateMessage[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      // Soportar tanto Timestamp de Firestore como número milisegundos
      let ts: number;
      if (data.timestamp?.toDate) {
        ts = data.timestamp.toDate().getTime();
      } else if (data.createdAt?.toDate) {
        ts = data.createdAt.toDate().getTime();
      } else {
        ts = data.timestamp || data.createdAt || Date.now();
      }
      messages.push({
        id: d.id,
        conversationId: data.conversationId,
        senderId: data.senderId,
        text: data.text,
        timestamp: ts,
        read: data.read || false,
      });
    });
    // Ordenar por timestamp ascendente (más antiguo primero)
    messages.sort((a, b) => a.timestamp - b.timestamp);
    
    // Detectar mensajes nuevos del otro usuario para notificación
    if (previousCount > 0 && messages.length > previousCount) {
      const newMessages = messages.slice(previousCount);
      for (const msg of newMessages) {
        if (msg.senderId !== currentUserId && !msg.read) {
          // Disparar notificación del navegador
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('💬 Nuevo mensaje', {
              body: msg.text.substring(0, 80),
              icon: '/logo-icon.png',
              tag: `msg-${msg.id}`,
            });
          }
          break; // Solo una notificación por batch
        }
      }
    }
    previousCount = messages.length;
    
    callback(messages);
  }, (error) => {
    console.error('subscribeToPrivateMessages error:', error);
    callback([]);
  });
}

export async function sendPrivateMessage(
  conversationId: string,
  senderId: string,
  receiverId: string,
  text: string
): Promise<string | null> {
  // Verificar que son amigos
  const friends = await areFriends(senderId, receiverId);
  if (!friends) {
    console.warn('No se puede enviar mensaje: no son amigos');
    return null;
  }
  
  const utcTimestamp = Date.now();
  // Guardar mensaje en Firestore
  const msgRef = await addDoc(collection(db, MESSAGES_COLLECTION), {
    conversationId,
    senderId,
    text,
    timestamp: utcTimestamp,
    utcOffset: new Date().getTimezoneOffset(),
    read: false,
    createdAt: serverTimestamp(),
  });

  // Enviar notificacion al receptor (Firestore + Browser)
  try {
    const { addNotification, sendBrowserNotification } = await import('./notifications');
    await addNotification({
      ownerId: receiverId,
      title: '💬 Nuevo mensaje privado',
      message: text.substring(0, 100),
      type: 'private_message',
      read: false,
    });
    // Notificación del navegador
    sendBrowserNotification('💬 Nuevo mensaje privado', text.substring(0, 80));
  } catch (e) {
    console.error('Error sending notification:', e);
  }
  
  // Actualizar última mensaje de la conversación
  const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  await updateDoc(convRef, {
    lastMessage: text.substring(0, 100),
    lastMessageAt: Date.now(),
    [`unreadCount.${receiverId}`]: (await getDoc(convRef)).data()?.unreadCount?.[receiverId] || 0 + 1,
  });
  
  return msgRef.id;
}

// ==================== CHAT MANAGEMENT ====================

// Vaciar todos los mensajes de una conversación
export async function clearConversationMessages(conversationId: string) {
  const msgQ = query(
    collection(db, MESSAGES_COLLECTION),
    where('conversationId', '==', conversationId)
  );
  const msgSnap = await getDocs(msgQ);
  for (const m of msgSnap.docs) {
    await deleteDoc(m.ref);
  }
  
  // Actualizar la conversación
  const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  await updateDoc(convRef, {
    lastMessage: '',
    lastMessageAt: Date.now(),
  });
}

// Eliminar una conversación completa (mensajes + conversación)
export async function deleteConversation(conversationId: string) {
  // Eliminar mensajes
  await clearConversationMessages(conversationId);
  
  // Eliminar conversación
  await deleteDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId));
}

// ==================== CLEANUP (para pruebas) ====================

// Eliminar todas las conversaciones y mensajes de un usuario
export async function clearUserData(userId: string) {
  // Eliminar conversaciones
  const convQ = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where('participants', 'array-contains', userId)
  );
  const convSnap = await getDocs(convQ);
  for (const d of convSnap.docs) {
    // Eliminar mensajes de esta conversación
    const msgQ = query(
      collection(db, MESSAGES_COLLECTION),
      where('conversationId', '==', d.id)
    );
    const msgSnap = await getDocs(msgQ);
    for (const m of msgSnap.docs) {
      await deleteDoc(m.ref);
    }
    // Eliminar conversación
    await deleteDoc(d.ref);
  }
  
  // Eliminar solicitudes de amistad
  const reqQ1 = query(collection(db, REQUESTS_COLLECTION), where('senderId', '==', userId));
  const reqQ2 = query(collection(db, REQUESTS_COLLECTION), where('receiverId', '==', userId));
  const reqSnap1 = await getDocs(reqQ1);
  const reqSnap2 = await getDocs(reqQ2);
  for (const d of reqSnap1.docs) await deleteDoc(d.ref);
  for (const d of reqSnap2.docs) await deleteDoc(d.ref);
  
  // Eliminar amistades
  const friendQ = query(collection(db, FRIENDS_COLLECTION), where('users', 'array-contains', userId));
  const friendSnap = await getDocs(friendQ);
  for (const d of friendSnap.docs) await deleteDoc(d.ref);
}

export async function markMessagesAsRead(conversationId: string, userId: string) {
  const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  await updateDoc(convRef, {
    [`unreadCount.${userId}`]: 0,
  });
  
  // Marcar mensajes como leídos - obtener todos y filtrar en cliente
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where('conversationId', '==', conversationId)
  );
  
  const snapshot = await getDocs(q);
  const batch = snapshot.docs
    .filter((d) => d.data().senderId !== userId && !d.data().read)
    .map((d) => updateDoc(d.ref, { read: true }));
  await Promise.all(batch);
}

// ==================== UNREAD COUNT ====================

export function subscribeToTotalUnreadCount(
  userId: string,
  callback: (count: number) => void
) {
  const q = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where('participants', 'array-contains', userId)
  );
  
  return onSnapshot(q, (snapshot) => {
    let total = 0;
    snapshot.forEach((d) => {
      const data = d.data();
      total += data.unreadCount?.[userId] || 0;
    });
    callback(total);
  }, (error) => {
    console.error('subscribeToTotalUnreadCount error:', error);
    callback(0);
  });
}

// ==================== FRIEND REQUESTS ====================

// Enviar solicitud de amistad
export async function sendFriendRequest(senderId: string, senderName: string, receiverId: string, receiverName: string) {
  // Verificar si ya existe una solicitud
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    where('senderId', '==', senderId),
    where('receiverId', '==', receiverId)
  );
  const existing = await getDocs(q);
  if (!existing.empty) return;

  // Verificar si ya son amigos
  const friendsQ = query(
    collection(db, FRIENDS_COLLECTION),
    where('users', 'array-contains', senderId)
  );
  const friendsSnap = await getDocs(friendsQ);
  for (const d of friendsSnap.docs) {
    const data = d.data();
    if (data.users.includes(receiverId)) return;
  }

  await addDoc(collection(db, REQUESTS_COLLECTION), {
    senderId,
    senderName,
    receiverId,
    receiverName,
    status: 'pending',
    createdAt: Date.now(),
  });

  // Notificación
  const { addNotification } = await import('./notifications');
  await addNotification({
    ownerId: receiverId,
    title: '👋 Solicitud de amistad',
    message: `${senderName} quiere ser tu amigo`,
    type: 'community',
    read: false,
  });
}

// Aceptar solicitud de amistad
export async function acceptFriendRequest(requestId: string, senderId: string, receiverId: string) {
  // Actualizar solicitud
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), { status: 'accepted' });

  // Crear amistad
  await addDoc(collection(db, FRIENDS_COLLECTION), {
    users: [senderId, receiverId].sort(),
    createdAt: Date.now(),
  });
}

// Rechazar solicitud de amistad
export async function rejectFriendRequest(requestId: string) {
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), { status: 'rejected' });
}

// Eliminar amistad
export async function removeFriendship(userId1: string, userId2: string) {
  const q = query(
    collection(db, FRIENDS_COLLECTION),
    where('users', 'array-contains', userId1)
  );
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    const data = d.data();
    if (data.users.includes(userId2)) {
      await updateDoc(d.ref, { deleted: true });
      break;
    }
  }
}

// Suscribirse a solicitudes recibidas
export function subscribeToFriendRequests(userId: string, callback: (requests: any[]) => void) {
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    where('receiverId', '==', userId),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, (snapshot) => {
    const requests: any[] = [];
    snapshot.forEach(d => requests.push({ id: d.id, ...d.data() }));
    callback(requests);
  }, () => callback([]));
}

// Suscribirse a solicitudes enviadas
export function subscribeToSentRequests(userId: string, callback: (requests: any[]) => void) {
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    where('senderId', '==', userId),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, (snapshot) => {
    const requests: any[] = [];
    snapshot.forEach(d => requests.push({ id: d.id, ...d.data() }));
    callback(requests);
  }, () => callback([]));
}

// Suscribirse a amigos
export function subscribeToFriends(userId: string, callback: (friends: UserProfile[]) => void) {
  const q = query(
    collection(db, FRIENDS_COLLECTION),
    where('users', 'array-contains', userId)
  );
  return onSnapshot(q, async (snapshot) => {
    const friends: UserProfile[] = [];
    for (const d of snapshot.docs) {
      const data = d.data();
      if (data.deleted) continue;
      const friendId = data.users.find((u: string) => u !== userId);
      if (friendId) {
        const userDoc = await getDoc(doc(db, USERS_COLLECTION, friendId));
        if (userDoc.exists()) {
          friends.push({ uid: userDoc.id, ...userDoc.data() } as UserProfile);
        }
      }
    }
    callback(friends);
  }, () => callback([]));
}

// ==================== PRESENCE ====================

export function setUserOnline(userId: string) {
  const presenceRef = doc(db, 'presence', userId);
  return updateDoc(presenceRef, { online: true, lastSeen: Date.now() }).catch(() => {});
}

export function setUserOffline(userId: string) {
  const presenceRef = doc(db, 'presence', userId);
  return updateDoc(presenceRef, { online: false, lastSeen: Date.now() }).catch(() => {});
}

export function subscribeToPresence(userId: string, callback: (isOnline: boolean) => void) {
  const presenceRef = doc(db, 'presence', userId);
  return onSnapshot(presenceRef, (docSnap) => {
    if (!docSnap.exists()) { callback(false); return; }
    const data = docSnap.data();
    const isOnline = data.online && (Date.now() - (data.lastSeen || 0)) < 5 * 60 * 1000;
    callback(isOnline);
  }, () => callback(false));
}

// Verificar si dos usuarios son amigos
export async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  const q = query(
    collection(db, FRIENDS_COLLECTION),
    where('users', 'array-contains', userId1)
  );
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    const data = d.data();
    if (!data.deleted && data.users.includes(userId2)) return true;
  }
  return false;
}
