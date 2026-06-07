import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import './animations.css';
import { AuthProvider } from '@/lib/contexts/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
});
import { SearchProvider } from '@/lib/contexts/SearchContext';
import { GoalsProvider } from '@/lib/contexts/GoalsContext';
import { CurrencyProvider } from '@/lib/contexts/CurrencyContext';
import { ThemeProvider } from './components/ThemeProvider';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1A3C34',
};

export const metadata: Metadata = {
  title: {
    default: 'Prosper Pro | Tu Camino a la Libertad Financiera',
    template: '%s | Prosper Pro',
  },
  description: 'Plataforma de educación financiera gamificada. Gestiona tus metas de ahorro, inversión y aprendizaje con Prosper Pro.',
  keywords: ['finanzas personales', 'libertad financiera', 'educación financiera', 'ahorro', 'inversión', 'dashboard financiero', 'prosper pro'],
  authors: [{ name: 'Prosper Pro Team' }],
  creator: 'Prosper Pro',
  publisher: 'Prosper Pro',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/logo-icon.png',
    shortcut: '/logo-icon.png',
    apple: '/logo-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://prosper-pro.vercel.app',
    siteName: 'Prosper Pro',
    title: 'Prosper Pro | Tu Camino a la Libertad Financiera',
    description: 'Plataforma de educación financiera gamificada. Gestiona tus metas de ahorro, inversión y aprendizaje.',
    images: [
      {
        url: '/logo-full.png',
        width: 1200,
        height: 630,
        alt: 'Prosper Pro - Dashboard Financiero',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prosper Pro | Tu Camino a la Libertad Financiera',
    description: 'Plataforma de educación financiera gamificada.',
    images: ['/logo-full.png'],
  },
  alternates: {
    canonical: 'https://prosper-pro.vercel.app',
  },
  category: 'finance',
};

// Skeleton de carga global
function LoadingSkeleton() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-card, #ffffff)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48,
          height: 48,
          border: '4px solid var(--border-default, #e5e7eb)',
          borderTopColor: 'var(--color-prosper-green, #3DCC8E)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px',
        }} />
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #666)' }}>
          Cargando Prosper Pro...
        </p>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Polyfill crítico: localStorage/sessionStorage para modo privado / sandbox */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var mem = {};
                function makeStore() {
                  return {
                    getItem: function(k) { return mem[k] === undefined ? null : mem[k]; },
                    setItem: function(k, v) { mem[k] = String(v); },
                    removeItem: function(k) { delete mem[k]; },
                    clear: function() { mem = {}; },
                    key: function(i) { return Object.keys(mem)[i] || null; },
                    get length() { return Object.keys(mem).length; }
                  };
                }
                try { localStorage.getItem('__t'); } catch(e) {
                  try { window.localStorage = makeStore(); } catch(e2) {}
                }
                try { sessionStorage.getItem('__t'); } catch(e) {
                  try { window.sessionStorage = makeStore(); } catch(e2) {}
                }
              })();
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="dns-prefetch" href="https://identitytoolkit.googleapis.com" />
        <link rel="preconnect" href="https://ve.dolarapi.com" />
        <link rel="dns-prefetch" href="https://ve.dolarapi.com" />
        {/* Theme se maneja via next-themes para evitar hydration mismatch */}
        {/* Captura global de errores para diagnóstico */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var errors = [];
                var MAX_ERRORS = 5;
                function showError(msg, source, line, col, err) {
                  if (errors.length >= MAX_ERRORS) return;
                  errors.push({msg: msg, source: source, line: line, col: col, err: err && (err.stack || err.message)});
                  var existing = document.getElementById('__pp_fatal_errors');
                  if (!existing) {
                    var div = document.createElement('div');
                    div.id = '__pp_fatal_errors';
                    div.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:#1a1a2e;color:#fff;font-family:system-ui,sans-serif;padding:20px;overflow:auto;';
                    div.innerHTML = '<h2 style="margin:0 0 12px 0;color:#3DCC8E;font-size:1.2rem;">⚠️ Prosper Pro - Error de carga</h2><p style="margin:0 0 12px 0;color:#aaa;font-size:0.85rem;">La app no pudo cargar. Envía esta captura al soporte:</p><pre id="__pp_err_pre" style="background:#0f0f1a;padding:12px;border-radius:8px;font-size:0.75rem;white-space:pre-wrap;word-break:break-all;color:#ff6b6b;"></pre><button onclick="location.reload()" style="margin-top:16px;padding:10px 20px;background:#3DCC8E;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Recargar página</button>';
                    document.body ? document.body.appendChild(div) : setTimeout(function(){ document.body && document.body.appendChild(div); }, 100);
                  }
                  var pre = document.getElementById('__pp_err_pre');
                  if (pre) {
                    pre.textContent = errors.map(function(e, i) {
                      return '#' + (i+1) + ': ' + e.msg + (e.source ? '\\n  at ' + e.source + ':' + e.line + ':' + e.col : '') + (e.err ? '\\n  Stack: ' + e.err : '');
                    }).join('\\n\\n');
                  }
                }
                window.onerror = function(msg, source, line, col, err) {
                  showError(String(msg), source, line, col, err);
                  return false;
                };
                window.addEventListener('unhandledrejection', function(e) {
                  showError('Unhandled Promise: ' + (e.reason && e.reason.message || String(e.reason)), '', 0, 0, e.reason);
                });
                // Detectar si React no monta en 10 segundos
                setTimeout(function() {
                  var root = document.getElementById('__next');
                  if (!root || root.children.length === 0) {
                    showError('React no montó el DOM en 10s. Posible error silencioso.', '', 0, 0, null);
                  }
                }, 10000);
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                  regs.forEach(function(r) { r.unregister(); });
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.variable}>
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <CurrencyProvider>
              <GoalsProvider>
                <SearchProvider>
                  <ToastProvider>
                    <Suspense fallback={<LoadingSkeleton />}>
                      {children}
                    </Suspense>
                  </ToastProvider>
                </SearchProvider>
              </GoalsProvider>
              </CurrencyProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
