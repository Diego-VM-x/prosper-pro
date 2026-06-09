'use client';

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

interface ReleaseVersion {
  version: string;
  date: string;
  preRelease: boolean;
  items: string[];
}

export default function NotasVersionPage() {
  const { t } = useTranslation('ayuda');

  const versions = useMemo<ReleaseVersion[]>(() => {
    try {
      const items = t('releaseNotes.versions', { returnObjects: true });
      if (Array.isArray(items)) return items as ReleaseVersion[];
    } catch {}
    return [];
  }, [t]);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <style jsx>{`
          @keyframes scrollUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes scrollDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
        <div className="notas-page" style={{ maxWidth: '900px', margin: '0 auto', padding: '32px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <h1 className="notas-title" style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '24px', textAlign: 'center', color: 'var(--color-prosper-green)' }}>{t('releaseNotes.title')}</h1>
          <section className="notas-history" style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '16px', borderBottom: '2px solid var(--color-prosper-green)', paddingBottom: '4px' }}>{t('releaseNotes.history')}</h2>
            {versions.map((v, i) => (
              <div key={i} className="notas-item" style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-prosper-green)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <img src="/logo-icon.png" alt="Prosper" width={24} height={24} loading="lazy" style={{ marginRight: '12px' }} />
                  <div>
                    <strong style={{ color: 'var(--color-prosper-green)' }}>{v.version}</strong>
                    {v.preRelease && <span style={{ background: 'var(--color-prosper-green)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', marginLeft: '8px' }}>{t('releaseNotes.preRelease')}</span>}
                  </div>
                </div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>{v.date}</span>
                <ul style={{ marginTop: '8px', paddingLeft: '24px' }}>
                  {v.items.map((note, j) => (<li key={j} style={{ color: 'var(--text-primary)' }}>{note}</li>))}
                </ul>
              </div>
            ))}
          </section>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
