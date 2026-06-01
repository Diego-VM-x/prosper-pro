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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('prosper-pro-theme');
                  if (theme === 'dark' || theme === 'light') {
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
                  navigator.serviceWorker.register('/sw.js');
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
