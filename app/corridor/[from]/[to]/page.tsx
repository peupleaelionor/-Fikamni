import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AlertSignup} from '@/components/alert-signup';
import {ComparatorApp} from '@/components/comparator-app';
import {RateChart} from '@/components/rate-chart';
import type {CurrencyCode} from '@/lib/engine';
import {
  corridorTitleFr,
  getCorridor,
  listCorridorParams,
  listCorridors,
  type Corridor
} from '@/lib/geo';
import {getComparatorData} from '@/lib/offers';
import {corridorRateSeries, loadRateHistory} from '@/lib/rate-history';

interface CorridorPageParams {
  params: Promise<{from: string; to: string}>;
}

const CURRENCY_NAME_FR: Record<CurrencyCode, string> = {
  EUR: 'euro (EUR)',
  GBP: 'livre sterling (GBP)',
  USD: 'dollar américain (USD)',
  CAD: 'dollar canadien (CAD)',
  XOF: 'franc CFA d’Afrique de l’Ouest (XOF)',
  XAF: 'franc CFA d’Afrique centrale (XAF)',
  NGN: 'naira (NGN)',
  CDF: 'franc congolais (CDF)',
  MAD: 'dirham (MAD)',
  GHS: 'cedi (GHS)',
  KES: 'shilling (KES)'
};

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

/** FAQ propre au couloir (texte unique) + base pour les données structurées. */
function buildFaq(corridor: Corridor): Array<{question: string; answer: string}> {
  const to = `${corridor.to.toPrepositionFr}${corridor.to.nameFr}`;
  const from = `${corridor.from.fromArticleFr}${corridor.from.nameFr}`;
  return [
    {
      question: `Combien coûte un transfert d'argent ${to} depuis ${from} ?`,
      answer: `Le coût dépend du prestataire. Ce qui compte, c'est le coût réel : les frais visibles, la marge de change (souvent cachée) et les frais côté réception réunis. Fikamni calcule ce coût réel pour chaque offre et classe de la moins chère à la plus chère, à montant envoyé égal.`
    },
    {
      question: `Quelle est la devise ${to} ?`,
      answer: `Les transferts ${to} sont reçus en ${CURRENCY_NAME_FR[corridor.receiveCurrency]}. Le montant reçu affiché tient compte du taux appliqué par le prestataire, pas seulement du taux mi-marché.`
    },
    {
      question: `Quel est le moyen le plus rapide d'envoyer de l'argent ${to} ?`,
      answer: `Les réceptions par wallet mobile ou en cash sont généralement les plus rapides (quelques minutes), tandis que les virements bancaires peuvent prendre de quelques heures à un ou deux jours. Utilisez le filtre « Réception en moins d'1 h » pour ne voir que les options rapides.`
    },
    {
      question: `Les frais affichés par les prestataires incluent-ils la marge de change ?`,
      answer: `Non. La plupart des services annoncent des frais faibles, voire nuls, mais appliquent un taux de change moins favorable que le taux mi-marché et conservent la différence. Fikamni réintègre cette marge dans le coût réel pour une comparaison honnête.`
    },
    {
      question: `Fikamni exécute-t-il le transfert d'argent ?`,
      answer: `Non. Fikamni est un produit d'information : nous comparons les offres mais ne détenons pas de fonds et n'effectuons aucun transfert. Vous finalisez l'envoi directement chez le prestataire choisi.`
    }
  ];
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
  const series = corridorRateSeries(loadRateHistory(), corridor.sendCurrency, corridor.receiveCurrency);
  const faq = buildFaq(corridor);

  const sameOrigin = listCorridors().filter((item) => item.from.code === from && item.to.code !== to);
  const sameDestination = listCorridors().filter((item) => item.to.code === to && item.from.code !== from);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {'@type': 'Answer', text: item.answer}
    }))
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(faqJsonLd)}} />

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

      <div className="grid gap-6 lg:grid-cols-2">
        <RateChart
          series={series}
          fromCurrency={corridor.sendCurrency}
          toCurrency={corridor.receiveCurrency}
          title={`Évolution du taux ${corridor.sendCurrency} → ${corridor.receiveCurrency}`}
          locale="fr"
        />
        {dataset ? (
          <AlertSignup
            corridorId={corridor.id}
            amount={dataset.defaultAmount}
            label={`Alerte prix ${corridor.to.nameFr}`}
          />
        ) : null}
      </div>

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

      <section className="rounded-[2rem] bg-white p-6 shadow-soft sm:p-8">
        <h2 className="text-xl font-semibold text-slate-950">Questions fréquentes</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {faq.map((item) => (
            <details key={item.question} className="group py-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 marker:content-none">
                <span className="inline-flex items-center gap-2">
                  <span className="text-emerald-600 transition group-open:rotate-90">▸</span>
                  {item.question}
                </span>
              </summary>
              <p className="mt-2 pl-6 text-sm leading-relaxed text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
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
