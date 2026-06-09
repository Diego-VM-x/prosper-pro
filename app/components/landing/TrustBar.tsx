'use client';

import { useTranslation } from 'react-i18next';
import { AnimatedSection } from '../AnimatedSection';
import { AnimatedCounter } from './AnimatedCounter';
import { InlineIcon, IconBadge } from '@/app/components/IconMap';

interface TrustItem {
  icon: string;
  label: string;
  desc: string;
}

interface CounterItem {
  icon: string;
  end: number;
  suffix: string;
  label: string;
}

export function TrustBar() {
  const { t } = useTranslation('landing');
  const TRUST_ITEMS = t('trustBar.items', { returnObjects: true }) as TrustItem[];
  const COUNTERS = t('trustBar.counters', { returnObjects: true }) as CounterItem[];
  return (
    <div className="landing-trust-section">
      <div className="landing-trust-inner">
        <AnimatedSection animationType="fade-up" delay={0}>
          <div className="trust-grid">
            {TRUST_ITEMS.map((item) => (
              <div key={item.label} className="trust-item">
                <span className="trust-icon"><InlineIcon icon={item.icon} size={16} /></span>
                <div className="trust-text">
                  <span className="trust-label">{item.label}</span>
                  <span className="trust-desc">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection animationType="fade-up" delay={150}>
          <div className="trust-counters">
            {COUNTERS.map((c) => (
              <AnimatedCounter key={c.label} {...c} />
            ))}
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
