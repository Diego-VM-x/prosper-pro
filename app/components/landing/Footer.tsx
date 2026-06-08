'use client';

import { useRouter } from 'next/navigation';
import { NewsletterForm } from './NewsletterForm';

interface FooterProps {
  user: { uid: string } | null;
}

export function Footer({ user }: FooterProps) {
  const router = useRouter();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">
            <img src="/logo-icon.png" alt="Prosper" width={28} height={28} />
            <span>Prosper<span className="footer-dot">.</span></span>
          </div>
          <p>Tu plataforma de libertad financiera. Gestiona, ahorra, aprende y crece con nosotros.</p>
          <div className="footer-socials">
            <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter" className="footer-social">𝕏</a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="footer-social">📸</a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="footer-social">💼</a>
          </div>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h4>Producto</h4>
            <button onClick={() => scrollTo('features')}>Funciones</button>
            <button onClick={() => scrollTo('demo')}>Demo</button>
            <button onClick={() => scrollTo('tutoriales')}>Tutoriales</button>
            <button onClick={() => scrollTo('how-it-works')}>Cómo Funciona</button>
          </div>
          <div className="footer-col">
            <h4>Recursos</h4>
            <button onClick={() => scrollTo('faq')}>Preguntas Frecuentes</button>
            <button onClick={() => scrollTo('seguridad')}>Seguridad</button>
            <button onClick={() => router.push('/ayuda')}>Centro de Ayuda</button>
            <button onClick={() => router.push('/ayuda/notas-version')}>Notas de Versión</button>
          </div>
          <div className="footer-col">
            <h4>Cuenta</h4>
            {user ? (
              <button onClick={() => router.push('/')}>Dashboard</button>
            ) : (
              <>
                <button onClick={() => router.push('/login')}>Iniciar Sesión</button>
                <button onClick={() => router.push('/register')}>Registrarse</button>
              </>
            )}
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <button onClick={() => router.push('/ayuda')}>Términos de Uso</button>
            <button onClick={() => router.push('/ayuda')}>Privacidad</button>
          </div>
        </div>

        <div className="footer-newsletter">
          <h4>Recibe consejos financieros</h4>
          <p>Tips mensuales para mejorar tus finanzas personales.</p>
          <NewsletterForm />
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 Prosper Pro. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
