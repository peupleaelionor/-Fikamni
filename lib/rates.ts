import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {CurrencyCode} from '@/lib/engine';
import {DEMO_RATES_PER_EUR, DEMO_RATES_UPDATED_AT} from '@/lib/demo-data';

/**
 * Couche « taux mi-marché ».
 *
 * ⚠️ Module SERVEUR uniquement (accès disque). Il ne doit jamais être importé
 * par un composant client : le comparateur reçoit les taux déjà sérialisés.
 *
 * Source de vérité : `data/rates.json` produit par `scripts/fetch-rates.ts`
 * (taux mi-marché ECB / exchangerate.host). En son absence, on retombe sur la
 * photographie démo. La fonction de normalisation est pure pour être testable.
 */

export interface RatesSnapshot {
  base: 'EUR';
  updatedAt: string;
  source: string;
  /** Unités de devise pour 1 EUR (base EUR, comme l'ECB). */
  ratesPerEur: Record<CurrencyCode, number>;
}

/** Parités fixes légales du Franc CFA avec l'euro — jamais issues d'une API. */
const CFA_PEG_PER_EUR = 655.957;
const PEGGED_CURRENCIES: CurrencyCode[] = ['XOF', 'XAF'];

const ALL_CURRENCIES = Object.keys(DEMO_RATES_PER_EUR) as CurrencyCode[];

/** Photographie démo, utilisée comme secours et pour combler les devises manquantes. */
export function demoRatesSnapshot(): RatesSnapshot {
  return {
    base: 'EUR',
    updatedAt: DEMO_RATES_UPDATED_AT,
    source: 'demo',
    ratesPerEur: {...DEMO_RATES_PER_EUR}
  };
}

interface RawRatesPayload {
  updatedAt?: string;
  source?: string;
  /** Taux base EUR fournis par l'API (nom compatible exchangerate.host / ECB). */
  ratesPerEur?: Partial<Record<string, number>>;
}

/**
 * Normalise une charge utile de taux base EUR :
 * - ne conserve que les devises connues et strictement positives ;
 * - force les parités CFA ;
 * - complète les devises absentes avec la démo.
 * PURE : réutilisée par `scripts/fetch-rates.ts` et testée unitairement.
 */
export function normalizeRatesPayload(raw: RawRatesPayload): RatesSnapshot {
  const ratesPerEur: Record<CurrencyCode, number> = {...DEMO_RATES_PER_EUR};
  const provided = raw.ratesPerEur ?? {};

  for (const currency of ALL_CURRENCIES) {
    const value = provided[currency];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      ratesPerEur[currency] = value;
    }
  }

  for (const currency of PEGGED_CURRENCIES) {
    ratesPerEur[currency] = CFA_PEG_PER_EUR;
  }
  ratesPerEur.EUR = 1;

  return {
    base: 'EUR',
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    source: raw.source ?? 'unknown',
    ratesPerEur
  };
}

let cachedSnapshot: RatesSnapshot | null = null;

/** Charge les taux depuis `data/rates.json`, sinon retombe sur la démo. */
export function loadRatesSnapshot(): RatesSnapshot {
  if (cachedSnapshot) {
    return cachedSnapshot;
  }

  try {
    const filePath = join(process.cwd(), 'data', 'rates.json');
    const raw = JSON.parse(readFileSync(filePath, 'utf8')) as RawRatesPayload;
    cachedSnapshot = normalizeRatesPayload(raw);
  } catch {
    // Fichier absent ou illisible : on utilise la démo.
    cachedSnapshot = demoRatesSnapshot();
  }

  return cachedSnapshot;
}

/**
 * Taux de change d'une devise d'envoi vers une devise de réception :
 * unités reçues pour 1 unité envoyée = (perEur[to]) / (perEur[from]).
 */
export function rateBetween(snapshot: RatesSnapshot, from: CurrencyCode, to: CurrencyCode): number {
  const fromPerEur = snapshot.ratesPerEur[from];
  const toPerEur = snapshot.ratesPerEur[to];
  if (!fromPerEur || !toPerEur) {
    throw new Error(`Taux indisponible pour ${from}→${to}.`);
  }
  return toPerEur / fromPerEur;
}
