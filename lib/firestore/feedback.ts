import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION = 'feedback';

export interface FeedbackReport {
  id?: string;
  ownerId: string;
  type: 'bug' | 'suggestion';
  message: string;
  page?: string;
  createdAt: number;
}

export async function submitFeedback(feedback: Omit<FeedbackReport, 'id' | 'createdAt'>) {
  await addDoc(collection(db, COLLECTION), {
    ...feedback,
    createdAt: Date.now(),
  });
}

export async function getFeedbackByOwner(ownerId: string): Promise<FeedbackReport[]> {
  const q = query(
    collection(db, COLLECTION),
    where('ownerId', '==', ownerId),
    orderBy('createdAt', 'desc'),
  );
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedbackReport));
  } catch (err) {
    console.error('getFeedbackByOwner error:', err);
    return [];
  }
}
