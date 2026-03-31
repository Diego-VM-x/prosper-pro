'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import { subscribeToCourses, subscribeToUserProgress, seedCoursesIfEmpty, startCourse } from '@/lib/firestore/courses';
import type { Course, UserCourseProgress } from '@/types';

const DEFAULT_COURSES: Course[] = [
  { id: 'c1', title: 'Fundamentos de Educación Financiera', description: 'Aprende los conceptos básicos para manejar tu dinero de forma inteligente.', modulesCount: 5, progress: 0, thumbnail: '💰', category: 'Básico', xpReward: 500, createdAt: Date.now() },
  { id: 'c2', title: 'Presupuesto y Ahorro', description: 'Crea un presupuesto efectivo y desarrolla hábitos de ahorro.', modulesCount: 4, progress: 0, thumbnail: '📊', category: 'Básico', xpReward: 400, createdAt: Date.now() - 1000 },
  { id: 'c3', title: 'Introducción a las Inversiones', description: 'Descubre cómo hacer crecer tu dinero con inversiones inteligentes.', modulesCount: 6, progress: 0, thumbnail: '📈', category: 'Intermedio', xpReward: 600, createdAt: Date.now() - 2000 },
  { id: 'c4', title: 'Criptomonedas y Blockchain', description: 'Entiende el mundo de las criptomonedas y la tecnología blockchain.', modulesCount: 5, progress: 0, thumbnail: '₿', category: 'Intermedio', xpReward: 500, createdAt: Date.now() - 3000 },
  { id: 'c5', title: 'Planificación para la Jubilación', description: 'Prepara tu futuro financiero a largo plazo.', modulesCount: 4, progress: 0, thumbnail: '🏖️', category: 'Avanzado', xpReward: 700, createdAt: Date.now() - 4000 },
];

export default function CursosPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>(DEFAULT_COURSES);
  const [userProgress, setUserProgress] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<string>('Todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    try {
      seedCoursesIfEmpty().catch(() => {});
      const unsubCourses = subscribeToCourses((c) => {
        if (c.length) setCourses(c);
        setLoading(false);
      });
      const unsubProgress = subscribeToUserProgress(user.uid, (p) => {
        const progressMap: Record<string, number> = {};
        p.forEach((prog) => {
          progressMap[prog.courseId] = prog.completedModules.length;
        });
        setUserProgress(progressMap);
      });
      return () => { unsubCourses(); unsubProgress(); };
    } catch (e) {
      console.error('Courses load error:', e);
      setLoading(false);
    }
  }, [user?.uid]);

  const categories = ['Todos', 'Básico', 'Intermedio', 'Avanzado'];
  const filteredCourses = filter === 'Todos' ? courses : courses.filter((c) => c.category === filter);

  const handleStartCourse = async (courseId: string) => {
    if (!user?.uid) return;
    await startCourse(user.uid, courseId);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Academia Prosper</h1>
            <p className="page-subtitle">Aprende educación financiera con cursos gamificados.</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="filter-bar">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-btn ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid de cursos */}
        {loading ? (
          <div className="loading-state">Cargando cursos...</div>
        ) : (
          <div className="courses-grid">
            {filteredCourses.map((course) => {
              const completedModules = userProgress[course.id || ''] || 0;
              const progressPct = course.modulesCount > 0 ? Math.round((completedModules / course.modulesCount) * 100) : 0;
              const isStarted = completedModules > 0;
              const isCompleted = progressPct === 100;

              return (
                <div key={course.id} className="course-card">
                  <div className="course-thumbnail">{course.thumbnail}</div>
                  <div className="course-content">
                    <span className={`course-badge badge-${course.category.toLowerCase()}`}>{course.category}</span>
                    <h3 className="course-title">{course.title}</h3>
                    <p className="course-description">{course.description}</p>
                    <div className="course-meta">
                      <span className="course-meta-item">📚 {course.modulesCount} módulos</span>
                      <span className="course-meta-item">⭐ {course.xpReward} XP</span>
                    </div>
                    {isStarted && (
                      <div className="course-progress-bar">
                        <div className="course-progress-fill" style={{ width: `${progressPct}%` }} />
                        <span className="course-progress-text">{progressPct}%</span>
                      </div>
                    )}
                    <button
                      className={`course-btn ${isCompleted ? 'course-btn-completed' : isStarted ? 'course-btn-continue' : 'course-btn-start'}`}
                      onClick={() => handleStartCourse(course.id || '')}
                    >
                      {isCompleted ? '✅ Completado' : isStarted ? '▶ Continuar' : 'Comenzar Curso'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <style>{`
          .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
          .page-header-left { display: flex; flex-direction: column; gap: 4px; }
          .page-title { font-size: 1.75rem; font-weight: 700; color: var(--text-primary); margin: 0; }
          .page-subtitle { font-size: 0.875rem; color: var(--text-secondary); margin: 0; }
          .filter-bar { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
          .filter-btn { padding: 8px 16px; border-radius: var(--radius-full); border: 1px solid var(--border-default); background: var(--bg-card); color: var(--text-secondary); font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
          .filter-btn:hover { border-color: var(--color-prosper-green); color: var(--text-primary); }
          .filter-btn.active { background: var(--color-prosper-green); color: white; border-color: var(--color-prosper-green); }
          .loading-state { text-align: center; padding: 48px; color: var(--text-secondary); font-size: 1rem; }
          .courses-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
          .course-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-xl); overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }
          .course-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
          .course-thumbnail { height: 120px; display: flex; align-items: center; justify-content: center; font-size: 3rem; background: linear-gradient(135deg, var(--bg-input), var(--bg-card)); }
          .course-content { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
          .course-badge { display: inline-block; padding: 4px 10px; border-radius: var(--radius-full); font-size: 0.6875rem; font-weight: 600; width: fit-content; }
          .badge-básico { background: rgba(61, 204, 142, 0.15); color: var(--color-prosper-green); }
          .badge-intermedio { background: rgba(30, 58, 110, 0.15); color: var(--color-pine-500); }
          .badge-avanzado { background: rgba(245, 158, 11, 0.15); color: var(--color-gold-500); }
          .course-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0; }
          .course-description { font-size: 0.8125rem; color: var(--text-secondary); margin: 0; line-height: 1.4; }
          .course-meta { display: flex; gap: 12px; font-size: 0.75rem; color: var(--text-tertiary); }
          .course-meta-item { display: flex; align-items: center; gap: 4px; }
          .course-progress-bar { height: 8px; background: var(--bg-input); border-radius: var(--radius-full); position: relative; overflow: hidden; }
          .course-progress-fill { height: 100%; background: var(--color-prosper-green); border-radius: var(--radius-full); transition: width 0.3s; }
          .course-progress-text { position: absolute; right: 0; top: -18px; font-size: 0.6875rem; font-weight: 600; color: var(--text-secondary); }
          .course-btn { width: 100%; padding: 10px; border: none; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
          .course-btn-start { background: var(--color-prosper-green); color: white; }
          .course-btn-start:hover { background: #2eb87a; }
          .course-btn-continue { background: var(--color-pine-500); color: white; }
          .course-btn-continue:hover { background: #16305a; }
          .course-btn-completed { background: var(--bg-input); color: var(--text-secondary); cursor: default; }
        `}</style>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
