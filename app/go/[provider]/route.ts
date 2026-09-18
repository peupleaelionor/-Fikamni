import {NextResponse, type NextRequest} from 'next/server';
import {buildAffiliateUrl, getProvider} from '@/lib/providers';

/**
 * Redirection d'affiliation : `/go/[provider]?corridor=fr-sn&amount=200`.
 *
 * 1. On journalise le clic (couloir, montant, prestataire) — en production ce
 *    log serait envoyé à un collecteur d'analytics ; ici on écrit une ligne JSON
 *    structurée, lisible dans les logs Vercel.
 * 2. On redirige (302) vers l'URL d'affiliation du prestataire, enrichie des
 *    paramètres de tracking.
 *
 * Un prestataire inconnu renvoie vers l'accueil plutôt qu'une erreur brute.
 */
export function GET(request: NextRequest, context: {params: Promise<{provider: string}>}) {
  return handle(request, context);
}

async function handle(request: NextRequest, context: {params: Promise<{provider: string}>}) {
  const {provider: providerId} = await context.params;
  const provider = getProvider(providerId);

  const corridor = request.nextUrl.searchParams.get('corridor') ?? undefined;
  const amount = request.nextUrl.searchParams.get('amount') ?? undefined;

  if (!provider) {
    console.warn(
      JSON.stringify({event: 'affiliate_click_unknown_provider', providerId, corridor, amount, ts: new Date().toISOString()})
    );
    return NextResponse.redirect(new URL('/', request.url), {status: 302});
  }

  // Journal du clic : la brique de base du modèle économique (mesure d'affiliation).
  console.log(
    JSON.stringify({
      event: 'affiliate_click',
      provider: provider.id,
      corridor: corridor ?? null,
      amount: amount ?? null,
      ts: new Date().toISOString()
    })
  );

  const target = buildAffiliateUrl(provider, {corridor, amount});
  return NextResponse.redirect(target, {status: 302});
}
