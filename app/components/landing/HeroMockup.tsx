'use client';

import { useTranslation } from 'react-i18next';
import { InlineIcon, IconBadge } from '@/app/components/IconMap';

export function HeroMockup() {
  const { t } = useTranslation('landing');
  return (
    <div className="hero-mockup">
      <div className="mockup-header">
        <div className="mockup-dots">
          <span /><span /><span />
        </div>
        <span className="mockup-title">{t('mockup.title')}</span>
      </div>
      <div className="mockup-body">
        <div className="mockup-stat-row">
          <div className="mockup-stat mockup-stat-green">
            <span className="mockup-stat-label">{t('mockup.income')}</span>
            <span className="mockup-stat-value">$2,450</span>
          </div>
          <div className="mockup-stat mockup-stat-red">
            <span className="mockup-stat-label">{t('mockup.expenses')}</span>
            <span className="mockup-stat-value">$1,280</span>
          </div>
          <div className="mockup-stat mockup-stat-blue">
            <span className="mockup-stat-label">{t('mockup.savings')}</span>
            <span className="mockup-stat-value">$620</span>
          </div>
        </div>

        <div className="mockup-chart">
          {[60, 80, 45, 90, 70, 95, 55].map((h, i) => (
            <div key={i} className="mockup-bar" style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>

        <div className="mockup-goals">
          <div className="mockup-goal">
            <span>{t('mockup.emergencyFund')}</span>
            <div className="mockup-goal-bar"><div className="mockup-goal-fill" style={{ width: '72%' }} /></div>
          </div>
          <div className="mockup-goal">
            <span>{t('mockup.vacations')}</span>
            <div className="mockup-goal-bar"><div className="mockup-goal-fill" style={{ width: '45%' }} /></div>
          </div>
        </div>

        <div className="mockup-rate-float">
          <div className="mockup-rate-item">
            <span className="mockup-rate-flag"><InlineIcon icon="Globe" size={16} /></span>
            <span className="mockup-rate-pair">{t('mockup.usdBs')}</span>
            <span className="mockup-rate-value">45.20</span>
          </div>
          <div className="mockup-rate-divider" />
          <div className="mockup-rate-item">
            <span className="mockup-rate-flag"><InlineIcon icon="Diamond" size={16} /></span>
            <span className="mockup-rate-pair">{t('mockup.usdtBs')}</span>
            <span className="mockup-rate-value">46.80</span>
          </div>
        </div>
      </div>
    </div>
  );
}
