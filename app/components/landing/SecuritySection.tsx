'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatedSection } from '../AnimatedSection';
import { InlineIcon, IconBadge } from '@/app/components/IconMap';

interface SecurityItem {
  icon: string;
  title: string;
  description: string;
}

export function SecuritySection() {
  const { t } = useTranslation('landing');
  const SECURITY_ITEMS = t('security.items', { returnObjects: true }) as SecurityItem[];
  const [active, setActive] = useState<number | null>(null);

  return (
    <section id="seguridad" className="landing-security-section lp-section">
      <div className="lp-container">
        <AnimatedSection animationType="fade-up" delay={0}>
          <div className="section-header">
            <span className="section-tag">{t('security.sectionTag')}</span>
            <h2 className="section-title">{t('security.sectionTitle')}</h2>
            <p className="section-desc">{t('security.sectionDesc')}</p>
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
                  <span className="security-icon"><InlineIcon icon={item.icon} size={16} /></span>
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
