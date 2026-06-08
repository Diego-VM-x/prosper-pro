import { db, collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc, onSnapshot, arrayUnion } from '../firebase';
import type { Course, UserCourseProgress, CourseModule } from '@/types';

const COURSES_COLLECTION = 'courses';
const MODULES_COLLECTION = 'course_modules';
const PROGRESS_COLLECTION = 'user_course_progress';

// Suscribirse a todos los cursos (colección global)
export function subscribeToCourses(callback: (courses: Course[]) => void) {
  return onSnapshot(collection(db, COURSES_COLLECTION), (snapshot) => {
    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
    callback(courses);
  });
}

// Suscribirse a módulos de un curso
export function subscribeToCourseModules(courseId: string, callback: (modules: CourseModule[]) => void) {
  const q = query(collection(db, MODULES_COLLECTION), where('courseId', '==', courseId));
  return onSnapshot(q, (snapshot) => {
    const modules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseModule));
    modules.sort((a, b) => a.order - b.order);
    callback(modules);
  });
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const docSnap = await getDoc(doc(db, COURSES_COLLECTION, courseId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Course;
}

export async function getCourses(): Promise<Course[]> {
  const snapshot = await getDocs(collection(db, COURSES_COLLECTION));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
}

export async function getUserProgressByOwnerId(ownerId: string): Promise<UserCourseProgress[]> {
  const q = query(collection(db, PROGRESS_COLLECTION), where('ownerId', '==', ownerId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserCourseProgress));
}

export async function getCourseModules(courseId: string): Promise<CourseModule[]> {
  const q = query(collection(db, MODULES_COLLECTION), where('courseId', '==', courseId));
  const snapshot = await getDocs(q);
  const modules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseModule));
  modules.sort((a, b) => a.order - b.order);
  return modules;
}

export function subscribeToUserProgress(ownerId: string, callback: (progress: UserCourseProgress[]) => void) {
  const q = query(collection(db, PROGRESS_COLLECTION), where('ownerId', '==', ownerId));
  return onSnapshot(q, (snapshot) => {
    const progress = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserCourseProgress));
    callback(progress);
  });
}

// Obtener progreso de un curso específico
export async function getUserCourseProgress(ownerId: string, courseId: string): Promise<UserCourseProgress | null> {
  const q = query(collection(db, PROGRESS_COLLECTION), where('ownerId', '==', ownerId), where('courseId', '==', courseId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as UserCourseProgress;
}

// Inscribirse en un curso
export async function enrollCourse(ownerId: string, courseId: string) {
  const docId = `${ownerId}_${courseId}`;
  await setDoc(doc(db, PROGRESS_COLLECTION, docId), {
    ownerId,
    courseId,
    completedModules: [],
    startedAt: Date.now(),
  });
}

// Completar módulo
export async function completeModule(ownerId: string, courseId: string, moduleId: string) {
  const docRef = doc(db, PROGRESS_COLLECTION, `${ownerId}_${courseId}`);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    await updateDoc(docRef, {
      completedModules: arrayUnion(moduleId),
    });
  } else {
    await setDoc(docRef, {
      ownerId,
      courseId,
      completedModules: [moduleId],
      startedAt: Date.now(),
    });
  }
}

// Sin cursos por defecto - el administrador los crea manualmente
export async function seedCoursesIfEmpty() {
  // No crear cursos automáticamente
  return;
}
