import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Course, CourseModule, UserCourseProgress } from '@/types';

const COURSES_COLLECTION = 'courses';
const MODULES_COLLECTION = 'course_modules';
const PROGRESS_COLLECTION = 'user_course_progress';

// Cursos
export function subscribeToCourses(callback: (courses: Course[]) => void) {
  const q = query(collection(db, COURSES_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const courses: Course[] = [];
    snapshot.forEach((docSnap) => {
      courses.push({ id: docSnap.id, ...docSnap.data() } as Course);
    });
    callback(courses);
  }, (error) => {
    console.error('subscribeToCourses error:', error);
    callback([]);
  });
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const docSnap = await getDoc(doc(db, COURSES_COLLECTION, courseId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Course;
}

// Módulos
export function subscribeToCourseModules(courseId: string, callback: (modules: CourseModule[]) => void) {
  const q = query(collection(db, MODULES_COLLECTION), where('courseId', '==', courseId), orderBy('order', 'asc'));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const modules: CourseModule[] = [];
    snapshot.forEach((docSnap) => {
      modules.push({ id: docSnap.id, ...docSnap.data() } as CourseModule);
    });
    callback(modules);
  }, (error) => {
    console.error('subscribeToCourseModules error:', error);
    callback([]);
  });
}

// Progreso del usuario
export function subscribeToUserProgress(userId: string, callback: (progress: UserCourseProgress[]) => void) {
  const q = query(collection(db, PROGRESS_COLLECTION), where('userId', '==', userId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const progress: UserCourseProgress[] = [];
    snapshot.forEach((docSnap) => {
      progress.push({ id: docSnap.id, ...docSnap.data() } as UserCourseProgress);
    });
    callback(progress);
  }, (error) => {
    console.error('subscribeToUserProgress error:', error);
    callback([]);
  });
}

export async function getCourseProgress(userId: string, courseId: string): Promise<UserCourseProgress | null> {
  const q = query(collection(db, PROGRESS_COLLECTION), where('userId', '==', userId), where('courseId', '==', courseId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as UserCourseProgress;
}

export async function startCourse(userId: string, courseId: string) {
  const existing = await getCourseProgress(userId, courseId);
  if (existing) return;
  await setDoc(doc(db, PROGRESS_COLLECTION, `${userId}_${courseId}`), {
    userId,
    courseId,
    completedModules: [],
    startedAt: Date.now(),
  });
}

export async function completeModule(userId: string, courseId: string, moduleId: string) {
  const progressId = `${userId}_${courseId}`;
  const progressRef = doc(db, PROGRESS_COLLECTION, progressId);
  const progress = await getCourseProgress(userId, courseId);
  if (!progress) {
    await startCourse(userId, courseId);
  }
  const currentModules = progress?.completedModules || [];
  if (currentModules.includes(moduleId)) return;
  const updatedModules = [...currentModules, moduleId];
  await updateDoc(progressRef, { completedModules: updatedModules });
}

export async function getCourseCompletion(userId: string, courseId: string): Promise<number> {
  const progress = await getCourseProgress(userId, courseId);
  if (!progress) return 0;
  const modulesQ = query(collection(db, MODULES_COLLECTION), where('courseId', '==', courseId));
  const modulesSnap = await getDocs(modulesQ);
  const totalModules = modulesSnap.size;
  if (totalModules === 0) return 0;
  return Math.round((progress.completedModules.length / totalModules) * 100);
}

// Seed de cursos iniciales
export async function seedCoursesIfEmpty() {
  const snapshot = await getDocs(collection(db, COURSES_COLLECTION));
  if (!snapshot.empty) return;

  const courses = [
    {
      title: 'Fundamentos de Educación Financiera',
      description: 'Aprende los conceptos básicos para manejar tu dinero de forma inteligente.',
      modulesCount: 5,
      progress: 0,
      thumbnail: '💰',
      category: 'Básico',
      xpReward: 500,
      createdAt: Date.now(),
    },
    {
      title: 'Presupuesto y Ahorro',
      description: 'Crea un presupuesto efectivo y desarrolla hábitos de ahorro.',
      modulesCount: 4,
      progress: 0,
      thumbnail: '📊',
      category: 'Básico',
      xpReward: 400,
      createdAt: Date.now() - 1000,
    },
    {
      title: 'Introducción a las Inversiones',
      description: 'Descubre cómo hacer crecer tu dinero con inversiones inteligentes.',
      modulesCount: 6,
      progress: 0,
      thumbnail: '📈',
      category: 'Intermedio',
      xpReward: 600,
      createdAt: Date.now() - 2000,
    },
    {
      title: 'Criptomonedas y Blockchain',
      description: 'Entiende el mundo de las criptomonedas y la tecnología blockchain.',
      modulesCount: 5,
      progress: 0,
      thumbnail: '₿',
      category: 'Intermedio',
      xpReward: 500,
      createdAt: Date.now() - 3000,
    },
    {
      title: 'Planificación para la Jubilación',
      description: 'Prepara tu futuro financiero a largo plazo.',
      modulesCount: 4,
      progress: 0,
      thumbnail: '🏖️',
      category: 'Avanzado',
      xpReward: 700,
      createdAt: Date.now() - 4000,
    },
  ];

  for (const course of courses) {
    const docRef = await addDoc(collection(db, COURSES_COLLECTION), course);
    await seedModules(docRef.id, course.modulesCount);
  }
}

async function seedModules(courseId: string, count: number) {
  const moduleTitles: Record<number, string[]> = {
    5: ['Introducción', 'Conceptos Clave', 'Estrategias Prácticas', 'Casos de Estudio', 'Evaluación Final'],
    4: ['Fundamentos', 'Herramientas', 'Plan de Acción', 'Seguimiento'],
    6: ['Introducción', 'Tipos de Inversión', 'Análisis de Riesgo', 'Diversificación', 'Plataformas', 'Tu Primer Portafolio'],
  };
  const titles = moduleTitles[count] || Array.from({ length: count }, (_, i) => `Módulo ${i + 1}`);
  const contents = [
    'En este módulo aprenderás los conceptos fundamentales que necesitas dominar.',
    'Profundizaremos en las técnicas más efectivas utilizadas por expertos.',
    'Aplicaremos lo aprendido en ejercicios prácticos y casos reales.',
    'Analizaremos ejemplos y situaciones comunes para reforzar el conocimiento.',
    'Evaluación final para demostrar lo aprendido y ganar XP.',
    'Cierre del módulo con resumen y próximos pasos.',
  ];

  for (let i = 0; i < count; i++) {
    await addDoc(collection(db, MODULES_COLLECTION), {
      courseId,
      title: titles[i] || `Módulo ${i + 1}`,
      content: contents[i % contents.length],
      duration: 15 + Math.floor(Math.random() * 20),
      order: i + 1,
    });
  }
}
