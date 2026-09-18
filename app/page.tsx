import Link from 'next/link';
import {ComparatorApp} from '@/components/comparator-app';
import {listCorridors} from '@/lib/geo';
import {getComparatorData} from '@/lib/offers';

/**
 * Page d'accueil : comparateur générique (composant serveur qui charge les
 * données puis les passe au widget client). Quelques couloirs populaires sont
 * mis en avant pour le maillage interne SEO vers les landing pages.
 */
export default function HomePage() {
  const data = getComparatorData();
  const popularCorridors = listCorridors().filter((corridor) =>
    ['fr-sn', 'fr-cd', 'fr-ci', 'be-cm', 'gb-ng', 'fr-ma'].includes(corridor.id)
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-soft sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-emerald-300">
          Comparateur diaspora
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">
          Comparez le vrai coût de vos transferts d&apos;argent en quelques secondes.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
          Fikamni classe les offres selon le <strong>coût réel</strong> : frais visibles + marge de change
          + frais côté réception, réunis en un seul montant comparable.
        </p>
      </section>

      <ComparatorApp data={data} />

      <section className="rounded-[2rem] bg-white p-6 shadow-soft sm:p-8">
        <h2 className="text-xl font-semibold text-slate-950">Couloirs populaires</h2>
        <p className="mt-1 text-sm text-slate-600">
          Accédez directement à la page dédiée d&apos;un couloir, avec le comparateur pré-rempli.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {popularCorridors.map((corridor) => (
            <li key={corridor.id}>
              <Link
                href={`/corridor/${corridor.from.code}/${corridor.to.code}`}
                className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-emerald-500 hover:text-emerald-700"
              >
                <span>
                  {corridor.from.flag} {corridor.from.nameFr} → {corridor.to.flag} {corridor.to.nameFr}
                </span>
                <span aria-hidden>→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
