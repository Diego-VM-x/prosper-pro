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

// ==================== MESSAGES ====================

export function subscribeToMessages(
  communityId: string,
  currentUserId: string,
  callback: (messages: CommunityMessage[]) => void,
  pageSize: number = 40
) {
  const q = query(
    collection(db, COMMUNITIES_COLLECTION, communityId, MESSAGES_SUBCOLLECTION),
    orderBy('timestamp', 'desc'),
    limit(pageSize)
  );
  
  let previousCount = 0;
  
  return onSnapshot(q, (snapshot) => {
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
    messages.reverse();
    
    // Detectar mensajes nuevos de otros usuarios para notificación
    if (previousCount > 0 && messages.length > previousCount) {
      const newMessages = messages.slice(previousCount);
      for (const msg of newMessages) {
        if (msg.senderId !== currentUserId) {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`📢 ${msg.senderName}`, {
              body: msg.text.substring(0, 80),
              icon: '/logo-icon.png',
              tag: `channel-${msg.id}`,
            });
          }
          break;
        }
      }
    }
    previousCount = messages.length;
    
    callback(messages);
  }, (error) => {
    console.error('subscribeToMessages error:', error);
    callback([]);
  });
}

export async function sendMessage(communityId: string, message: {
  text: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  replyTo?: string;
}) {
  const utcTimestamp = Date.now();
  await addDoc(collection(db, COMMUNITIES_COLLECTION, communityId, MESSAGES_SUBCOLLECTION), {
    ...message,
    timestamp: utcTimestamp,
    utcOffset: new Date().getTimezoneOffset(),
    likes: [],
  });

  // Enviar notificación a todos los miembros del canal (excepto el remitente)
  try {
    const { addNotification, sendBrowserNotification } = await import('./notifications');
    const { getDocs, query, where, collection } = await import('firebase/firestore');
    const { db } = await import('../firebase');

    const membersRef = collection(db, COMMUNITIES_COLLECTION, communityId, MEMBERS_SUBCOLLECTION);
    const membersQ = query(membersRef, where('uid', '!=', message.senderId));
    const membersSnap = await getDocs(membersQ);

    for (const memberDoc of membersSnap.docs) {
      const member = memberDoc.data();
      if (member.uid) {
        await addNotification({
          ownerId: member.uid,
          title: `📢 Nuevo mensaje en ${communityId}`,
          message: `${message.senderName}: ${message.text.substring(0, 80)}`,
          type: 'channel_message',
          read: false,
        });
      }
    }

    // Notificación del navegador
    sendBrowserNotification(`📢 ${message.senderName}`, message.text.substring(0, 80));
  } catch (e) {
    console.error('Error sending channel notification:', e);
  }
}

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
}

export async function deleteMessage(communityId: string, messageId: string) {
  await deleteDoc(doc(db, COMMUNITIES_COLLECTION, communityId, MESSAGES_SUBCOLLECTION, messageId));
}

// ==================== LOAD MORE (PAGINATION) ====================

export async function loadOlderMessages(communityId: string, lastVisible: DocumentData, pageSize: number = 40): Promise<CommunityMessage[]> {
  const q = query(
    collection(db, COMMUNITIES_COLLECTION, communityId, MESSAGES_SUBCOLLECTION),
    orderBy('timestamp', 'desc'),
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
    });
  });
  return messages.reverse();
}
