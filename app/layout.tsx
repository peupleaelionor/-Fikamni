import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fikamni',
  description: "Comparateur de transferts d'argent pour la diaspora africaine"
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
