'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import { InlineIcon } from '@/app/components/IconMap';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getCourses, getUserProgressByOwnerId, seedCoursesIfEmpty } from '@/lib/firestore/courses';
import type { Course, UserCourseProgress } from '@/types';
import Link from 'next/link';

export default function CoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [progressList, setProgressList] = useState<UserCourseProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Seed de cursos si no existen
    seedCoursesIfEmpty().catch(console.error);
  }, []);

  useEffect(() => {
    const uid = user?.uid as string;
    let cancelled = false;
    async function loadData() {
      try {
        const [coursesData, progressData] = await Promise.all([
          getCourses(),
          uid ? getUserProgressByOwnerId(uid) : Promise.resolve([]),
        ]);
        if (!cancelled) {
          setCourses(coursesData);
          setProgressList(progressData);
          setLoading(false);
        }
      } catch (e) { console.error(e); setLoading(false); }
    }
    loadData();
    return () => { cancelled = true; };
  }, [user?.uid]);

  const getProgressForCourse = (courseId: string) => {
    return progressList.find(p => p.courseId === courseId);
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Academia Prosper</h1>
          <p className="page-subtitle">Desarrolla tus habilidades financieras con cursos interactivos.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>Cargando cursos...</div>
      ) : courses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>No hay cursos disponibles.</div>
      ) : (
        <div className="courses-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {courses.map((course) => {
            const progress = getProgressForCourse(course.id || '');
            const pct = progress && course.modulesCount > 0
              ? Math.round((progress.completedModules.length / course.modulesCount) * 100)
              : 0;
            const isCompleted = pct === 100;
            const isStarted = progress !== undefined;

            return (
              <div key={course.id} className="card animate-fadeInUp" style={{ overflow: 'hidden' }}>
                <div style={{ position: 'relative' }}>
                  <img src={course.thumbnail} alt={course.title} loading="lazy" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
                  {isCompleted && (
                    <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--color-prosper-green)', color: 'white', padding: '4px 8px', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><InlineIcon icon="CheckCircle2" size={12} /> Completado</div>
                  )}
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{course.category}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-prosper-green)' }}>{course.xpReward} XP</span>
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>{course.title}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 16 }}>{course.description}</p>

                  {isStarted && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{progress?.completedModules.length || 0}/{course.modulesCount} módulos</span>
                        <span style={{ fontWeight: 600, color: 'var(--color-prosper-green)' }}>{pct}%</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: isCompleted ? 'var(--color-prosper-green)' : 'var(--color-pine-500)', borderRadius: 'var(--radius-full)', transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{course.modulesCount} módulos</span>
                    <Link href={`/cursos/${course.id}`} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8125rem' }}>
                      {isStarted ? 'Continuar' : 'Iniciar'}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .courses-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        @media (max-width: 768px) {
          .courses-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
        }
        @media (max-width: 480px) {
          .courses-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </DashboardLayout>
  );
}
