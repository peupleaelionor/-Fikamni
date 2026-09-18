import type {Metadata} from 'next';
import './globals.css';
import {SiteFooter} from '@/components/site-footer';
import {SiteHeader} from '@/components/site-header';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fikamni.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Fikamni — Comparateur de transferts d’argent pour la diaspora',
    template: '%s · Fikamni'
  },
  description:
    "Comparez le coût réel de vos transferts d'argent vers l'Afrique : frais visibles, marge de change et frais côté réception réunis en un seul montant.",
  openGraph: {
    type: 'website',
    siteName: 'Fikamni',
    locale: 'fr_FR'
  },
  robots: {index: true, follow: true}
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
