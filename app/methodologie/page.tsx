import type {Metadata} from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Méthodologie — comment nous calculons le coût réel',
  description:
    "Transparence totale : comment Fikamni calcule le coût réel d'un transfert d'argent (frais visibles, marge de change, frais côté réception) et classe les offres.",
  alternates: {canonical: '/methodologie'}
};

/** Petite ligne d'un tableau de décomposition du coût réel. */
function CostRow({label, value, hint}: {label: string; value: string; hint?: string}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      </div>
      <p className="whitespace-nowrap text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export default function MethodologiePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-soft sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-emerald-300">Transparence = confiance</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
          Comment nous calculons le coût réel
        </h1>
        <p className="mt-3 text-sm text-slate-300 sm:text-base">
          Le prix affiché par un service de transfert ne dit pas tout. Un transfert « sans frais » peut
          coûter plus cher qu&apos;un autre à cause d&apos;un taux de change défavorable. Fikamni réunit tous les
          coûts en un seul montant comparable : le <strong>coût réel</strong>.
        </p>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-soft sm:p-8">
        <h2 className="text-xl font-semibold text-slate-950">Les trois composantes du coût réel</h2>
        <ol className="mt-4 space-y-4">
          <li>
            <h3 className="text-base font-semibold text-slate-900">1. Les frais visibles</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Ce sont les frais annoncés au moment de l&apos;envoi : un montant fixe (par exemple 2 €) plus,
              parfois, un pourcentage du montant transféré. Faciles à voir… mais ils ne sont qu&apos;une partie
              de l&apos;histoire.
            </p>
          </li>
          <li>
            <h3 className="text-base font-semibold text-slate-900">2. La marge de change (le coût caché)</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              La plupart des services n&apos;utilisent pas le <em>taux mi-marché</em> (le taux « réel » que l&apos;on
              voit sur Google ou à la Banque centrale européenne). Ils appliquent un taux légèrement moins
              favorable et gardent la différence. C&apos;est le coût le plus souvent invisible. Nous le mesurons
              en comparant le taux du prestataire au taux mi-marché.
            </p>
          </li>
          <li>
            <h3 className="text-base font-semibold text-slate-900">3. Les frais côté réception</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Certaines offres prélèvent des frais au retrait ou à la réception (dans la devise locale).
              Pour les rendre comparables, nous les <strong>reconvertissons dans la devise d&apos;envoi</strong> au
              taux mi-marché.
            </p>
          </li>
        </ol>

        <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Coût réel = frais visibles + marge de change + frais de réception</p>
          <p className="mt-1">
            Les offres sont ensuite triées par coût réel croissant. En cas d&apos;égalité, celle qui fait
            parvenir le plus d&apos;argent à l&apos;arrivée passe devant.
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-soft sm:p-8">
        <h2 className="text-xl font-semibold text-slate-950">Exemple chiffré</h2>
        <p className="mt-2 text-sm text-slate-600">
          Envoi de 200 € vers un pays de la zone Franc CFA (XOF), taux mi-marché : 1 € = 655,957 XOF.
          Un prestataire annonce « 1,50 € de frais » mais applique un taux de 646 XOF et prélève 400 XOF à
          la réception.
        </p>
        <div className="mt-4 rounded-2xl border border-slate-200 p-4">
          <CostRow label="Frais visibles" value="3,50 €" hint="1,50 € fixe + 1 % de 200 €" />
          <CostRow
            label="Marge de change"
            value="≈ 3,04 €"
            hint="200 € × (655,957 − 646) / 655,957"
          />
          <CostRow label="Frais de réception" value="≈ 0,61 €" hint="400 XOF reconvertis au taux mi-marché" />
          <CostRow label="Coût réel total" value="≈ 7,15 €" hint="Ce que le transfert vous coûte vraiment" />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Les chiffres exacts dépendent des taux et tarifs du jour. Le moteur de calcul est le même que
          celui utilisé par le comparateur.
        </p>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-soft sm:p-8">
        <h2 className="text-xl font-semibold text-slate-950">D&apos;où viennent nos données ?</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
          <li>
            <strong>Taux mi-marché</strong> : mis à jour quotidiennement à partir de sources publiques
            (exchangerate.host / Banque centrale européenne). Les parités du Franc CFA (XOF, XAF) sont
            fixes vis-à-vis de l&apos;euro (1 € = 655,957).
          </li>
          <li>
            <strong>Tarifs des prestataires</strong> : normalisés à partir de la base « Remittance Prices
            Worldwide » de la Banque Mondiale, avec des données de démonstration en secours.
          </li>
          <li>
            Chaque couloir affiche sa <strong>date de dernière mise à jour</strong>. Tant que les données
            en direct ne sont pas disponibles, le comparateur s&apos;appuie sur des valeurs de démonstration
            clairement signalées.
          </li>
        </ul>
      </section>

      <section className="rounded-[2rem] bg-amber-50 p-6 text-sm leading-relaxed text-amber-900 sm:p-8">
        <h2 className="text-lg font-semibold">Rappel important</h2>
        <p className="mt-2">
          Fikamni est un <strong>produit d&apos;information</strong> et n&apos;est pas un prestataire de services de
          paiement. Nous ne détenons pas de fonds et n&apos;effectuons aucun transfert. Vérifiez toujours les
          conditions finales sur le site du prestataire. Certains liens sont des liens d&apos;affiliation, sans
          incidence sur le classement.
        </p>
        <p className="mt-3">
          <Link href="/" className="font-semibold underline">
            Revenir au comparateur
          </Link>
        </p>
      </section>
    </main>
  );
}
