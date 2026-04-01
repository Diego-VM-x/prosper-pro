import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  query,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { CommunityMember } from '@/types';

const COLLECTION = 'community_members';

export function subscribeToCommunityMembers(callback: (members: CommunityMember[]) => void) {
  const q = query(collection(db, COLLECTION));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const members: CommunityMember[] = [];
    snapshot.forEach((docSnap) => {
      members.push({ id: docSnap.id, ...docSnap.data() } as CommunityMember);
    });
    callback(members);
  }, (error) => {
    console.error('subscribeToCommunityMembers error:', error);
    callback([]);
  });
}

export async function addCommunityMember(member: Omit<CommunityMember, 'id'>) {
  const docRef = await addDoc(collection(db, COLLECTION), member);
  return docRef.id;
}

export async function deleteCommunityMember(memberId: string) {
  await deleteDoc(doc(db, COLLECTION, memberId));
}
