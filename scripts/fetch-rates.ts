/**
 * Récupère les taux de change mi-marché (base EUR) et écrit `data/rates.json`.
 *
 * La logique réseau (exchangerate.host → ECB → démo) vit dans
 * `lib/rates-fetch.ts`, partagée avec la route cron. Ce script se contente de
 * l'exécuter et d'écrire le fichier consommé par la couche données.
 *
 * Exécution : `npm run fetch:rates` (via tsx).
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fetchMidMarketRates} from '@/lib/rates-fetch';

async function main() {
  const snapshot = await fetchMidMarketRates();
  const dir = join(process.cwd(), 'data');
  mkdirSync(dir, {recursive: true});
  writeFileSync(join(dir, 'rates.json'), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(
    `✓ data/rates.json écrit (source: ${snapshot.source}, ${Object.keys(snapshot.ratesPerEur).length} devises).`
  );
}

main().catch((error) => {
  console.error('Échec fetch-rates :', error);
  process.exit(1);
});
