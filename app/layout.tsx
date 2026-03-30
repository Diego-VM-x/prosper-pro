import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prosper Pro | Dashboard de Libertad Financiera',
  description: 'Gestiona tu camino hacia la libertad financiera con educación gamificada, seguimiento de proyectos y metas en Prosper Pro.',
  keywords: 'finanzas personales, libertad financiera, educación financiera, dashboard, prosper',
  openGraph: {
    title: 'Prosper Pro | Dashboard de Libertad Financiera',
    description: 'Gestiona tu camino hacia la libertad financiera con educación gamificada.',
    type: 'website',
    locale: 'es_ES',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
