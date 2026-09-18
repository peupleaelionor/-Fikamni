import type {CurrencyCode, ReceiveCurrencyCode, SendCurrencyCode} from '@/lib/engine';

/**
 * Couche géographique de Fikamni.
 *
 * On modélise un « couloir » comme un couple (pays d'envoi → pays de réception).
 * Les codes pays suivent la norme ISO 3166-1 alpha-2 en minuscules : ils servent
 * d'identifiants stables dans les URL (`/corridor/[from]/[to]`) et les logs.
 *
 * Ce module est volontairement PUR (aucun accès disque / réseau) afin de pouvoir
 * être importé aussi bien côté serveur que côté client.
 */

export type SendCountryCode = 'fr' | 'be' | 'de' | 'gb' | 'us' | 'ca';
export type ReceiveCountryCode =
  | 'cd'
  | 'sn'
  | 'ci'
  | 'ml'
  | 'cm'
  | 'cg'
  | 'ma'
  | 'ng'
  | 'gh'
  | 'ke';

export interface SendCountry {
  code: SendCountryCode;
  nameFr: string;
  nameEn: string;
  flag: string;
  currency: SendCurrencyCode;
  /**
   * Article défini utilisé après « depuis » (ex. « depuis la France »,
   * « depuis l'Allemagne »). On concatène sans espace : les articles élidés
   * finissent par une apostrophe.
   */
  fromArticleFr: string;
  /** Montant d'envoi proposé par défaut dans le comparateur. */
  defaultAmount: number;
}

export interface ReceiveCountry {
  code: ReceiveCountryCode;
  nameFr: string;
  nameEn: string;
  flag: string;
  currency: ReceiveCurrencyCode;
  /**
   * Préposition + éventuel article utilisés dans « Envoyer de l'argent ___ PAYS »
   * (ex. « au Sénégal », « en Côte d'Ivoire »). Trailing space inclus.
   */
  toPrepositionFr: string;
}

