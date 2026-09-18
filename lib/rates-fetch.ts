import {normalizeRatesPayload, type RatesSnapshot} from '@/lib/rates';

/**
 * Récupération réseau des taux mi-marché (base EUR). Module SERVEUR partagé
 * entre le script `scripts/fetch-rates.ts` et la route cron
 * `app/api/cron/fetch-rates`.
 *
 * Tolérant aux pannes : renvoie toujours un instantané valide (au pire la démo,
 * via `normalizeRatesPayload`).
 */

const TARGET_CURRENCIES = ['GBP', 'USD', 'CAD', 'XOF', 'XAF', 'CDF', 'MAD', 'NGN', 'GHS', 'KES'];

async function fetchFromExchangerateHost(): Promise<{rates: Record<string, number>; source: string} | null> {
  const key = process.env.EXCHANGERATE_ACCESS_KEY;
  const url = new URL('https://api.exchangerate.host/latest');
  url.searchParams.set('base', 'EUR');
  url.searchParams.set('symbols', TARGET_CURRENCIES.join(','));
  if (key) {
    url.searchParams.set('access_key', key);
  }

  try {
    const response = await fetch(url, {signal: AbortSignal.timeout(15000)});
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as {rates?: Record<string, number>};
    if (payload.rates && Object.keys(payload.rates).length > 0) {
      return {rates: payload.rates, source: 'exchangerate-host'};
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchFromEcb(): Promise<{rates: Record<string, number>; source: string} | null> {
  try {
    const response = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', {
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) {
      return null;
    }
    const xml = await response.text();
    const rates: Record<string, number> = {};
    const regex = /currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(xml)) !== null) {
      rates[match[1]] = Number(match[2]);
    }
    return Object.keys(rates).length > 0 ? {rates, source: 'ecb'} : null;
  } catch {
    return null;
  }
}

/** Récupère les taux (exchangerate.host → ECB → démo) et renvoie un instantané normalisé. */
export async function fetchMidMarketRates(): Promise<RatesSnapshot> {
  const result = (await fetchFromExchangerateHost()) ?? (await fetchFromEcb());

  return normalizeRatesPayload({
    ratesPerEur: result?.rates ?? {},
    // Si aucune source réseau n'a répondu, on reste sur la démo.
    source: result?.source ?? 'demo',
    updatedAt: new Date().toISOString()
  });
}
