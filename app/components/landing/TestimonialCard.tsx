'use client';

import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { AnimatedSection } from '../AnimatedSection';

interface TestimonialItem {
  name: string;
  role: string;
  avatar: string;
  content: string;
  stars: number;
}

export function Testimonials() {
  const { t } = useTranslation('landing');
  const TESTIMONIALS = t('testimonials.items', { returnObjects: true }) as TestimonialItem[];
  return (
    <section className="landing-testimonials-section">
      <div className="landing-testimonials-inner">
        <AnimatedSection animationType="fade-up" delay={0}>
          <div className="section-header">
            <span className="section-tag">{t('testimonials.sectionTag')}</span>
            <h2 className="section-title">{t('testimonials.sectionTitle')}</h2>
            <p className="section-desc">{t('testimonials.sectionDesc')}</p>
          </div>
        </AnimatedSection>

        <div className="testimonials-grid">
          {TESTIMONIALS.map((t, i) => (
            <AnimatedSection key={t.name} animationType="fade-up" delay={i * 100}>
              <div className="testimonial-card">
                <div className="testimonial-stars">
                  {Array.from({ length: t.stars }).map((_, idx) => (
                    <span key={idx}><Star size={14} style={{ color: '#F5B800' }} /></span>
                  ))}
                </div>
                <p className="testimonial-content">“{t.content}”</p>
                <div className="testimonial-author">
                  <span className="testimonial-avatar">{t.avatar}</span>
                  <div>
                    <span className="testimonial-name">{t.name}</span>
                    <span className="testimonial-role">{t.role}</span>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
