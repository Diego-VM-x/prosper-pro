'use client';

import { useState } from 'react';
import { AnimatedSection } from '../AnimatedSection';

const SECURITY_ITEMS = [
  {
    icon: '🔒',
    title: 'Autenticación segura',
    description: 'Usamos Firebase Authentication con soporte para Google Sign-In, verificación de email y sesiones cifradas.',
  },
  {
    icon: '🛡️',
    title: 'Tus datos son solo tuyos',
    description: 'Cada usuario tiene su propio espacio aislado en Firestore. Nadie más puede ver tus cuentas, metas ni transacciones.',
  },
  {
    icon: '👁️',
    title: 'Perfil privado por defecto',
    description: 'Puedes elegir si tu perfil es público o privado. En modo privado, solo te encuentran por email exacto.',
  },
  {
    icon: '🌐',
    title: 'Conexión cifrada',
    description: 'Toda la comunicación entre tu navegador y nuestros servidores usa HTTPS y TLS. Siempre.',
  },
  {
    icon: '💾',
    title: 'Respaldo en la nube',
    description: 'Tus datos se sincronizan automáticamente en Firebase. Si cambias de dispositivo, todo está ahí.',
  },
  {
    icon: '🚫',
    title: 'Sin anuncios ni trackers',
    description: 'No vendemos tu información. No mostramos anuncios. No usamos cookies de terceros.',
  },
];

export function SecuritySection() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <section id="seguridad" className="landing-security-section lp-section">
      <div className="lp-container">
        <AnimatedSection animationType="fade-up" delay={0}>
          <div className="section-header">
            <span className="section-tag">Seguridad</span>
            <h2 className="section-title">Tu información financiera está protegida</h2>
            <p className="section-desc">Diseñamos Prosper con privacidad y seguridad desde el primer día.</p>
          </div>
        </AnimatedSection>

        <div className="security-grid">
          {SECURITY_ITEMS.map((item, i) => (
            <AnimatedSection key={item.title} animationType="fade-up" delay={i * 80}>
              <div
                className={`security-card ${active === i ? 'active' : ''}`}
                onClick={() => setActive(active === i ? null : i)}
                onMouseEnter={() => setActive(i)}
              >
                <div className="security-icon-wrapper">
                  <span className="security-icon">{item.icon}</span>
                </div>
                <h3>{item.title}</h3>
                <p className={`security-desc ${active === i ? 'expanded' : ''}`}>{item.description}</p>
                <span className="security-hint">{active === i ? '↑' : '↓'}</span>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
