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

export async function searchUsers(searchTerm: string, currentUserId: string): Promise<UserProfile[]> {
  if (!searchTerm.trim()) return [];
  
  const q = query(collection(db, USERS_COLLECTION));
  const snapshot = await getDocs(q);
  
  const users: UserProfile[] = [];
  const term = searchTerm.toLowerCase();
  
  snapshot.forEach((d) => {
    const data = d.data() as UserProfile;
    if (d.id !== currentUserId && (
      (data.displayName && data.displayName.toLowerCase().includes(term)) ||
      (data.email && data.email.toLowerCase().includes(term))
    )) {
      users.push({ id: d.id, ...data } as UserProfile);
    }
  });
  
  return users.slice(0, 20);
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
    where('participants', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
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
    where('conversationId', '==', conversationId),
    orderBy('timestamp', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages: PrivateMessage[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      messages.push({
        id: d.id,
        conversationId: data.conversationId,
        senderId: data.senderId,
        text: data.text,
        timestamp: data.timestamp?.toDate?.()?.getTime() || data.timestamp || Date.now(),
        read: data.read || false,
      });
    });
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
  // Guardar mensaje en Firestore
  const msgRef = await addDoc(collection(db, MESSAGES_COLLECTION), {
    conversationId,
    senderId,
    text,
    timestamp: serverTimestamp(),
    read: false,
  });
  
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
  
  // Marcar mensajes como leídos
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where('conversationId', '==', conversationId),
    where('senderId', '!=', userId),
    where('read', '==', false)
  );
  
  const snapshot = await getDocs(q);
  const batch = snapshot.docs.map((d) => updateDoc(d.ref, { read: true }));
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
