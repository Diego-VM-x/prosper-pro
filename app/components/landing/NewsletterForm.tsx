'use client';

import { useState } from 'react';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatus('error');
      return;
    }
    // Simulamos el envío; en producción aquí iría la integración real
    setStatus('success');
    setEmail('');
    setTimeout(() => setStatus('idle'), 4000);
  };

  return (
    <form onSubmit={handleSubmit} className="footer-newsletter-form">
      <input
        type="email"
        placeholder="tu@email.com"
        className="footer-input"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status === 'error') setStatus('idle');
        }}
      />
      <button type="submit" className="btn btn-primary">
        Suscribirme
      </button>
      {status === 'success' && <span className="newsletter-status success">✓ ¡Gracias por suscribirte!</span>}
      {status === 'error' && <span className="newsletter-status error">✗ Ingresa un email válido</span>}
    </form>
  );
}
