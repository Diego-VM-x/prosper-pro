import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prosper App',
  description: 'Libertad financiera y educación gamificada',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
