export default function Home() {
  return (
    <main>
      {/* Navegación Mínima */}
      <nav style={{ padding: '1.5rem 0', display: 'flex', justifyContent: 'center' }}>
        <div style={{ fontWeight: 900, fontSize: '1.5rem', color: 'var(--navy)', letterSpacing: '-0.05em' }}>
          Prosper<span style={{ color: 'var(--mint)' }}>.</span>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container hero-section">
        <h1 className="hero-title">
          Domina tu dinero.<br/>
          <span>Construye tu futuro.</span>
        </h1>
        <p className="hero-subtitle">
          Aprende finanzas personales, ponte a prueba con nuestros quizzes interactivos y alcanza la libertad financiera que siempre quisiste, sin tecnicismos complejos.
        </p>
        <button className="btn-mint">
          Comenzar tu vía libre
        </button>
      </section>

      {/* Value Proposition (Prosper Grid) */}
      <section className="container" style={{ padding: '4rem 0' }}>
        <h2 className="text-center" style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
          Descubre el poder de Prosper
        </h2>
        <p className="text-center" style={{ color: '#6B7280', marginBottom: '2rem' }}>
          Todo lo que necesitas para tu educación financiera en un solo lugar.
        </p>
        
        <div className="features-grid">
          {/* Card 1 */}
          <article className="feature-card card-hover">
            <div className="feature-icon" style={{ backgroundColor: 'var(--mint-light)', color: 'var(--mint)' }}>📖</div>
            <h3 className="feature-title">Aprende Fácil</h3>
            <p className="feature-desc">Módulos de lectura directa sobre ahorro, inversión o intereses. Diseñados para que cualquiera lo entienda visualmente y a la primera.</p>
          </article>

          {/* Card 2 */}
          <article className="feature-card card-hover">
            <div className="feature-icon" style={{ backgroundColor: '#DBEAFE', color: '#1E3A8A'}}>⚡</div>
            <h3 className="feature-title">Quiz Gamificado</h3>
            <p className="feature-desc">Responde nuestro cuestionario dinámico, acumula rachas, pon a prueba tu memoria financiera y consolida tus nuevos hábitos diarios.</p>
          </article>

          {/* Card 3 */}
          <article className="feature-card card-hover">
            <div className="feature-icon" style={{ backgroundColor: '#FEF3C7', color: '#D97706'}}>🎯</div>
            <h3 className="feature-title">Retos Prácticos</h3>
            <p className="feature-desc">Misiones semanales diseñadas para pasar a la acción. Recorta gastos hormiga o arma tu fondo de emergencia viendo resultados reales en tu bolsillo.</p>
          </article>
        </div>
      </section>

      {/* Footer / Final CTA */}
      <footer style={{ backgroundColor: 'var(--navy)', color: 'white', padding: '4rem 0', textAlign: 'center', marginTop: '4rem' }}>
        <div className="container">
          <h2 style={{ fontWeight: 900, fontSize: '2rem', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            ¿Listo para tomar el control total?
          </h2>
          <p style={{ opacity: 0.8, marginBottom: '2.5rem', fontSize: '1.1rem' }}>Únete y comienza a fortalecer tu patrimonio hoy mismo.</p>
          <button className="btn-mint" style={{ backgroundColor: 'white', color: 'var(--navy)' }}>
            Únete a Prosper Gratis
          </button>
          <p style={{ marginTop: '4rem', opacity: 0.4, fontSize: '0.875rem', fontWeight: 600 }}>
            &copy; {new Date().getFullYear()} Prosper. Construido éticamente para la juventud.
          </p>
        </div>
      </footer>
    </main>
  );
}
