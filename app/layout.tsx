import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './animations.css';
import { ThemeProvider } from './components/ThemeProvider';
import { I18nProvider } from './components/I18nProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from '@/lib/contexts/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
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
        {/* Solo preconnects críticos para la carga inicial */}
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="dns-prefetch" href="https://identitytoolkit.googleapis.com" />
        <link rel="preconnect" href="https://ve.dolarapi.com" />
        <link rel="dns-prefetch" href="https://ve.dolarapi.com" />
        {/* next-themes theme sync script - evita flash de tema incorrecto */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('prosper-pro-theme');
                  if (theme === 'dark' || theme === 'light' || theme === 'amoled') {
                    document.documentElement.setAttribute('data-theme', theme);
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('[SW] Registered:', reg.scope);
                  }).catch(function(err) {
                    console.log('[SW] Registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.variable}>
        <ErrorBoundary>
          <ThemeProvider>
            <I18nProvider>
          <AuthProvider>
              {children}
            </AuthProvider>
          </I18nProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
