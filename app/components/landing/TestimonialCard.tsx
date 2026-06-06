'use client';

import { AnimatedSection } from '../AnimatedSection';

const TESTIMONIALS = [
  {
    name: 'Mariana R.',
    role: 'Freelancer',
    avatar: '👩‍💻',
    content: 'Prosper me ayudó a organizar mis ingresos en USD y BS. Las tasas en tiempo real son exactas y el dashboard es súper claro.',
    stars: 5,
  },
  {
    name: 'Carlos G.',
    role: 'Emprendedor',
    avatar: '👨‍💼',
    content: 'El VEPay OCR me ahorra horas cada semana. Subo las capturas de mis pagos y Prosper extrae todo automáticamente.',
    stars: 5,
  },
  {
    name: 'Andrea P.',
    role: 'Estudiante',
    avatar: '👩‍🎓',
    content: 'Los cursos de la Academia son prácticos y cortos. Por primera vez entiendo cómo administrar mi dinero.',
    stars: 5,
  },
];

export function Testimonials() {
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

        <div className="testimonials-grid">
          {TESTIMONIALS.map((t, i) => (
            <AnimatedSection key={t.name} animationType="fade-up" delay={i * 100}>
              <div className="testimonial-card">
                <div className="testimonial-stars">
                  {Array.from({ length: t.stars }).map((_, idx) => (
                    <span key={idx}>⭐</span>
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
