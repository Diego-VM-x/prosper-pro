import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
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

// Obtener o crear una conversación 1:1
export async function getOrCreateConversation(userId1: string, userId2: string): Promise<string> {
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
  callback: (messages: PrivateMessage[]) => void
) {
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where('conversationId', '==', conversationId)
  );
  
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
) {
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
