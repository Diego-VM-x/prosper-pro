'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '../../components/DashboardLayout';
import { getCourseById } from '@/lib/firestore/courses';
import type { Course } from '@/types';

export default function CourseDetail() {
  const { id } = useParams() as { id: string };
  const [course, setCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (id) {
      getCourseById(id).then(setCourse);
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
        <h2 style={{ fontSize: '1.25rem', marginBottom: 16 }}>Detalles del Curso</h2>
        <p>Categoría: {course.category}</p>
        <p>XP Reward: {course.xpReward}</p>
        <p>Módulos: {course.modulesCount}</p>
      </div>
    </DashboardLayout>
  );
}
