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
  limit,
  onSnapshot,
  serverTimestamp,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Community, CommunityMessage, CommunityRoomMember } from '@/types';
import {
  subscribeToChat,
  publishChatMessage,
  subscribeToLikes,
  publishLike,
  type AblyChatMessage,
} from '../ably';

const COMMUNITIES_COLLECTION = 'communities';
const MEMBERS_SUBCOLLECTION = 'members';
const MESSAGES_SUBCOLLECTION = 'messages';

// ==================== COMMUNITIES ====================

export async function getCommunities(): Promise<Community[]> {
  const q = query(collection(db, COMMUNITIES_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Community));
}

export function subscribeToCommunities(callback: (communities: Community[]) => void) {
  const q = query(collection(db, COMMUNITIES_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const communities: Community[] = [];
    snapshot.forEach(d => communities.push({ id: d.id, ...d.data() } as Community));
    callback(communities);
  }, (error) => {
    console.error('subscribeToCommunities error:', error);
    callback([]);
  });
}

export async function createCommunity(data: Omit<Community, 'id' | 'createdAt'>) {
  return addDoc(collection(db, COMMUNITIES_COLLECTION), {
    ...data,
    createdAt: Date.now(),
  });
}

// ==================== MEMBERS ====================

export async function joinCommunity(communityId: string, member: Omit<CommunityRoomMember, 'joinedAt'>) {
  const membersRef = collection(db, COMMUNITIES_COLLECTION, communityId, MEMBERS_SUBCOLLECTION);
  const q = query(membersRef, where('uid', '==', member.uid));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) return;
  
  await addDoc(membersRef, {
    ...member,
    joinedAt: Date.now(),
  });
  
  await updateDoc(doc(db, COMMUNITIES_COLLECTION, communityId), {
    memberCount: ((await getDoc(doc(db, COMMUNITIES_COLLECTION, communityId))).data()?.memberCount || 0) + 1,
  });
}

export function subscribeToMembers(communityId: string, callback: (members: CommunityRoomMember[]) => void) {
  const q = query(
    collection(db, COMMUNITIES_COLLECTION, communityId, MEMBERS_SUBCOLLECTION),
    orderBy('joinedAt', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    const members: CommunityRoomMember[] = [];
    snapshot.forEach(d => members.push({ id: d.id, ...d.data() } as unknown as CommunityRoomMember));
    callback(members);
  }, (error) => {
    console.error('subscribeToMembers error:', error);
    callback([]);
  });
}

// ==================== MESSAGES (Ably + Firestore) ====================

// Cargar mensajes iniciales desde Firestore
export async function loadMessages(communityId: string, pageSize: number = 40): Promise<CommunityMessage[]> {
  const q = query(
    collection(db, COMMUNITIES_COLLECTION, communityId, MESSAGES_SUBCOLLECTION),
    orderBy('timestamp', 'asc'),
    limit(pageSize)
  );
  
  const snapshot = await getDocs(q);
  const messages: CommunityMessage[] = [];
  snapshot.forEach(d => {
    const data = d.data();
    messages.push({
      id: d.id,
      text: data.text || '',
      senderId: data.senderId || '',
      senderName: data.senderName || 'Usuario',
      senderPhoto: data.senderPhoto || '',
      timestamp: data.timestamp?.toDate?.()?.getTime() || data.timestamp || Date.now(),
      likes: data.likes || [],
      replyTo: data.replyTo,
    });
  });
  return messages;
}

// Suscribirse a mensajes: Firestore para historial + Ably para nuevos
export function subscribeToMessages(
  communityId: string,
  callback: (messages: CommunityMessage[]) => void,
  pageSize: number = 40
) {
  let localMessages: CommunityMessage[] = [];

  // Cargar historial desde Firestore
  const q = query(
    collection(db, COMMUNITIES_COLLECTION, communityId, MESSAGES_SUBCOLLECTION),
    orderBy('timestamp', 'asc'),
    limit(pageSize)
  );

  const unsubFirestore = onSnapshot(q, (snapshot) => {
    localMessages = [];
    snapshot.forEach(d => {
      const data = d.data();
      localMessages.push({
        id: d.id,
        text: data.text || '',
        senderId: data.senderId || '',
        senderName: data.senderName || 'Usuario',
        senderPhoto: data.senderPhoto || '',
        timestamp: data.timestamp?.toDate?.()?.getTime() || data.timestamp || Date.now(),
        likes: data.likes || [],
        replyTo: data.replyTo,
      });
    });
    callback([...localMessages]);
  }, (error) => {
    console.error('subscribeToMessages firestore error:', error);
  });

  // Suscribirse a nuevos mensajes via Ably
  const unsubAbly = subscribeToChat(communityId, (msg) => {
    // Evitar duplicados
    if (!localMessages.find(m => m.id === msg.id)) {
      localMessages.push(msg);
      callback([...localMessages]);
    }
  });

  return () => {
    unsubFirestore();
    unsubAbly();
  };
}

// Enviar mensaje: Firestore (persistencia) + Ably (tiempo real)
export async function sendMessage(communityId: string, message: {
  text: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  replyTo?: string;
}) {
  const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ablyMessage: AblyChatMessage = {
    id: msgId,
    text: message.text,
    senderId: message.senderId,
    senderName: message.senderName,
    senderPhoto: message.senderPhoto,
    timestamp: Date.now(),
    likes: [],
    replyTo: message.replyTo,
  };

  // Publicar en Ably primero (tiempo real)
  await publishChatMessage(communityId, ablyMessage);

  // Persistir en Firestore
  try {
    await addDoc(collection(db, COMMUNITIES_COLLECTION, communityId, MESSAGES_SUBCOLLECTION), {
      ...ablyMessage,
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.error('Error persisting message in Firestore:', e);
  }
}

// Toggle like: Firestore + Ably
export async function toggleLike(communityId: string, messageId: string, userId: string) {
  const msgRef = doc(db, COMMUNITIES_COLLECTION, communityId, MESSAGES_SUBCOLLECTION, messageId);
  const msgSnap = await getDoc(msgRef);
  if (!msgSnap.exists()) return;
  
  const data = msgSnap.data();
  const likes: string[] = data.likes || [];
  const isLiked = likes.includes(userId);
  
  await updateDoc(msgRef, {
    likes: isLiked ? likes.filter((uid: string) => uid !== userId) : [...likes, userId],
  });

  // Notificar via Ably
  await publishLike(communityId, messageId, userId);
}

export async function deleteMessage(communityId: string, messageId: string) {
  await deleteDoc(doc(db, COMMUNITIES_COLLECTION, communityId, MESSAGES_SUBCOLLECTION, messageId));
}

// ==================== LOAD MORE (PAGINATION) ====================

export async function loadOlderMessages(communityId: string, lastTimestamp: number, pageSize: number = 40): Promise<CommunityMessage[]> {
  const q = query(
    collection(db, COMMUNITIES_COLLECTION, communityId, MESSAGES_SUBCOLLECTION),
    orderBy('timestamp', 'asc'),
    limit(pageSize)
  );
  
  const snapshot = await getDocs(q);
  const messages: CommunityMessage[] = [];
  snapshot.forEach(d => {
    const data = d.data();
    const ts = data.timestamp?.toDate?.()?.getTime() || data.timestamp || Date.now();
    if (ts < lastTimestamp) {
      messages.push({
        id: d.id,
        text: data.text || '',
        senderId: data.senderId || '',
        senderName: data.senderName || 'Usuario',
        senderPhoto: data.senderPhoto || '',
        timestamp: ts,
        likes: data.likes || [],
      });
    }
  });
  return messages;
}
