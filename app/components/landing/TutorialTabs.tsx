'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatedSection } from '../AnimatedSection';
import { InlineIcon, IconBadge } from '@/app/components/IconMap';

const TUTORIAL_MOCKUPS = [
  (
    <div className="tutorial-mockup">
      <div className="tm-row">
        <div className="tm-badge green">Ingreso</div>
        <span className="tm-text">Salario mensual</span>
        <span className="tm-amount">+$1,200</span>
      </div>
      <div className="tm-row">
        <div className="tm-badge red">Gasto</div>
        <span className="tm-text">Supermercado</span>
        <span className="tm-amount">-$85.50</span>
      </div>
      <div className="tm-row">
        <div className="tm-badge blue">Ahorro</div>
        <span className="tm-text">Fondo emergencia</span>
        <span className="tm-amount">+$200</span>
      </div>
    </div>
  ),
  (
    <div className="tutorial-mockup">
      <div className="tm-goal">
        <div className="tm-goal-header">
          <span><InlineIcon icon="Car" size={16} /> Auto nuevo</span>
          <span>65%</span>
        </div>
        <div className="tm-goal-bar"><div className="tm-goal-fill" style={{ width: '65%' }} /></div>
        <div className="tm-goal-meta">$3,250 / $5,000 · vence en 4 meses</div>
      </div>
    </div>
  ),
  (
    <div className="tutorial-mockup">
      <div className="tm-receipt">
        <div className="tm-receipt-row"><span>Banco</span><span>Banesco</span></div>
        <div className="tm-receipt-row"><span>Monto</span><span>$120.00</span></div>
        <div className="tm-receipt-row"><span>Ref.</span><span>00992344</span></div>
        <div className="tm-receipt-row"><span>Fecha</span><span>06/06/2026</span></div>
        <div className="tm-receipt-status"><InlineIcon icon="CheckCircle2" size={16} /> Datos verificados</div>
      </div>
    </div>
  ),
  (
    <div className="tutorial-mockup">
      <div className="tm-toggle-row">
        <span className="tm-toggle-label">Tasa USDT</span>
        <div className="tm-toggle-pills">
          <span className="tm-pill">Oficial 45.20</span>
          <span className="tm-pill active">P2P 46.80</span>
        </div>
      </div>
      <div className="tm-toggle-row">
        <span className="tm-toggle-label">Tasa BTC</span>
        <div className="tm-toggle-pills">
          <span className="tm-pill">Oficial 4,520,000</span>
          <span className="tm-pill active">P2P 4,680,000</span>
        </div>
      </div>
    </div>
  ),
];

interface TutorialItem {
  id: string;
  icon: string;
  title: string;
  steps: string[];
}

export function TutorialTabs() {
  const { t } = useTranslation('landing');
  const TUTORIALS_DATA = t('tutorials.items', { returnObjects: true }) as TutorialItem[];
  const TUTORIALS = TUTORIALS_DATA.map((item, i) => ({
    ...item,
    mockup: TUTORIAL_MOCKUPS[i],
  }));

  const [active, setActive] = useState(TUTORIALS[0].id);
  const current = TUTORIALS.find((t) => t.id === active) || TUTORIALS[0];

  return (
    <section id="tutoriales" className="landing-tutorials-section">
      <div className="landing-tutorials-inner">
        <AnimatedSection animationType="fade-up" delay={0}>
          <div className="section-header">
            <span className="section-tag">{t('tutorials.sectionTag')}</span>
            <h2 className="section-title">{t('tutorials.sectionTitle')}</h2>
            <p className="section-desc">{t('tutorials.sectionDesc')}</p>
          </div>
        </AnimatedSection>

        <AnimatedSection animationType="fade-up" delay={100}>
          <div className="tutorials-tabs">
            {TUTORIALS.map((tItem) => (
              <button
                key={tItem.id}
                className={`tutorial-tab ${active === tItem.id ? 'active' : ''}`}
                onClick={() => setActive(tItem.id)}
              >
                <span className="tutorial-tab-icon"><InlineIcon icon={tItem.icon} size={16} /></span>
                <span className="tutorial-tab-title">{tItem.title}</span>
              </button>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection animationType="fade-up" delay={200}>
          <div className="tutorial-panel">
            <div className="tutorial-steps">
              {current.steps.map((s, idx) => (
                <div key={idx} className="tutorial-step">
                  <div className="tutorial-step-number">{idx + 1}</div>
                  <p className="tutorial-step-text">{s}</p>
                </div>
              ))}
            </div>
            <div className="tutorial-visual">{current.mockup}</div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
