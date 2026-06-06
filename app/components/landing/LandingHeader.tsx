'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MobileNav } from './MobileNav';

interface LandingHeaderProps {
  user: { uid: string } | null;
}

export function LandingHeader({ user }: LandingHeaderProps) {
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <header className={`landing-header ${scrollY > 50 ? 'scrolled' : ''}`}>
        <div className="landing-header-inner">
          <div className="landing-logo">
            <img src="/logo-icon.png" alt="Prosper" width={36} height={36} />
            <span className="landing-logo-text">Prosper<span className="landing-logo-dot">.</span></span>
          </div>

          <nav className="landing-nav">
            <button className="nav-link" onClick={() => scrollTo('features')}>Funciones</button>
            <button className="nav-link" onClick={() => scrollTo('tutoriales')}>Tutoriales</button>
            <button className="nav-link" onClick={() => scrollTo('how-it-works')}>Cómo Funciona</button>
            <button className="nav-link" onClick={() => scrollTo('faq')}>FAQ</button>
          </nav>

          <div className="landing-header-actions">
            {user ? (
              <button className="btn btn-primary" onClick={() => router.push('/')}>
                Ir al Dashboard
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            ) : (
              <>
                <button className="btn btn-ghost desktop-only" onClick={() => router.push('/login')}>Iniciar Sesión</button>
                <button className="btn btn-primary" onClick={() => router.push('/register')}>Comenzar Gratis</button>
              </>
            )}
            <button
              className="mobile-menu-toggle"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <MobileNav
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        user={user}
        onLogin={() => router.push('/login')}
        onRegister={() => router.push('/register')}
        onDashboard={() => router.push('/')}
      />
    </>
  );
}
