import {
  calculateRankedOffer,
  rankTransferOffers,
  type CurrencyCode,
  type Locale,
  type PayoutMethod,
  type RankedTransferOffer,
  type TransferOfferInput
} from '@/lib/engine';

/**
 * Couche de tarification PURE (aucune I/O) : elle assemble les entrées du moteur
 * à partir d'un couloir, d'une grille tarifaire et d'un montant, puis délègue le
 * classement à `rankTransferOffers`. Étant pure, elle est partagée entre le rendu
 * serveur (SEO) et le comparateur client (recalcul instantané au changement de
 * montant), et testée unitairement.
 */

/** Tarif d'un prestataire pour un couloir (issu de la démo ou de la base RPW). */
export interface CorridorTariff {
  providerId: string;
  fixedFee: number;
  variableFeeRate: number;
  /** Marge de change sous le taux mi-marché (0.01 = 1 % moins bon). */
  fxSpreadRate: number;
  /** Frais côté réception en fraction du montant reçu au taux mi-marché. */
  receiveFeeRate: number;
}

/** Métadonnées d'affichage d'un prestataire, indépendantes du tarif. */
export interface ProviderMeta {
  id: string;
  name: string;
  payoutMethod: PayoutMethod;
  speedLabelFr: string;
  speedLabelEn: string;
  speedMinutes: number;
}

/** Description minimale d'un couloir nécessaire au calcul. */
export interface CorridorPricing {
  corridorId: string;
  sendCurrency: CurrencyCode;
  receiveCurrency: CurrencyCode;
  /** Taux mi-marché : unités de devise de réception pour 1 unité de devise d'envoi. */
  midMarketRate: number;
}

const roundToTwo = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Transforme un tarif de couloir en entrée pour le moteur de calcul.
 * - `providerRate` dérive du taux mi-marché et de la marge de change.
 * - `receiveFee` (absolu) est mis à l'échelle de la devise de réception.
 */
export function tariffToOfferInput(
  corridor: CorridorPricing,
  tariff: CorridorTariff,
  provider: ProviderMeta,
  sendAmount: number,
  locale: Locale
): TransferOfferInput {
  const providerRate = corridor.midMarketRate * (1 - tariff.fxSpreadRate);
  const receiveFee = roundToTwo(tariff.receiveFeeRate * sendAmount * corridor.midMarketRate);

  return {
    providerId: provider.id,
    providerName: provider.name,
    corridorId: corridor.corridorId,
    sendAmount,
    sendCurrency: corridor.sendCurrency,
    receiveCurrency: corridor.receiveCurrency,
    fixedFee: tariff.fixedFee,
    variableFeeRate: tariff.variableFeeRate,
    midMarketRate: corridor.midMarketRate,
    providerRate,
    receiveFee,
    speedLabel: locale === 'fr' ? provider.speedLabelFr : provider.speedLabelEn,
    payoutMethod: provider.payoutMethod
  };
}

/**
 * Construit et classe les offres d'un couloir. Les tarifs dont le prestataire est
 * introuvable dans `providersById` sont ignorés (couloir/tarif orphelin).
 */
export function buildRankedOffers(
  corridor: CorridorPricing,
  tariffs: CorridorTariff[],
  providersById: Map<string, ProviderMeta>,
  sendAmount: number,
  locale: Locale
): RankedTransferOffer[] {
  const inputs: TransferOfferInput[] = [];
  for (const tariff of tariffs) {
    const provider = providersById.get(tariff.providerId);
    if (!provider) {
      continue;
    }
    inputs.push(tariffToOfferInput(corridor, tariff, provider, sendAmount, locale));
  }
  return rankTransferOffers(inputs);
}

/**
 * Mode inversé : « combien dois-je envoyer pour qu'ils reçoivent `targetReceive` ? ».
 *
 * Pour chaque prestataire, on résout le montant à envoyer tel que le montant reçu
 * égale la cible. Comme les frais côté réception dépendent eux-mêmes du montant
 * envoyé (fraction du montant reçu au taux mi-marché), on résout :
 *   reçu = envoi × (tauxFournisseur − tauxReception × tauxMiMarché) = cible
 * Les offres sont classées par montant débité croissant (le moins cher pour
 * délivrer la cible), puis par montant reçu décroissant.
 */
export function buildRankedOffersForTarget(
  corridor: CorridorPricing,
  tariffs: CorridorTariff[],
  providersById: Map<string, ProviderMeta>,
  targetReceive: number,
  locale: Locale
): RankedTransferOffer[] {
  const results: RankedTransferOffer[] = [];
  for (const tariff of tariffs) {
    const provider = providersById.get(tariff.providerId);
    if (!provider) {
      continue;
    }
    const denominator = corridor.midMarketRate * (1 - tariff.fxSpreadRate - tariff.receiveFeeRate);
    if (denominator <= 0) {
      continue; // Configuration tarifaire dégénérée : on ignore l'offre.
    }
    const requiredSend = roundToTwo(targetReceive / denominator);
    if (!(requiredSend > 0)) {
      continue;
    }
    results.push(calculateRankedOffer(tariffToOfferInput(corridor, tariff, provider, requiredSend, locale)));
  }

  return results.sort((left, right) => {
    if (left.debitedAmount !== right.debitedAmount) {
      return left.debitedAmount - right.debitedAmount;
    }
    return right.recipientAmount - left.recipientAmount;
  });
}

/** Filtres rapides appliqués côté client sur les offres déjà classées. */
export interface OfferFilters {
  /** Ne garder que les réceptions par wallet mobile. */
  mobileOnly?: boolean;
  /** Coût réel maximal en fraction du montant envoyé (ex. 0.02 = 2 %). */
  maxFeeRate?: number;
  /** Délai de réception maximal en minutes (ex. 60 = moins d'une heure). */
  maxSpeedMinutes?: number;
}

/** Indique si une offre passe les filtres (le délai vient des métadonnées prestataire). */
export function passesFilters(offer: RankedTransferOffer, speedMinutes: number, filters: OfferFilters): boolean {
  if (filters.mobileOnly && offer.payoutMethod !== 'mobile') {
    return false;
  }
  if (
    filters.maxFeeRate !== undefined &&
    offer.sendAmount > 0 &&
    offer.totalRealCost / offer.sendAmount > filters.maxFeeRate
  ) {
    return false;
  }
  if (filters.maxSpeedMinutes !== undefined && speedMinutes > filters.maxSpeedMinutes) {
    return false;
  }
  return true;
}
