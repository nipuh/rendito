import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rendito – Dein Immobilien-Match',
  description: 'Finde deine perfekte Immobilie. Swipe, match, investiere.',
  keywords: ['Immobilien', 'Investment', 'Rendite', 'Kapitalanlage', 'Deutschland'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
