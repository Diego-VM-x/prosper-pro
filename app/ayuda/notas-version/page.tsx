import React from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

export default function NotasVersionPage() {
  const versions = [
    { version: '0.8.0', date: '2026-05-26', notes: ['Actualización a BETA 0.8.0 con mejoras de rendimiento.', 'Nuevas herramientas de análisis financiero.'] },
    { version: '1.4.2', date: '2024-09-15', notes: ['Mejoras en el rendimiento del dashboard.', 'Corrección de bugs menores en VEPay.'] },
    { version: '1.4.0', date: '2024-08-30', notes: ['Nuevo modal de actualización persistente.', 'Sección "Notas de Versión" añadida.'] },
    { version: '1.3.5', date: '2024-07-20', notes: ['Actualización de la librería de íconos.', 'Mejoras UI en la sección de ayuda.'] },
  ];

  const upcoming = [
    { version: '1.5.0', expected: '2024-10-10', notes: ['Integración con Firebase.', 'Modo oscuro personalizable.'] },
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="notas-page" style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
          <h1 className="notas-title" style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '16px' }}>Notas de Versión</h1>
          <section className="notas-history" style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '12px' }}>Historial</h2>
            {versions.map((v, i) => (
              <div key={i} className="notas-item" style={{ marginBottom: '12px' }}>
                <strong>{v.version}</strong> – {v.date}
                <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
                  {v.notes.map((note, j) => (<li key={j}>{note}</li>))}
                </ul>
              </div>
            ))}
          </section>
          <section className="notas-upcoming">
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '12px' }}>Próximas Actualizaciones</h2>
            {upcoming.map((u, i) => (
              <div key={i} className="notas-item" style={{ marginBottom: '12px' }}>
                <strong>{u.version}</strong> – estimado {u.expected}
                <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
                  {u.notes.map((note, j) => (<li key={j}>{note}</li>))}
                </ul>
              </div>
            ))}
          </section>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
