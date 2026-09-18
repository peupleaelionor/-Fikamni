import {appendFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {NextResponse, type NextRequest} from 'next/server';
import {validateAlertInput} from '@/lib/alerts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Capture des demandes d'alerte de taux : `POST /api/alerts`.
 *
 * On valide l'entrée, on journalise (logs Vercel = capture fiable), et on tente
 * une persistance best-effort en JSON Lines.
 *
 * ⚠️ La DÉLIVRANCE des notifications (email/WhatsApp quand le meilleur prix
 * baisse) nécessite un store (KV/DB) + un worker planifié + un fournisseur
 * (Resend, WhatsApp Business API…). Cet endpoint pose la brique de collecte ;
 * voir le README pour le câblage production.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ok: false, error: 'JSON invalide.'}, {status: 400});
  }

  const result = validateAlertInput((body ?? {}) as Record<string, unknown>);
  if (!result.ok) {
    return NextResponse.json({ok: false, error: result.error}, {status: 400});
  }

  // Capture fiable via les logs.
  console.log(JSON.stringify({event: 'rate_alert_subscribe', ...result.value}));

  // Persistance best-effort (échoue silencieusement sur un FS en lecture seule).
  try {
    const dir = join(process.cwd(), 'data');
    mkdirSync(dir, {recursive: true});
    appendFileSync(join(dir, 'alerts.json'), `${JSON.stringify(result.value)}\n`, 'utf8');
  } catch {
    // Ignoré : la capture par log suffit en environnement sans FS inscriptible.
  }

  return NextResponse.json({ok: true, message: 'Alerte enregistrée.'}, {status: 201});
}
