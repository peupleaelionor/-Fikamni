import Link from 'next/link';

/**
 * En-tête global (composant serveur). Navigation minimale, en français, pour
 * l'audience francophone de la diaspora et pour le maillage interne SEO.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-slate-950">
          <span aria-hidden>💸</span> Fikamni
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <Link href="/" className="transition hover:text-emerald-600">
            Comparateur
          </Link>
          <Link href="/methodologie" className="transition hover:text-emerald-600">
            Méthodologie
          </Link>
        </nav>
      </div>
    </header>
  );
}
