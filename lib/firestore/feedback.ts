import { db, collection, doc, addDoc, getDocs, query, where, orderBy } from '../firebase';

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
    where('ownerId', '==', ownerId)
  );
  try {
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedbackReport));
    return docs.sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    console.error('getFeedbackByOwner error:', err);
    return [];
  }
}
