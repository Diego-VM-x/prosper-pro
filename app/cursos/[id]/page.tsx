import CourseDetailClient from './CourseDetailClient';

export async function generateStaticParams() {
  try {
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');

    if (getApps().length === 0) {
      const serviceAccountPath = resolve(process.cwd(), 'prospeweb-firebase-adminsdk-fbsvc-3285f1b0c8.json');
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
      initializeApp({ credential: cert(serviceAccount) });
    }

    const db = getFirestore();
    const snapshot = await db.collection('courses').get();
    return snapshot.docs.map(doc => ({ id: doc.id }));
  } catch {
    return [{ id: '_placeholder' }];
  }
}

export default function CourseDetailPage() {
  return <CourseDetailClient />;
}
