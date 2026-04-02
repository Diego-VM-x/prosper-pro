import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';

/** Conexión entre dos usuarios (amistad) */
export interface CommunityConnection {
  id: string;
  userId: string;       // quien envió la solicitud
  friendId: string;     // quien recibió
  status: 'pending' | 'accepted';
  createdAt: number;
}

/** Usuario de la comunidad con datos públicos */
export interface CommunityUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  level: number;
  title: string;
  currentXP: number;
  maxXP: number;
  achievementsCount: number;
  goalsCount: number;
}

/** Suscribirse a todos los usuarios registrados (comunidad pública) */
export function subscribeToCommunityUsers(callback: (users: CommunityUser[]) => void) {
  const usersCol = collection(db, 'users');
  const xpCol = collection(db, 'xp_states');
  const achievementsCol = collection(db, 'achievements');
  const goalsCol = collection(db, 'goals');

  // Suscripción a usuarios
  return onSnapshot(usersCol, async (usersSnap) => {
    const users: CommunityUser[] = [];

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const uid = userDoc.id;

      // Obtener XP
      const xpQ = query(xpCol, where('ownerId', '==', uid));
      const xpSnap = await getDocs(xpQ);
      const xpData = xpSnap.empty ? null : (xpSnap.docs[0].data() as { level?: number; title?: string; currentXP?: number; maxXP?: number });

      // Obtener logros
      const achQ = query(achievementsCol, where('ownerId', '==', uid));
      const achSnap = await getDocs(achQ);

      // Obtener metas
      const goalsQ = query(goalsCol, where('ownerId', '==', uid));
      const goalsSnap = await getDocs(goalsQ);

      users.push({
        uid,
        displayName: userData.displayName || null,
        email: userData.email || null,
        photoURL: userData.photoURL || null,
        level: xpData?.level ?? 1,
        title: xpData?.title ?? 'Novato',
        currentXP: xpData?.currentXP ?? 0,
        maxXP: xpData?.maxXP ?? 1000,
        achievementsCount: achSnap.size,
        goalsCount: goalsSnap.size,
      });
    }

    // Ordenar por nivel y XP
    users.sort((a, b) => b.level - a.level || b.currentXP - a.currentXP);
    callback(users);
  }, (error) => {
    console.error('subscribeToCommunityUsers error:', error);
    callback([]);
  });
}

/** Obtener usuarios de la comunidad (una sola lectura, sin suscripción) */
export async function getCommunityUsers(): Promise<CommunityUser[]> {
  const usersCol = collection(db, 'users');
  const xpCol = collection(db, 'xp_states');
  const achievementsCol = collection(db, 'achievements');
  const goalsCol = collection(db, 'goals');

  // Leer todo en paralelo para evitar N+1
  const [usersSnap, xpSnap, achSnap, goalsSnap] = await Promise.all([
    getDocs(usersCol),
    getDocs(xpCol),
    getDocs(achievementsCol),
    getDocs(goalsCol),
  ]);

  // Indexar por ownerId
  const xpMap = new Map<string, { level?: number; title?: string; currentXP?: number; maxXP?: number }>();
  xpSnap.forEach((d) => {
    const data = d.data();
    xpMap.set(data.ownerId, data);
  });

  const achCountMap = new Map<string, number>();
  achSnap.forEach((d) => {
    const data = d.data();
    achCountMap.set(data.ownerId, (achCountMap.get(data.ownerId) || 0) + 1);
  });

  const goalsCountMap = new Map<string, number>();
  goalsSnap.forEach((d) => {
    const data = d.data();
    goalsCountMap.set(data.ownerId, (goalsCountMap.get(data.ownerId) || 0) + 1);
  });

  const users: CommunityUser[] = [];
  usersSnap.forEach((userDoc) => {
    const userData = userDoc.data();
    const uid = userDoc.id;
    const xpData = xpMap.get(uid);

    users.push({
      uid,
      displayName: userData.displayName || null,
      email: userData.email || null,
      photoURL: userData.photoURL || null,
      level: xpData?.level ?? 1,
      title: xpData?.title ?? 'Novato',
      currentXP: xpData?.currentXP ?? 0,
      maxXP: xpData?.maxXP ?? 1000,
      achievementsCount: achCountMap.get(uid) ?? 0,
      goalsCount: goalsCountMap.get(uid) ?? 0,
    });
  });

  users.sort((a, b) => b.level - a.level || b.currentXP - a.currentXP);
  return users;
}

/** Enviar solicitud de amistad */
export async function sendFriendRequest(userId: string, friendId: string) {
  if (userId === friendId) return;
  const q = query(
    collection(db, 'community_connections'),
    where('userId', '==', userId),
    where('friendId', '==', friendId)
  );
  const existing = await getDocs(q);
  if (!existing.empty) return;

  await addDoc(collection(db, 'community_connections'), {
    userId,
    friendId,
    status: 'pending',
    createdAt: Date.now(),
  });
}

/** Aceptar solicitud de amistad */
export async function acceptFriendRequest(connectionId: string) {
  const { updateDoc } = await import('firebase/firestore');
  await updateDoc(doc(db, 'community_connections', connectionId), { status: 'accepted' });
}

/** Eliminar conexión */
export async function removeConnection(connectionId: string) {
  await deleteDoc(doc(db, 'community_connections', connectionId));
}

/** Suscribirse a solicitudes de amistad pendientes para un usuario */
export function subscribeToFriendRequests(userId: string, callback: (requests: CommunityConnection[]) => void) {
  const q = query(
    collection(db, 'community_connections'),
    where('friendId', '==', userId),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, (snapshot) => {
    const requests: CommunityConnection[] = [];
    snapshot.forEach((d) => requests.push({ id: d.id, ...d.data() } as CommunityConnection));
    callback(requests);
  }, (error) => {
    console.error('subscribeToFriendRequests error:', error);
    callback([]);
  });
}
