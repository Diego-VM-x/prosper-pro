import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prosper | Tu camino hacia la libertad financiera',
  description: 'Herramientas y lecturas interactivas para dominar tu dinero fácilmente.',
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
