import Link from 'next/link';

/**
 * Pied de page global (composant serveur) portant les mentions légales clés :
 * - produit d'information uniquement (Fikamni n'est pas un PSP) ;
 * - divulgation d'affiliation.
 * Ces disclaimers sont volontairement présents sur toutes les pages.
 */
export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Produit d&apos;information</p>
            <p className="text-sm leading-relaxed text-slate-600">
              Fikamni est un comparateur indépendant à visée informative. Nous ne sommes pas un
              prestataire de services de paiement (PSP), ne détenons pas de fonds et n&apos;exécutons aucun
              transfert. Les montants et taux affichés sont des estimations : vérifiez toujours les
              conditions finales sur le site du prestataire avant d&apos;envoyer de l&apos;argent.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Divulgation d&apos;affiliation</p>
            <p className="text-sm leading-relaxed text-slate-600">
              Certains liens vers les prestataires sont des liens d&apos;affiliation : Fikamni peut percevoir
              une commission si vous ouvrez un compte ou effectuez un transfert, sans surcoût pour vous.
              Cette rémunération n&apos;influence pas le classement, fondé uniquement sur le coût réel.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getUTCFullYear()} Fikamni — L&apos;argent qui arrive, en entier, chez les siens.</p>
          <nav className="flex gap-4">
            <Link href="/methodologie" className="transition hover:text-emerald-600">
              Méthodologie
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
