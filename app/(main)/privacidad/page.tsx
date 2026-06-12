'use client';

import { useTranslation } from 'react-i18next';
import Link from 'next/link';

export default function PrivacidadPage() {
  const { t } = useTranslation('legal');

  return (
    <div className="legal-page">
      <div className="legal-container">
        <div className="legal-header">
          <Link href="/" className="legal-back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            <span>{t('backToHome', { defaultValue: 'Volver al inicio' })}</span>
          </Link>
          <h1>{t('privacy.title', { defaultValue: 'Política de Privacidad' })}</h1>
          <p className="legal-date">{t('privacy.lastUpdated', { defaultValue: 'Última actualización: 12 de junio de 2026' })}</p>
        </div>

        <div className="legal-content">
          <section>
            <h2>{t('privacy.sections.1.title', { defaultValue: '1. Introducción' })}</h2>
            <p>{t('privacy.sections.1.text', { defaultValue: 'En Prosper Pro, tu privacidad es nuestra prioridad. Esta Política de Privacidad explica cómo recopilamos, usamos, almacenamos y protegemos tu información personal cuando usas nuestra plataforma. Al usar Prosper Pro, aceptas las prácticas descritas en esta política.' })}</p>
          </section>

          <section>
            <h2>{t('privacy.sections.2.title', { defaultValue: '2. Información que Recopilamos' })}</h2>
            <p>{t('privacy.sections.2.text', { defaultValue: 'Recopilamos la siguiente información: (a) Información de cuenta: nombre, correo electrónico, foto de perfil (si usas Google Sign-In), moneda preferida, idioma y tema seleccionado. (b) Información financiera: datos de tus cuentas, transacciones, planes de ahorro, gastos e ingresos que registras voluntariamente. (c) Información técnica: dirección IP, tipo de navegador, dispositivo y datos de uso anónimos para mejorar el servicio. No recopilamos información de tarjetas de crédito ni datos bancarios sensibles.' })}</p>
          </section>

          <section>
            <h2>{t('privacy.sections.3.title', { defaultValue: '3. Cómo Usamos tu Información' })}</h2>
            <p>{t('privacy.sections.3.text', { defaultValue: 'Usamos tu información para: proporcionar y mantener el servicio; sincronizar tus datos entre dispositivos; generar reportes financieros personalizados; enviar notificaciones sobre vencimientos y recordatorios (si las activas); mejorar la plataforma mediante análisis de uso anónimo; y responder a tus consultas de soporte. No usamos tus datos financieros para publicidad dirigida ni los vendemos a terceros.' })}</p>
          </section>

          <section>
            <h2>{t('privacy.sections.4.title', { defaultValue: '4. Almacenamiento y Seguridad' })}</h2>
            <p>{t('privacy.sections.4.text', { defaultValue: 'Tus datos se almacenan en Firebase (Google Cloud), que cumple con estándares de seguridad internacionales. Cada usuario tiene su propio espacio aislado en Firestore. La comunicación entre tu navegador y nuestros servidores usa HTTPS/TLS encriptado. No almacenamos contraseñas en texto plano; usamos hashing seguro. Implementamos autenticación de dos factores implícita mediante verificación de email.' })}</p>
          </section>

          <section>
            <h2>{t('privacy.sections.5.title', { defaultValue: '5. Compartir Información' })}</h2>
            <p>{t('privacy.sections.5.text', { defaultValue: 'No vendemos, alquilamos ni compartimos tu información personal con terceros para fines comerciales. Solo compartimos datos en los siguientes casos: (a) con proveedores de servicios esenciales (Firebase/Google Cloud para hosting); (b) cuando es requerido por ley o proceso legal; (c) para proteger nuestros derechos o la seguridad de usuarios; (d) en planes de gasto compartido, solo con los usuarios que tú invitas explícitamente.' })}</p>
          </section>

          <section>
            <h2>{t('privacy.sections.6.title', { defaultValue: '6. Cookies y Tecnologías Similares' })}</h2>
            <p>{t('privacy.sections.6.text', { defaultValue: 'Usamos cookies esenciales para el funcionamiento de la plataforma (autenticación, preferencias de tema e idioma). No usamos cookies de terceros ni trackers de publicidad. Puedes deshabilitar cookies en tu navegador, pero algunas funciones podrían no funcionar correctamente.' })}</p>
          </section>

          <section>
            <h2>{t('privacy.sections.7.title', { defaultValue: '7. Tus Derechos' })}</h2>
            <p>{t('privacy.sections.7.text', { defaultValue: 'Tienes derecho a: acceder a tus datos personales; corregir información inexacta; eliminar tu cuenta y todos los datos asociados; exportar tus datos financieros; y optar por no recibir comunicaciones no esenciales. Puedes ejercer estos derechos desde la configuración de tu perfil o contactando a soporte.' })}</p>
          </section>

          <section>
            <h2>{t('privacy.sections.8.title', { defaultValue: '8. Retención de Datos' })}</h2>
            <p>{t('privacy.sections.8.text', { defaultValue: 'Conservamos tus datos mientras mantengas una cuenta activa. Si eliminas tu cuenta, tus datos personales se eliminan permanentemente de nuestros servidores dentro de los 30 días siguientes, excepto cuando la ley requiera retención más prolongada. Los datos anónimos de uso pueden conservarse para análisis estadísticos.' })}</p>
          </section>

          <section>
            <h2>{t('privacy.sections.9.title', { defaultValue: '9. Cambios en esta Política' })}</h2>
            <p>{t('privacy.sections.9.text', { defaultValue: 'Podemos actualizar esta Política de Privacidad ocasionalmente. Te notificaremos sobre cambios significativos mediante un aviso en la plataforma o por correo electrónico. La fecha de "última actualización" al inicio de esta política indica cuándo se realizó la última revisión.' })}</p>
          </section>

          <section>
            <h2>{t('privacy.sections.10.title', { defaultValue: '10. Contacto' })}</h2>
            <p>{t('privacy.sections.10.text', { defaultValue: 'Si tienes preguntas o inquietudes sobre esta Política de Privacidad o sobre cómo manejamos tus datos, contáctanos en:' })} <a href="mailto:soporte@prosperpro.com">soporte@prosperpro.com</a></p>
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
