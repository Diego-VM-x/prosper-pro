import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { ExpenseRequest, RequestStatus } from '@/types';

const COLLECTION = 'expense_requests';

// Enviar solicitud de gasto compartido
export async function sendExpenseRequest(request: Omit<ExpenseRequest, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...request,
    createdAt: Date.now(),
  });
  return docRef.id;
}

// Responder solicitud (aceptar/rechazar)
export async function respondToRequest(requestId: string, status: 'accepted' | 'rejected') {
  await updateDoc(doc(db, COLLECTION, requestId), {
    status,
    respondedAt: Date.now(),
  });
}

// Cancelar solicitud (solo el emisor)
export async function cancelRequest(requestId: string) {
  await updateDoc(doc(db, COLLECTION, requestId), {
    status: 'cancelled',
    respondedAt: Date.now(),
  });
}

// Eliminar solicitud
export async function deleteRequest(requestId: string) {
  await deleteDoc(doc(db, COLLECTION, requestId));
}

// Suscribirse a solicitudes ENVIADAS por el usuario
export function subscribeToSentRequests(ownerId: string, callback: (requests: ExpenseRequest[]) => void) {
  const q = query(collection(db, COLLECTION), where('fromOwnerId', '==', ownerId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const requests: ExpenseRequest[] = [];
    snapshot.forEach((docSnap) => {
      requests.push({ id: docSnap.id, ...docSnap.data() } as ExpenseRequest);
    });
    requests.sort((a, b) => b.createdAt - a.createdAt);
    callback(requests);
  }, (error) => {
    console.error('subscribeToSentRequests error:', error);
    callback([]);
  });
}

// Suscribirse a solicitudes RECIBIDAS por el usuario
export function subscribeToReceivedRequests(ownerId: string, callback: (requests: ExpenseRequest[]) => void) {
  const q = query(collection(db, COLLECTION), where('toOwnerId', '==', ownerId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const requests: ExpenseRequest[] = [];
    snapshot.forEach((docSnap) => {
      requests.push({ id: docSnap.id, ...docSnap.data() } as ExpenseRequest);
    });
    requests.sort((a, b) => b.createdAt - a.createdAt);
    callback(requests);
  }, (error) => {
    console.error('subscribeToReceivedRequests error:', error);
    callback([]);
  });
}

// Obtener solicitudes enviadas
export async function getSentRequests(ownerId: string): Promise<ExpenseRequest[]> {
  const q = query(collection(db, COLLECTION), where('fromOwnerId', '==', ownerId));
  const snapshot = await getDocs(q);
  const requests: ExpenseRequest[] = [];
  snapshot.forEach((docSnap) => {
    requests.push({ id: docSnap.id, ...docSnap.data() } as ExpenseRequest);
  });
  return requests;
}

// Obtener solicitudes recibidas
export async function getReceivedRequests(ownerId: string): Promise<ExpenseRequest[]> {
  const q = query(collection(db, COLLECTION), where('toOwnerId', '==', ownerId));
  const snapshot = await getDocs(q);
  const requests: ExpenseRequest[] = [];
  snapshot.forEach((docSnap) => {
    requests.push({ id: docSnap.id, ...docSnap.data() } as ExpenseRequest);
  });
  return requests;
}

// Obtener solicitudes de un plan específico
export async function getRequestsByPlan(planId: string): Promise<ExpenseRequest[]> {
  const q = query(collection(db, COLLECTION), where('planId', '==', planId));
  const snapshot = await getDocs(q);
  const requests: ExpenseRequest[] = [];
  snapshot.forEach((docSnap) => {
    requests.push({ id: docSnap.id, ...docSnap.data() } as ExpenseRequest);
  });
  return requests;
}

// Obtener solicitudes pendientes recibidas
export async function getPendingReceivedRequests(ownerId: string): Promise<ExpenseRequest[]> {
  const q = query(collection(db, COLLECTION), where('toOwnerId', '==', ownerId), where('status', '==', 'pending'));
  const snapshot = await getDocs(q);
  const requests: ExpenseRequest[] = [];
  snapshot.forEach((docSnap) => {
    requests.push({ id: docSnap.id, ...docSnap.data() } as ExpenseRequest);
  });
  return requests;
}

// Buscar usuario por email (para enviar solicitud)
export async function searchUserByEmail(email: string) {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const data = snapshot.docs[0].data();
  return { uid: snapshot.docs[0].id, ...data };
}
