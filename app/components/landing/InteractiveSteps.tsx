'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatedSection } from '../AnimatedSection';

interface StepItem {
  n: number;
  icon: string;
  title: string;
  description: string;
  details: string[];
}

export function InteractiveSteps() {
  const { t } = useTranslation('landing');
  const STEPS = t('howItWorks.steps', { returnObjects: true }) as StepItem[];
  const [active, setActive] = useState(0);

  return (
    <section id="how-it-works" className="landing-how-section lp-section">
      <div className="lp-container">
        <AnimatedSection animationType="fade-up" delay={0}>
          <div className="section-header">
            <span className="section-tag">Cómo Funciona</span>
            <h2 className="section-title">Empieza en 4 simples pasos</h2>
            <p className="section-desc">Sin configuraciones complicadas. Haz clic en cada paso para explorar.</p>
          </div>
        </AnimatedSection>

        <div className="interactive-steps">
          <div className="steps-sidebar">
            {STEPS.map((step, i) => (
              <AnimatedSection key={step.n} animationType="fade-right" delay={i * 100}>
                <button
                  className={`step-button ${active === i ? 'active' : ''}`}
                  onClick={() => setActive(i)}
                >
                  <span className="step-button-number">{step.n}</span>
                  <div className="step-button-text">
                    <span className="step-button-title">{step.title}</span>
                    <span className="step-button-desc">{step.description.slice(0, 50)}...</span>
                  </div>
                </button>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection animationType="fade-up" delay={200} key={active}>
            <div className="step-detail-card">
              <div className="step-detail-icon">{STEPS[active].icon}</div>
              <h3>{STEPS[active].title}</h3>
              <p>{STEPS[active].description}</p>
              <ul className="step-detail-list">
                {STEPS[active].details.map((d) => (
                  <li key={d}>✓ {d}</li>
                ))}
              </ul>
              <div className="step-progress">
                <div className="step-progress-bar">
                  <div className="step-progress-fill" style={{ width: `${((active + 1) / STEPS.length) * 100}%` }} />
                </div>
                <span>{t('howItWorks.stepProgress', { current: active + 1, total: STEPS.length })}</span>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
