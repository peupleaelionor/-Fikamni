import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ComparatorApp} from '@/components/comparator-app';
import {
  corridorTitleFr,
  getCorridor,
  listCorridorParams,
  listCorridors
} from '@/lib/geo';
import {getComparatorData} from '@/lib/offers';

interface CorridorPageParams {
  params: Promise<{from: string; to: string}>;
}

// Génère une page statique pour CHAQUE couloir Phase 1 (envoi × réception).
export function generateStaticParams() {
  return listCorridorParams();
}

export async function generateMetadata({params}: CorridorPageParams): Promise<Metadata> {
  const {from, to} = await params;
  const corridor = getCorridor(from, to);
  if (!corridor) {
    return {title: 'Couloir introuvable'};
  }
  const title = corridorTitleFr(corridor);
  return {
    title,
    description: `Comparez le coût réel pour ${corridor.to.toPrepositionFr}${corridor.to.nameFr} depuis ${corridor.from.fromArticleFr}${corridor.from.nameFr} : frais, marge de change et frais de réception réunis. Trouvez l'offre la plus avantageuse.`,
    alternates: {canonical: `/corridor/${corridor.from.code}/${corridor.to.code}`},
    openGraph: {title, type: 'article'}
  };
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', {dateStyle: 'long', timeZone: 'UTC'}).format(new Date(iso));
}

export default async function CorridorPage({params}: CorridorPageParams) {
  const {from, to} = await params;
  const corridor = getCorridor(from, to);
  if (!corridor) {
    notFound();
  }

  const data = getComparatorData();
  const dataset = data.corridors[corridor.id];
  const title = corridorTitleFr(corridor);

  const sameOrigin = listCorridors().filter((item) => item.from.code === from && item.to.code !== to);
  const sameDestination = listCorridors().filter((item) => item.to.code === to && item.from.code !== from);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <nav aria-label="Fil d'Ariane" className="text-sm text-slate-500">
        <Link href="/" className="hover:text-emerald-600">
          Accueil
        </Link>{' '}
        / <span className="text-slate-700">{corridor.from.nameFr} → {corridor.to.nameFr}</span>
      </nav>

      <section className="overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-soft sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-emerald-300">
          {corridor.from.flag} {corridor.from.nameFr} → {corridor.to.flag} {corridor.to.nameFr}
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
          Comparez en un coup d&apos;œil le coût réel des transferts {corridor.to.toPrepositionFr}
          {corridor.to.nameFr} depuis {corridor.from.fromArticleFr}
          {corridor.from.nameFr} ({corridor.sendCurrency} → {corridor.receiveCurrency}). Fikamni additionne les
          frais visibles, la marge de change cachée et les frais côté réception pour révéler ce que reçoit
          vraiment votre proche.
        </p>
        {dataset ? (
          <p className="mt-3 text-xs text-slate-400">Dernière mise à jour des données : {formatDate(dataset.updatedAt)}</p>
        ) : null}
      </section>

      <ComparatorApp data={data} initialFrom={corridor.from.code} initialTo={corridor.to.code} />

      <section className="rounded-[2rem] bg-white p-6 shadow-soft sm:p-8">
        <h2 className="text-xl font-semibold text-slate-950">
          Comment lit-on le classement {corridor.to.toPrepositionFr}
          {corridor.to.nameFr} ?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Les offres sont triées par <strong>coût réel croissant</strong> : un transfert « sans frais » peut
          en réalité coûter plus cher qu&apos;un autre à cause d&apos;une marge de change défavorable. À montant
          envoyé égal, l&apos;offre en tête est celle qui laisse le plus d&apos;argent à l&apos;arrivée.{' '}
          <Link href="/methodologie" className="font-medium text-emerald-700 hover:underline">
            Voir la méthodologie complète
          </Link>
          .
        </p>
      </section>

      <section className="grid gap-6 rounded-[2rem] bg-white p-6 shadow-soft sm:grid-cols-2 sm:p-8">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Autres destinations depuis {corridor.from.fromArticleFr}
            {corridor.from.nameFr}
          </h2>
          <ul className="mt-3 grid gap-2">
            {sameOrigin.map((item) => (
              <li key={item.id}>
                <Link href={`/corridor/${item.from.code}/${item.to.code}`} className="text-sm text-slate-600 hover:text-emerald-700">
                  {item.to.flag} {item.to.nameFr}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Envoyer {corridor.to.toPrepositionFr}
            {corridor.to.nameFr} depuis un autre pays
          </h2>
          <ul className="mt-3 grid gap-2">
            {sameDestination.map((item) => (
              <li key={item.id}>
                <Link href={`/corridor/${item.from.code}/${item.to.code}`} className="text-sm text-slate-600 hover:text-emerald-700">
                  {item.from.flag} {item.from.nameFr}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
