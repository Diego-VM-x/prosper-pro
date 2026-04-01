'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  getCourseById,
  subscribeToCourseModules,
  getUserCourseProgress,
  completeModule,
  enrollCourse,
} from '@/lib/firestore/courses';
import { updateXP } from '@/lib/firestore/gamification';
import type { Course, CourseModule, UserCourseProgress } from '@/types';

export default function CourseDetail() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [progress, setProgress] = useState<UserCourseProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getCourseById(id).then((c) => {
      setCourse(c);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToCourseModules(id, (mods) => {
      setModules(mods);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!user?.uid || !id) return;
    getUserCourseProgress(user.uid, id).then(setProgress);
  }, [user?.uid, id]);

  const handleEnroll = async () => {
    if (!user?.uid || !id) return;
    await enrollCourse(user.uid, id);
    const p = await getUserCourseProgress(user.uid, id);
    setProgress(p);
  };

  const handleCompleteModule = async (moduleId: string) => {
    if (!user?.uid || !id) return;
    await completeModule(user.uid, id, moduleId);
    const p = await getUserCourseProgress(user.uid, id);
    setProgress(p);

    // Si completó todos los módulos, dar XP
    if (p && course && p.completedModules.length + 1 >= course.modulesCount) {
      await updateXP(user.uid, course.xpReward);
    }
  };

  const isModuleCompleted = (moduleId: string) => {
    return progress?.completedModules.includes(moduleId) || false;
  };

  const overallPct = course && progress
    ? Math.round((progress.completedModules.length / course.modulesCount) * 100)
    : 0;

  if (loading || !course) {
    return (
      <DashboardLayout>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>Cargando...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-outline" onClick={() => router.push('/cursos')} style={{ marginBottom: 12, padding: '6px 12px', fontSize: '0.8125rem' }}>
            ← Volver a Cursos
          </button>
          <h1 className="page-title">{course.title}</h1>
          <p className="page-subtitle">{course.description}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-prosper-green)' }}>{course.xpReward} XP</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{course.modulesCount} módulos</span>
        </div>
      </div>

      {/* Progreso general */}
      {progress && (
        <div className="card" style={{ marginBottom: 20, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Tu Progreso</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-prosper-green)' }}>{overallPct}%</span>
          </div>
          <div style={{ height: 8, background: 'var(--bg-input)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${overallPct}%`, background: overallPct === 100 ? 'var(--color-prosper-green)' : 'var(--color-pine-500)', borderRadius: 'var(--radius-full)', transition: 'width 0.5s' }} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 6 }}>
            {progress.completedModules.length} de {course.modulesCount} módulos completados
          </p>
        </div>
      )}

      {/* Botón de inscripción */}
      {!progress && (
        <div className="card" style={{ marginBottom: 20, padding: 20, textAlign: 'center' }}>
          <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>Inscríbete para comenzar este curso y ganar {course.xpReward} XP.</p>
          <button className="btn btn-primary" onClick={handleEnroll}>Inscribirse en el Curso</button>
        </div>
      )}

      {/* Lista de módulos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {modules.map((mod) => {
          const completed = isModuleCompleted(mod.id || '');
          const expanded = expandedModule === mod.id;
          return (
            <div key={mod.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', background: completed ? 'rgba(61, 204, 142, 0.05)' : 'transparent' }}
                onClick={() => setExpandedModule(expanded ? null : mod.id || null)}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: completed ? 'var(--color-prosper-green)' : 'var(--bg-input)',
                  color: completed ? 'white' : 'var(--text-secondary)',
                  fontSize: '0.875rem', fontWeight: 700, marginRight: 12, flexShrink: 0,
                }}>
                  {completed ? '✓' : mod.order}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{mod.title}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>{mod.duration} min</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {completed && (
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-prosper-green)', background: 'rgba(61,204,142,0.1)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>Completado</span>
                  )}
                  <span style={{ fontSize: '1.25rem', color: 'var(--text-tertiary)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                </div>
              </div>

              {expanded && (
                <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid var(--border-default)' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 16 }}>{mod.content}</p>
                  {!completed && progress && (
                    <button
                      className="btn btn-primary"
                      style={{ marginTop: 16, padding: '8px 16px', fontSize: '0.8125rem' }}
                      onClick={() => handleCompleteModule(mod.id || '')}
                    >
                      Marcar como Completado
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .page-header { flex-direction: column !important; }
          .page-header > div:last-child { width: 100%; justify-content: flex-start; }
        }
      `}</style>
    </DashboardLayout>
  );
}
