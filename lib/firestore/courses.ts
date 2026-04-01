import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  onSnapshot,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Course, UserCourseProgress } from '@/types';

const COURSES_COLLECTION = 'courses';
const PROGRESS_COLLECTION = 'user_course_progress';

export function subscribeToCourses(callback: (courses: Course[]) => void) {
  return onSnapshot(collection(db, COURSES_COLLECTION), (snapshot) => {
    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
    callback(courses);
  });
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const docSnap = await getDoc(doc(db, COURSES_COLLECTION, courseId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Course;
}

export function subscribeToUserProgress(userId: string, callback: (progress: UserCourseProgress[]) => void) {
  const q = query(collection(db, PROGRESS_COLLECTION), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const progress = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserCourseProgress));
    callback(progress);
  });
}

export async function completeModule(userId: string, courseId: string, moduleId: string) {
  const docRef = doc(db, PROGRESS_COLLECTION, `${userId}_${courseId}`);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    await updateDoc(docRef, {
      completedModules: arrayUnion(moduleId),
      completedAt: Timestamp.now(),
    });
  } else {
    // Si no existe, crear registro inicial
    await setDoc(docRef, {
      userId,
      courseId,
      completedModules: [moduleId],
      startedAt: Timestamp.now(),
    });
  }
}
