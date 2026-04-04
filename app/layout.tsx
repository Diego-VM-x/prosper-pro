import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { SearchProvider } from '@/lib/contexts/SearchContext';
import { GoalsProvider } from '@/lib/contexts/GoalsContext';
import { ThemeProvider } from './components/ThemeProvider';
import { ToastProvider } from './components/Toast';

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
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <GoalsProvider>
              <SearchProvider>
                <ToastProvider>
                  {children}
                </ToastProvider>
              </SearchProvider>
            </GoalsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
