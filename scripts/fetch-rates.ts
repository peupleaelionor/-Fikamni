/**
 * Récupère les taux de change mi-marché (base EUR) et écrit `data/rates.json`,
 * puis accumule le point du jour dans `data/rate-history.json`.
 *
 * La logique réseau (exchangerate.host → ECB → démo) vit dans
 * `lib/rates-fetch.ts`, partagée avec la route cron. Ce script se contente de
 * l'exécuter et d'écrire les fichiers consommés par la couche données.
 *
 * Exécution : `npm run fetch:rates` (via tsx).
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fetchMidMarketRates} from '@/lib/rates-fetch';
import {appendSnapshot, type RateHistoryPoint} from '@/lib/rate-history';

function readExistingHistory(historyPath: string): RateHistoryPoint[] {
  if (!existsSync(historyPath)) {
    return [];
  }
  try {
    const raw = JSON.parse(readFileSync(historyPath, 'utf8')) as RateHistoryPoint[];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

async function main() {
  const snapshot = await fetchMidMarketRates();
  const dir = join(process.cwd(), 'data');
  mkdirSync(dir, {recursive: true});

  writeFileSync(join(dir, 'rates.json'), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  // Accumulation de l'historique réel (jour après jour).
  const historyPath = join(dir, 'rate-history.json');
  const today = snapshot.updatedAt.slice(0, 10);
  const history = appendSnapshot(readExistingHistory(historyPath), today, snapshot.ratesPerEur);
  writeFileSync(historyPath, `${JSON.stringify(history, null, 2)}\n`, 'utf8');

  console.log(
    `✓ data/rates.json (source: ${snapshot.source}, ${Object.keys(snapshot.ratesPerEur).length} devises) ` +
      `+ data/rate-history.json (${history.length} points).`
  );
}

main().catch((error) => {
  console.error('Échec fetch-rates :', error);
  process.exit(1);
});
