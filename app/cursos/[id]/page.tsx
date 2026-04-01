'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '../../components/DashboardLayout';
import { getCourseById, getCourseModules } from '@/lib/firestore/courses';
import type { Course, CourseModule } from '@/types';

export default function CourseDetail() {
  const { id } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);

  useEffect(() => {
    if (typeof id === 'string') {
      getCourseById(id).then(setCourse);
      getCourseModules(id).then(setModules);
    }
  }, [id]);

  if (!course) return <DashboardLayout><div>Cargando...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">{course.title}</h1>
        <p className="page-subtitle">{course.description}</p>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: 16 }}>Módulos</h2>
        {modules.map((m, i) => (
          <div key={m.id} className="card" style={{ marginBottom: 12, padding: 16 }}>
            <h3 style={{ fontSize: '1rem' }}>{i + 1}. {m.title}</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{m.duration} min</p>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
