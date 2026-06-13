'use client';

import { useTranslation } from 'react-i18next';
import Link from 'next/link';

export default function TerminosPage() {
  const { t } = useTranslation('legal');

  return (
    <div className="legal-page">
      <div className="legal-container">
        <div className="legal-header">
          <Link href="/" className="legal-back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            <span>{t('backToHome', { defaultValue: 'Volver al inicio' })}</span>
          </Link>
          <h1>{t('terms.title', { defaultValue: 'Términos y Condiciones de Uso' })}</h1>
          <p className="legal-date">{t('terms.lastUpdated', { defaultValue: 'Última actualización: 12 de junio de 2026' })}</p>
        </div>

        <div className="legal-content">
          <section>
            <h2>{t('terms.sections.1.title', { defaultValue: '1. Aceptación de los Términos' })}</h2>
            <p>{t('terms.sections.1.text', { defaultValue: 'Al acceder o utilizar Prosper Pro ("la Plataforma"), aceptas estos Términos y Condiciones de Uso. Si no estás de acuerdo con alguno de estos términos, no debes usar la Plataforma.' })}</p>
          </section>

          <section>
            <h2>{t('terms.sections.2.title', { defaultValue: '2. Descripción del Servicio' })}</h2>
            <p>{t('terms.sections.2.text', { defaultValue: 'Prosper Pro es una plataforma de gestión financiera personal que permite a los usuarios: registrar ingresos y gastos, crear planes de ahorro, gestionar múltiples cuentas en diferentes monedas, visualizar reportes financieros, importar comprobantes bancarios mediante OCR (VEPay), y compartir gastos con otros usuarios. El servicio es 100% gratuito y no requiere tarjeta de crédito.' })}</p>
          </section>

          <section>
            <h2>{t('terms.sections.3.title', { defaultValue: '3. Registro y Cuenta de Usuario' })}</h2>
            <p>{t('terms.sections.3.text', { defaultValue: 'Para usar ciertas funciones de la Plataforma, debes crear una cuenta proporcionando información precisa y completa. Eres responsable de mantener la confidencialidad de tu contraseña y de todas las actividades que ocurran bajo tu cuenta. Debes notificarnos inmediatamente de cualquier uso no autorizado. El registro está disponible mediante correo electrónico o Google Sign-In.' })}</p>
          </section>

          <section>
            <h2>{t('terms.sections.4.title', { defaultValue: '4. Uso Aceptable' })}</h2>
            <p>{t('terms.sections.4.text', { defaultValue: 'Te comprometes a usar la Plataforma únicamente para fines legales y de acuerdo con estos Términos. Queda prohibido: usar la Plataforma para actividades fraudulentas o ilegales; intentar acceder a cuentas de otros usuarios; interferir con el funcionamiento de la Plataforma; distribuir malware o contenido malicioso; o usar la Plataforma de manera que pueda dañar, deshabilitar o sobrecargar nuestros servidores.' })}</p>
          </section>

          <section>
            <h2>{t('terms.sections.5.title', { defaultValue: '5. Propiedad Intelectual' })}</h2>
            <p>{t('terms.sections.5.text', { defaultValue: 'Todos los derechos de propiedad intelectual relacionados con la Plataforma, incluyendo pero no limitado a software, diseños, logos, marcas y contenido, son propiedad de Prosper Pro o de sus licenciantes. No se concede ninguna licencia implícita para usar estos materiales fuera de lo permitido por estos Términos.' })}</p>
          </section>

          <section>
            <h2>{t('terms.sections.6.title', { defaultValue: '6. Privacidad y Datos' })}</h2>
            <p>{t('terms.sections.6.text', { defaultValue: 'Tu privacidad es importante para nosotros. La recopilación y uso de tus datos personales se rige por nuestra Política de Privacidad, que forma parte de estos Términos. Al usar la Plataforma, consientes la recopilación y uso de información según lo descrito en dicha política.' })}</p>
          </section>

          <section>
            <h2>{t('terms.sections.7.title', { defaultValue: '7. Disponibilidad del Servicio' })}</h2>
            <p>{t('terms.sections.7.text', { defaultValue: 'Nos esforzamos por mantener la Plataforma disponible las 24 horas, pero no garantizamos disponibilidad ininterrumpida. Podemos realizar mantenimiento programado o no programado que pueda afectar temporalmente el acceso. No somos responsables por interrupciones causadas por factores fuera de nuestro control.' })}</p>
          </section>

          <section>
            <h2>{t('terms.sections.8.title', { defaultValue: '8. Limitación de Responsabilidad' })}</h2>
            <p>{t('terms.sections.8.text', { defaultValue: 'Prosper Pro se proporciona "tal cual" y "según disponibilidad". No garantizamos que la Plataforma sea completamente libre de errores. En la máxima medida permitida por la ley, no seremos responsables por daños indirectos, incidentales, especiales o consecuentes derivados del uso o la imposibilidad de usar la Plataforma.' })}</p>
          </section>

          <section>
            <h2>{t('terms.sections.9.title', { defaultValue: '9. Modificaciones de los Términos' })}</h2>
            <p>{t('terms.sections.9.text', { defaultValue: 'Nos reservamos el derecho de modificar estos Términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación. Te notificaremos sobre cambios significativos. El uso continuado de la Plataforma después de cualquier modificación constituye tu aceptación de los nuevos términos.' })}</p>
          </section>

          <section>
            <h2>{t('terms.sections.10.title', { defaultValue: '10. Terminación' })}</h2>
            <p>{t('terms.sections.10.text', { defaultValue: 'Podemos suspender o terminar tu acceso a la Plataforma en cualquier momento, con o sin causa, con o sin previo aviso. También puedes eliminar tu cuenta en cualquier momento desde la configuración de tu perfil. Tras la terminación, ciertas disposiciones de estos Términos seguirán vigentes.' })}</p>
          </section>

          <section>
            <h2>{t('terms.sections.11.title', { defaultValue: '11. Contacto' })}</h2>
            <p>{t('terms.sections.11.text', { defaultValue: 'Si tienes preguntas sobre estos Términos, puedes contactarnos en:' })} <a href="mailto:soporte@prosperpro.com">soporte@prosperpro.com</a></p>
          </section>
        </div>

        <div className="legal-footer">
          <p>© 2026 Prosper Pro. {t('footer.rights', { defaultValue: 'Todos los derechos reservados.' })}</p>
        </div>
      </div>

      <style>{`
        .legal-page { min-height: 100vh; background: #f8fafc; font-family: 'Inter', sans-serif; }
        .legal-container { max-width: 800px; margin: 0 auto; padding: 48px 24px; }
        .legal-header { margin-bottom: 40px; }
        .legal-back { display: inline-flex; align-items: center; gap: 8px; color: #3DCC8E; font-weight: 600; font-size: 0.875rem; text-decoration: none; margin-bottom: 24px; transition: color 0.2s; }
        .legal-back:hover { color: #2BA876; }
        .legal-header h1 { font-size: 2rem; font-weight: 800; color: #1E3A6E; margin: 16px 0 8px; letter-spacing: -0.5px; }
        .legal-date { font-size: 0.875rem; color: #64748b; margin: 0; }
        .legal-content { background: white; border-radius: 20px; padding: 40px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
        .legal-content section { margin-bottom: 32px; }
        .legal-content section:last-child { margin-bottom: 0; }
        .legal-content h2 { font-size: 1.125rem; font-weight: 700; color: #1E3A6E; margin: 0 0 12px; }
        .legal-content p { font-size: 0.9375rem; color: #475569; line-height: 1.7; margin: 0; }
        .legal-content a { color: #3DCC8E; font-weight: 600; text-decoration: none; }
        .legal-content a:hover { text-decoration: underline; }
        .legal-footer { text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
        .legal-footer p { font-size: 0.875rem; color: #94a3b8; margin: 0; }
        @media (max-width: 640px) {
          .legal-container { padding: 24px 16px; }
          .legal-content { padding: 24px 20px; border-radius: 16px; }
          .legal-header h1 { font-size: 1.5rem; }
          .legal-content h2 { font-size: 1rem; }
          .legal-content p { font-size: 0.875rem; }
        }
      `}</style>
    </div>
  );
}
