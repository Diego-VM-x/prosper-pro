'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatedSection } from '../AnimatedSection';

interface TestimonialItem {
  name: string;
  role: string;
  avatar: string;
  content: string;
  stars: number;
}

export function TestimonialCarousel() {
  const { t } = useTranslation('landing');
  const TESTIMONIALS = t('testimonials.items', { returnObjects: true }) as TestimonialItem[];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const current = TESTIMONIALS[active];

  return (
    <section className="landing-testimonials-section">
      <div className="landing-testimonials-inner">
        <AnimatedSection animationType="fade-up" delay={0}>
          <div className="section-header">
            <span className="section-tag">Testimonios</span>
            <h2 className="section-title">Lo que dicen nuestros usuarios</h2>
            <p className="section-desc">Miles de personas ya organizan sus finanzas con Prosper Pro.</p>
          </div>
        </AnimatedSection>

        <AnimatedSection animationType="fade-up" delay={100}>
          <div className="testimonial-carousel">
            <div className="testimonial-carousel-card" key={active}>
              <div className="testimonial-stars">
                {Array.from({ length: current.stars }).map((_, i) => (
                  <span key={i}>⭐</span>
                ))}
              </div>
              <p className="testimonial-content">“{current.content}”</p>
              <div className="testimonial-author">
                <span className="testimonial-avatar">{current.avatar}</span>
                <div>
                  <span className="testimonial-name">{current.name}</span>
                  <span className="testimonial-role">{current.role}</span>
                </div>
              </div>
            </div>

            <div className="testimonial-dots">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  className={`testimonial-dot ${i === active ? 'active' : ''}`}
                  onClick={() => setActive(i)}
                  aria-label={t('testimonials.aria.viewTestimonial', { n: i + 1 })}
                />
              ))}
            </div>

            <div className="testimonial-nav">
              <button className="testimonial-nav-btn" onClick={() => setActive((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)} aria-label={t('testimonials.aria.prev')}>
                ←
              </button>
              <button className="testimonial-nav-btn" onClick={() => setActive((prev) => (prev + 1) % TESTIMONIALS.length)} aria-label={t('testimonials.aria.next')}>
                →
              </button>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
