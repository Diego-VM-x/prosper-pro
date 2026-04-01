'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { subscribeToCourses } from '@/lib/firestore/courses';
import type { Course } from '@/types';
import Link from 'next/link';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToCourses((data) => {
      setCourses(data);
    });
    return () => unsubscribe();
  }, []);

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Academia Prosper</h1>
        <p className="page-subtitle">Desarrolla tus habilidades financieras.</p>
      </div>

      <div className="courses-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {courses.map((course) => (
          <div key={course.id} className="card animate-fadeInUp">
            <img src={course.thumbnail} alt={course.title} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
            <div style={{ padding: 16 }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 8 }}>{course.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 16 }}>{course.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-primary">{course.xpReward} XP</span>
                <Link href={`/cursos/${course.id}`} className="btn btn-outline" style={{ padding: '8px 16px' }}>
                  Ver curso
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
