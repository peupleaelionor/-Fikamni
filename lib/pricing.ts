import {
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
