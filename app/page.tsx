export default function Home() {
  return (
    <main>
      {/* Navegación Glassmorphism */}
      <nav className="glass-nav animate-fade-in">
        <div style={{ fontWeight: 900, fontSize: '1.5rem', color: 'var(--navy)', letterSpacing: '-0.05em' }}>
          Prosper<span style={{ color: 'var(--mint)' }}>.</span>
        </div>
      </nav>

      {/* Hero Section con animaciones de entrada progresiva */}
      <section className="container hero-section">
        <h1 className="hero-title animate-fade-in delay-100">
          Domina tu dinero.<br/>
          <span>Construye tu futuro.</span>
        </h1>
        <p className="hero-subtitle animate-fade-in delay-200">
          Aprende finanzas personales, ponte a prueba con nuestros quizzes interactivos y alcanza la libertad financiera que siempre quisiste, sin tecnicismos complejos.
        </p>
        <div className="animate-fade-in delay-300">
          <button className="btn-mint">
            Comenzar tu vía libre
          </button>
        </div>
      </section>

      {/* Value Proposition (Prosper Grid) */}
      <section className="container" style={{ padding: '4rem 0' }}>
        <h2 className="text-center animate-fade-in delay-300" style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
          Descubre el poder de Prosper
        </h2>
        <p className="text-center animate-fade-in delay-300" style={{ color: '#6B7280', marginBottom: '3rem' }}>
          Todo lo que necesitas para tu educación financiera en un solo lugar.
        </p>
        
        <div className="features-grid">
          {/* Card 1 */}
          <article className="feature-card card-hover animate-fade-in delay-200">
            <div className="feature-icon" style={{ backgroundColor: 'var(--mint-light)', color: 'var(--mint)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
            </div>
            <h3 className="feature-title">Aprende Fácil</h3>
            <p className="feature-desc">Módulos de lectura directa sobre ahorro, inversión o intereses. Diseñados para que cualquiera lo entienda visualmente y a la primera.</p>
          </article>

          {/* Card 2 */}
          <article className="feature-card card-hover animate-fade-in delay-300">
            <div className="feature-icon" style={{ backgroundColor: '#DBEAFE', color: '#1E3A8A'}}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            </div>
            <h3 className="feature-title">Quiz Gamificado</h3>
            <p className="feature-desc">Responde nuestro cuestionario dinámico, acumula rachas, pon a prueba tu memoria financiera y consolida tus nuevos hábitos diarios.</p>
          </article>

          {/* Card 3 */}
          <article className="feature-card card-hover animate-fade-in delay-500">
            <div className="feature-icon" style={{ backgroundColor: '#FEF3C7', color: '#D97706'}}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
            </div>
            <h3 className="feature-title">Retos Prácticos</h3>
            <p className="feature-desc">Misiones semanales diseñadas para pasar a la acción. Recorta gastos hormiga o arma tu fondo de emergencia viendo resultados reales en tu bolsillo.</p>
          </article>
        </div>
      </section>

      {/* Footer / Final CTA */}
      <footer style={{ backgroundColor: 'var(--navy)', color: 'white', padding: '5rem 0 3rem 0', textAlign: 'center', marginTop: '4rem' }}>
        <div className="container">
          <h2 style={{ fontWeight: 900, fontSize: '2.5rem', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            ¿Listo para tomar el control total?
          </h2>
          <p style={{ opacity: 0.8, marginBottom: '2.5rem', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto 2.5rem auto' }}>
            Únete a la comunidad de jóvenes que están forjando su patrimonio desde cero.
          </p>
          <button className="btn-mint" style={{ backgroundColor: 'white', color: 'var(--navy)' }}>
            Únete a Prosper Gratis
          </button>
          <p style={{ marginTop: '5rem', opacity: 0.4, fontSize: '0.875rem', fontWeight: 600 }}>
            &copy; {new Date().getFullYear()} Prosper. Construido éticamente para la juventud.
          </p>
        </div>
      </footer>
    </main>
  );
}
