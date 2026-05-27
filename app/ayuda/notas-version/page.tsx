'use client';

import React from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

export default function NotasVersionPage() {
  const versions = [
    { version: '0.8.0', date: '2026-05-26', notes: ['Actualización a BETA 0.8.0 con mejoras de rendimiento.', 'Nuevas herramientas de análisis financiero.'], preRelease: true },
  ];

  const upcoming = [
    { version: '1.5.0', expected: '2024-10-10', notes: ['Integración con Firebase.', 'Modo oscuro personalizable.'] },
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <style jsx>{`
          @keyframes scrollUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes scrollDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
        <style jsx>{`
          @keyframes scrollUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes scrollDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
        <div className="notas-page" style={{ maxWidth: '900px', margin: '0 auto', padding: '32px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <h1 className="notas-title" style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '24px', textAlign: 'center', color: 'var(--color-prosper-green)' }}>📜 Notas de Versión</h1>
          <section className="notas-history" style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '16px', borderBottom: '2px solid var(--color-prosper-green)', paddingBottom: '4px' }}>Historial</h2>
            {versions.map((v, i) => (
              <div key={i} className="notas-item" style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-prosper-green)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <img src="/logo-icon.png" alt="Prosper" width={24} height={24} style={{ marginRight: '12px' }} />
                  <div>
                    <strong style={{ color: 'var(--color-prosper-green)' }}>{v.version}</strong>
                    {v.preRelease && <span style={{ background: 'var(--color-prosper-green)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', marginLeft: '8px' }}>PRE-release</span>}
                  </div>
                </div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>{v.date}</span>
                <ul style={{ marginTop: '8px', paddingLeft: '24px' }}>
                  {v.notes.map((note, j) => (<li key={j} style={{ color: 'var(--text-primary)' }}>{note}</li>))}
                </ul>
              </div>
            ))}
          </section>
          <section className="notas-upcoming">
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '16px', borderBottom: '2px solid var(--color-prosper-green)', paddingBottom: '4px' }}>Próximas Actualizaciones</h2>
            {upcoming.map((u, i) => (
              <div key={i} className="notas-item" style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-prosper-green)' }}>
                <strong style={{ color: 'var(--color-prosper-green)' }}>{u.version}</strong> – estimado <span style={{ color: 'var(--text-secondary)' }}>{u.expected}</span>
                <ul style={{ marginTop: '8px', paddingLeft: '24px' }}>
                  {u.notes.map((note, j) => (<li key={j} style={{ color: 'var(--text-primary)' }}>{note}</li>))}
                </ul>
              </div>
            ))}
          </section>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
