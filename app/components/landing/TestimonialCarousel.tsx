'use client';

import { useEffect, useState } from 'react';
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
  {
    name: 'Luis M.',
    role: 'Ingeniero',
    avatar: '👨‍🔧',
    content: 'Compartir gastos con mi familia nunca fue tan fácil. Cada uno ve su parte y yo tengo el control total.',
    stars: 5,
  },
  {
    name: 'Sofía T.',
    role: 'Contadora',
    avatar: '👩‍💼',
    content: 'Recomiendo Prosper a todos mis clientes. La multi-moneda y el calendario de vencimientos son indispensables.',
    stars: 5,
  },
  {
    name: 'Daniel K.',
    role: 'Trader',
    avatar: '👨‍💻',
    content: 'El modo P2P para cripto es exacto. Comparado con otros apps, Prosper tiene las tasas más actualizadas del mercado.',
    stars: 5,
  },
];

export function TestimonialCarousel() {
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
                  aria-label={`Ver testimonio ${i + 1}`}
                />
              ))}
            </div>

            <div className="testimonial-nav">
              <button className="testimonial-nav-btn" onClick={() => setActive((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)} aria-label="Anterior">
                ←
              </button>
              <button className="testimonial-nav-btn" onClick={() => setActive((prev) => (prev + 1) % TESTIMONIALS.length)} aria-label="Siguiente">
                →
              </button>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
