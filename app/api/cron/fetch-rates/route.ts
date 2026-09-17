import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {NextResponse, type NextRequest} from 'next/server';
import {fetchMidMarketRates} from '@/lib/rates-fetch';

// Nécessite le runtime Node (fs + fetch réseau) et un rendu dynamique.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Point d'entrée du cron Vercel (voir `vercel.json`). Récupère les taux
 * mi-marché et tente de persister `data/rates.json`.
 *
 * ⚠️ Sur Vercel le système de fichiers est en lecture seule hors `/tmp` :
 * l'écriture peut échouer (persisted: false). Pour une persistance fiable en
 * production, brancher un store (Vercel Blob / KV) ou déclencher un redéploiement
 * après exécution du script en CI. La réponse renvoie toujours les taux frais.
 */
export async function GET(request: NextRequest) {
  // Protection optionnelle : Vercel Cron envoie « Authorization: Bearer <CRON_SECRET> ».
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get('authorization');
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({error: 'unauthorized'}, {status: 401});
    }
  }

  const snapshot = await fetchMidMarketRates();

  let persisted = false;
  try {
    const dir = join(process.cwd(), 'data');
    mkdirSync(dir, {recursive: true});
    writeFileSync(join(dir, 'rates.json'), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    persisted = true;
  } catch {
    // Système de fichiers en lecture seule (Vercel) : on renvoie tout de même les taux.
  }

  // Boucle de rafraîchissement des pages statiques : si un Deploy Hook Vercel est
  // configuré, on déclenche un redéploiement pour que le build (via `fetch:rates`)
  // reconstruise les pages avec les taux frais.
  let redeployTriggered = false;
  const deployHook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (deployHook) {
    try {
      const hookResponse = await fetch(deployHook, {method: 'POST', signal: AbortSignal.timeout(15000)});
      redeployTriggered = hookResponse.ok;
    } catch {
      // Le déclenchement du redéploiement est best-effort.
    }
  }

  return NextResponse.json({
    ok: true,
    persisted,
    redeployTriggered,
    source: snapshot.source,
    updatedAt: snapshot.updatedAt,
    currencies: Object.keys(snapshot.ratesPerEur).length
  });
}