export const sendCountries: SendCountry[] = [
  {code: 'fr', nameFr: 'France', nameEn: 'France', flag: '🇫🇷', currency: 'EUR', fromArticleFr: 'la ', defaultAmount: 200},
  {code: 'be', nameFr: 'Belgique', nameEn: 'Belgium', flag: '🇧🇪', currency: 'EUR', fromArticleFr: 'la ', defaultAmount: 200},
  {code: 'de', nameFr: 'Allemagne', nameEn: 'Germany', flag: '🇩🇪', currency: 'EUR', fromArticleFr: "l'", defaultAmount: 200},
  {code: 'gb', nameFr: 'Royaume-Uni', nameEn: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', fromArticleFr: 'le ', defaultAmount: 150},
  {code: 'us', nameFr: 'États-Unis', nameEn: 'United States', flag: '🇺🇸', currency: 'USD', fromArticleFr: 'les ', defaultAmount: 200},
  {code: 'ca', nameFr: 'Canada', nameEn: 'Canada', flag: '🇨🇦', currency: 'CAD', fromArticleFr: 'le ', defaultAmount: 250}
];

export const receiveCountries: ReceiveCountry[] = [
  {code: 'cd', nameFr: 'Congo (RDC)', nameEn: 'DR Congo', flag: '🇨🇩', currency: 'CDF', toPrepositionFr: 'au '},
  {code: 'sn', nameFr: 'Sénégal', nameEn: 'Senegal', flag: '🇸🇳', currency: 'XOF', toPrepositionFr: 'au '},
  {code: 'ci', nameFr: "Côte d'Ivoire", nameEn: 'Ivory Coast', flag: '🇨🇮', currency: 'XOF', toPrepositionFr: 'en '},
  {code: 'ml', nameFr: 'Mali', nameEn: 'Mali', flag: '🇲🇱', currency: 'XOF', toPrepositionFr: 'au '},
  {code: 'cm', nameFr: 'Cameroun', nameEn: 'Cameroon', flag: '🇨🇲', currency: 'XAF', toPrepositionFr: 'au '},
  {code: 'cg', nameFr: 'Congo-Brazzaville', nameEn: 'Republic of the Congo', flag: '🇨🇬', currency: 'XAF', toPrepositionFr: 'au '},
  {code: 'ma', nameFr: 'Maroc', nameEn: 'Morocco', flag: '🇲🇦', currency: 'MAD', toPrepositionFr: 'au '},
  {code: 'ng', nameFr: 'Nigeria', nameEn: 'Nigeria', flag: '🇳🇬', currency: 'NGN', toPrepositionFr: 'au '},
  {code: 'gh', nameFr: 'Ghana', nameEn: 'Ghana', flag: '🇬🇭', currency: 'GHS', toPrepositionFr: 'au '},
  {code: 'ke', nameFr: 'Kenya', nameEn: 'Kenya', flag: '🇰🇪', currency: 'KES', toPrepositionFr: 'au '}
];

export interface Corridor {
  /** Identifiant du couloir, ex. « fr-sn ». */
  id: string;
  from: SendCountry;
  to: ReceiveCountry;
  sendCurrency: SendCurrencyCode;
  receiveCurrency: ReceiveCurrencyCode;
  defaultAmount: number;
}

const sendByCode = new Map<string, SendCountry>(sendCountries.map((country) => [country.code, country]));
const receiveByCode = new Map<string, ReceiveCountry>(receiveCountries.map((country) => [country.code, country]));

/** Construit l'identifiant canonique d'un couloir. */
export function corridorId(from: string, to: string): string {
  return `${from}-${to}`;
}

export function getSendCountry(code: string): SendCountry | undefined {
  return sendByCode.get(code);
}

export function getReceiveCountry(code: string): ReceiveCountry | undefined {
  return receiveByCode.get(code);
}

/**
 * Résout un couloir à partir de ses codes pays. Renvoie `undefined` si l'un des
 * deux pays est inconnu (utilisé pour renvoyer un 404 sur les pages SEO).
 */
export function getCorridor(from: string, to: string): Corridor | undefined {
  const fromCountry = sendByCode.get(from);
  const toCountry = receiveByCode.get(to);
  if (!fromCountry || !toCountry) {
    return undefined;
  }
  return {
    id: corridorId(from, to),
    from: fromCountry,
    to: toCountry,
    sendCurrency: fromCountry.currency,
    receiveCurrency: toCountry.currency,
    defaultAmount: fromCountry.defaultAmount
  };
}

/** Liste exhaustive des couloirs Phase 1 (produit cartésien envoi × réception). */
export function listCorridors(): Corridor[] {
  const corridors: Corridor[] = [];
  for (const from of sendCountries) {
    for (const to of receiveCountries) {
      corridors.push({
        id: corridorId(from.code, to.code),
        from,
        to,
        sendCurrency: from.currency,
        receiveCurrency: to.currency,
        defaultAmount: from.defaultAmount
      });
    }
  }
  return corridors;
}

/** Paramètres statiques pour `generateStaticParams` sur `/corridor/[from]/[to]`. */
export function listCorridorParams(): Array<{from: string; to: string}> {
  return listCorridors().map((corridor) => ({from: corridor.from.code, to: corridor.to.code}));
}

/**
 * Titre SEO du couloir : « Envoyer de l'argent au Sénégal depuis la France ».
 * On utilise les prépositions par pays pour un français correct.
 */
export function corridorTitleFr(corridor: Corridor): string {
  return `Envoyer de l'argent ${corridor.to.toPrepositionFr}${corridor.to.nameFr} depuis ${corridor.from.fromArticleFr}${corridor.from.nameFr}`;
}

export function corridorTitleEn(corridor: Corridor): string {
  return `Send money to ${corridor.to.nameEn} from ${corridor.from.nameEn}`;
}

/** Libellé court « France → Sénégal » pour les listes déroulantes. */
export function corridorShortLabel(corridor: Corridor, locale: 'fr' | 'en'): string {
  const from = locale === 'fr' ? corridor.from.nameFr : corridor.from.nameEn;
  const to = locale === 'fr' ? corridor.to.nameFr : corridor.to.nameEn;
  return `${corridor.from.flag} ${from} → ${corridor.to.flag} ${to}`;
}

/** Devises de réception à 0 décimale à l'affichage. */
export const ZERO_DECIMAL_CURRENCIES: ReadonlySet<CurrencyCode> = new Set<CurrencyCode>([
  'XAF',
  'XOF',
  'CDF'
]);
