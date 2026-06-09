'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatedSection } from '../AnimatedSection';

interface FaqItem {
  q: string;
  a: string;
}

export function FaqAccordion() {
  const { t } = useTranslation('landing');
  const FAQS = t('faq.items', { returnObjects: true }) as FaqItem[];
  const [open, setOpen] = useState<string | null>(FAQS[0]?.q || null);

  return (
    <section id="faq" className="landing-faq-section">
      <div className="landing-faq-inner">
        <AnimatedSection animationType="fade-up" delay={0}>
          <div className="section-header">
            <span className="section-tag">FAQ</span>
            <h2 className="section-title">Preguntas frecuentes</h2>
            <p className="section-desc">Todo lo que necesitas saber antes de empezar.</p>
          </div>
        </AnimatedSection>

        <div className="faq-list">
          {FAQS.map((faq, i) => {
            const isOpen = open === faq.q;
            return (
              <AnimatedSection key={faq.q} animationType="fade-up" delay={i * 50}>
                <div className={`faq-item ${isOpen ? 'open' : ''}`}>
                  <button
                    className="faq-question"
                    onClick={() => setOpen(isOpen ? null : faq.q)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <span className="faq-chevron">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </button>
                  <div className="faq-answer">
                    <p>{faq.a}</p>
                  </div>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
