import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {CurrencyCode} from '@/lib/engine';
import {DEMO_RATES_PER_EUR} from '@/lib/demo-data';

/**
 * Historique des taux mi-marché (base EUR) pour tracer l'évolution du coût réel.
 *
 * ⚠️ Module SERVEUR (accès disque). Les pages calculent la série côté serveur et
 * la passent au composant graphique client.
 *
 * En l'absence de `data/rate-history.json` (accumulé jour après jour par le
 * script `fetch-rates`), on génère un historique de DÉMONSTRATION déterministe :
 * réaliste, stable entre deux rendus, avec les parités CFA plates.
 */

export interface RateHistoryPoint {
  /** Date au format YYYY-MM-DD (UTC). */
  date: string;
  ratesPerEur: Record<CurrencyCode, number>;
}

export interface CorridorRatePoint {
  date: string;
  rate: number;
}

/** Devises à parité fixe avec l'euro (pas de variation historique). */
const PEGGED: ReadonlySet<CurrencyCode> = new Set<CurrencyCode>(['EUR', 'XOF', 'XAF']);

/** Amplitude de variation démo par devise (fraction du taux). */
const DEMO_AMPLITUDE: Partial<Record<CurrencyCode, number>> = {
  GBP: 0.012,
  USD: 0.012,
  CAD: 0.012,
  MAD: 0.02,
  NGN: 0.05,
  CDF: 0.045,
  GHS: 0.04,
  KES: 0.03
};

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash = Math.imul(hash ^ input.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

/** PRNG déterministe (mulberry32) pour un historique reproductible. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Génère un historique démo déterministe sur `days` jours (du plus ancien au plus récent). */
export function generateDemoHistory(days = 90, endDate: Date = new Date()): RateHistoryPoint[] {
  const currencies = Object.keys(DEMO_RATES_PER_EUR) as CurrencyCode[];
  const phases: Record<string, number> = {};
  for (const currency of currencies) {
    phases[currency] = mulberry32(hashSeed(currency))() * Math.PI * 2;
  }
  const rng: Record<string, () => number> = {};
  for (const currency of currencies) {
    rng[currency] = mulberry32(hashSeed(`${currency}-walk`));
  }

  const points: RateHistoryPoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const dayOffset = days - 1 - i; // i=0 → jour le plus ancien
    const date = new Date(endDate.getTime());
    date.setUTCDate(date.getUTCDate() - dayOffset);

    const ratesPerEur = {} as Record<CurrencyCode, number>;
    const t = days > 1 ? i / (days - 1) : 1;
    for (const currency of currencies) {
      const base = DEMO_RATES_PER_EUR[currency];
      if (PEGGED.has(currency)) {
        ratesPerEur[currency] = base;
        continue;
      }
      if (dayOffset === 0) {
        // Le dernier point colle au taux courant de la démo.
        ratesPerEur[currency] = base;
        continue;
      }
      const amplitude = DEMO_AMPLITUDE[currency] ?? 0.015;
      const wave = Math.sin(i / 9 + phases[currency]) * amplitude * 0.6;
      const noise = (rng[currency]() - 0.5) * amplitude * 0.4 * (1 - t);
      const factor = 1 + wave + noise;
      ratesPerEur[currency] = Math.round(base * factor * 1e6) / 1e6;
    }
    points.push({date: toIsoDate(date), ratesPerEur});
  }
  return points;
}

let cachedHistory: RateHistoryPoint[] | null = null;

/** Charge l'historique depuis `data/rate-history.json`, sinon génère la démo. */
export function loadRateHistory(): RateHistoryPoint[] {
  if (cachedHistory) {
    return cachedHistory;
  }
  try {
    const filePath = join(process.cwd(), 'data', 'rate-history.json');
    const raw = JSON.parse(readFileSync(filePath, 'utf8')) as RateHistoryPoint[];
    if (Array.isArray(raw) && raw.length > 0) {
      cachedHistory = raw;
      return cachedHistory;
    }
  } catch {
    // Fichier absent : on génère la démo.
  }
  cachedHistory = generateDemoHistory();
  return cachedHistory;
}

/** Série (date, taux) d'un couloir donné, du plus ancien au plus récent. */
export function corridorRateSeries(
  history: RateHistoryPoint[],
  from: CurrencyCode,
  to: CurrencyCode
): CorridorRatePoint[] {
  const series: CorridorRatePoint[] = [];
  for (const point of history) {
    const fromPerEur = point.ratesPerEur[from];
    const toPerEur = point.ratesPerEur[to];
    if (fromPerEur && toPerEur) {
      series.push({date: point.date, rate: Math.round((toPerEur / fromPerEur) * 1e4) / 1e4});
    }
  }
  return series;
}

/**
 * Ajoute (ou remplace) le point du jour et borne l'historique à `maxDays`.
 * PURE : utilisée par `scripts/fetch-rates.ts` pour accumuler les taux réels.
 */
export function appendSnapshot(
  history: RateHistoryPoint[],
  date: string,
  ratesPerEur: Record<CurrencyCode, number>,
  maxDays = 120
): RateHistoryPoint[] {
  const withoutToday = history.filter((point) => point.date !== date);
  const next = [...withoutToday, {date, ratesPerEur}];
  next.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return next.slice(-maxDays);
}
