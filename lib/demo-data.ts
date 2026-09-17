import type {CurrencyCode} from '@/lib/engine';

/**
 * Données démonstration — FALLBACK.
 *
 * Tant que les scripts `fetch-rates` (taux mi-marché) et `ingest-rpw` (tarifs
 * Banque Mondiale) n'ont pas produit `data/rates.json` / `data/tariffs.json`,
 * l'application s'appuie sur ces valeurs. Elles sont réalistes mais fixes : ce
 * ne sont PAS des taux en temps réel. La date ci-dessous est affichée comme
 * « dernière mise à jour » des couloirs servis par la démo.
 */

/** Taux mi-marché exprimés en unités de devise pour 1 EUR (base EUR, comme l'ECB). */
export const DEMO_RATES_PER_EUR: Record<CurrencyCode, number> = {
  // Devises d'envoi.
  EUR: 1,
  GBP: 0.85,
  USD: 1.08,
  CAD: 1.47,
  // Devises de réception (Phase 1).
  XOF: 655.957, // Franc CFA (UEMOA) — parité fixe avec l'euro.
  XAF: 655.957, // Franc CFA (CEMAC) — parité fixe avec l'euro.
  CDF: 2900, // Franc congolais.
  MAD: 10.75, // Dirham marocain.
  NGN: 1650, // Naira nigérian.
  GHS: 15.8, // Cedi ghanéen.
  KES: 155 // Shilling kényan.
};

/** Date de la photographie des taux démo (ISO 8601). */
export const DEMO_RATES_UPDATED_AT = '2026-01-15T00:00:00.000Z';

/**
 * Profil tarifaire démo d'un prestataire, indépendant du couloir.
 *
 * - `fxSpreadRate` : marge de change appliquée sous le taux mi-marché
 *   (0.01 = le prestataire donne un taux 1 % moins bon).
 * - `receiveFeeRate` : frais côté réception exprimés en fraction du montant
 *   reçu au taux mi-marché (0 pour la plupart). Ils sont convertis en montant
 *   absolu dans la devise de réception au moment du calcul, ce qui les met
 *   automatiquement à l'échelle de chaque devise.
 */
export interface DemoTariffProfile {
  providerId: string;
  fixedFee: number;
  variableFeeRate: number;
  fxSpreadRate: number;
  receiveFeeRate: number;
}

/**
 * Tarifs démo par prestataire (appliqués à tous les couloirs). Les écarts de
 * marge de change constituent le principal facteur de différenciation, comme
 * dans la réalité du marché des transferts.
 */
export const DEMO_TARIFF_PROFILES: DemoTariffProfile[] = [
  {providerId: 'sango-pay', fixedFee: 1.99, variableFeeRate: 0.005, fxSpreadRate: 0.008, receiveFeeRate: 0},
  {providerId: 'baobab-remit', fixedFee: 2.9, variableFeeRate: 0.004, fxSpreadRate: 0.015, receiveFeeRate: 0},
  {providerId: 'sahel-cash', fixedFee: 0, variableFeeRate: 0.018, fxSpreadRate: 0.022, receiveFeeRate: 0},
  {providerId: 'teranga-money', fixedFee: 1.5, variableFeeRate: 0.009, fxSpreadRate: 0.012, receiveFeeRate: 0.002},
  {providerId: 'kina-transfer', fixedFee: 3.5, variableFeeRate: 0.002, fxSpreadRate: 0.01, receiveFeeRate: 0.001},
  {providerId: 'zamani-send', fixedFee: 0, variableFeeRate: 0.015, fxSpreadRate: 0.014, receiveFeeRate: 0},
  {providerId: 'ubuntu-wallet', fixedFee: 0.99, variableFeeRate: 0.006, fxSpreadRate: 0.006, receiveFeeRate: 0}
];

/** Date de la grille tarifaire démo (ISO 8601). */
export const DEMO_TARIFFS_UPDATED_AT = '2026-01-15T00:00:00.000Z';
