// Devises d'envoi (zone euro, Royaume-Uni, États-Unis, Canada) et devises de
// réception (Phase 1 : 10 pays africains). On garde une union fermée pour que
// TypeScript détecte toute devise oubliée dans les tables de taux et de tarifs.
export type SendCurrencyCode = 'EUR' | 'GBP' | 'USD' | 'CAD';
export type ReceiveCurrencyCode = 'XAF' | 'XOF' | 'NGN' | 'CDF' | 'MAD' | 'GHS' | 'KES';
export type CurrencyCode = SendCurrencyCode | ReceiveCurrencyCode;
export type Locale = 'fr' | 'en';
export type PayoutMethod = 'bank' | 'cash' | 'mobile';

export interface TransferOfferInput {
  providerId: string;
  providerName: string;
  corridorId: string;
  sendAmount: number;
  sendCurrency: CurrencyCode;
  receiveCurrency: CurrencyCode;
  fixedFee: number;
  variableFeeRate: number;
  midMarketRate: number;
  providerRate: number;
  receiveFee: number;
  speedLabel: string;
  payoutMethod: PayoutMethod;
}

export interface RankedTransferOffer extends TransferOfferInput {
  debitedAmount: number;
  directFeeAmount: number;
  hiddenFxCost: number;
  receiveFeeInSendCurrency: number;
  totalRealCost: number;
  recipientAmount: number;
  midMarketRecipientAmount: number;
  recipientShortfall: number;
  effectiveRate: number;
  rankingScore: number;
}

const roundToTwo = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

function ensurePositiveNumber(name: string, value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} doit être un nombre positif.`);
  }
}

export function calculateRankedOffer(offer: TransferOfferInput): RankedTransferOffer {
  // On valide ici les entrées pour garder une fonction pure, prévisible et testable.
  ensurePositiveNumber('sendAmount', offer.sendAmount);
  ensurePositiveNumber('fixedFee', offer.fixedFee);
  ensurePositiveNumber('variableFeeRate', offer.variableFeeRate);
  ensurePositiveNumber('midMarketRate', offer.midMarketRate);
  ensurePositiveNumber('providerRate', offer.providerRate);
  ensurePositiveNumber('receiveFee', offer.receiveFee);

  if (offer.sendAmount === 0) {
    throw new Error('sendAmount doit être supérieur à zéro.');
  }

  if (offer.midMarketRate === 0 || offer.providerRate === 0) {
    throw new Error('Les taux de change doivent être supérieurs à zéro.');
  }

  const directFeeAmount = roundToTwo(offer.fixedFee + offer.sendAmount * offer.variableFeeRate);
  const debitedAmount = roundToTwo(offer.sendAmount + directFeeAmount);
  const midMarketRecipientAmount = roundToTwo(offer.sendAmount * offer.midMarketRate);
  const convertedRecipientAmount = offer.sendAmount * offer.providerRate;
  const recipientAmount = roundToTwo(Math.max(convertedRecipientAmount - offer.receiveFee, 0));
  const recipientShortfall = roundToTwo(Math.max(midMarketRecipientAmount - recipientAmount, 0));

  // Le coût caché FX mesure la perte liée à un taux fournisseur moins bon que le taux médian.
  const hiddenFxCost = roundToTwo(
    Math.max(offer.sendAmount * (offer.midMarketRate - offer.providerRate), 0) / offer.midMarketRate
  );
  const receiveFeeInSendCurrency = roundToTwo(offer.receiveFee / offer.midMarketRate);
  const totalRealCost = roundToTwo(directFeeAmount + hiddenFxCost + receiveFeeInSendCurrency);
  const effectiveRate = roundToTwo(recipientAmount / offer.sendAmount);
  const rankingScore = roundToTwo(recipientAmount / debitedAmount);

  return {
    ...offer,
    debitedAmount,
    directFeeAmount,
    hiddenFxCost,
    receiveFeeInSendCurrency,
    totalRealCost,
    recipientAmount,
    midMarketRecipientAmount,
    recipientShortfall,
    effectiveRate,
    rankingScore
  };
}

export function rankTransferOffers(offers: TransferOfferInput[]): RankedTransferOffer[] {
  return [...offers]
    .map(calculateRankedOffer)
    .sort((left, right) => {
      if (left.totalRealCost !== right.totalRealCost) {
        return left.totalRealCost - right.totalRealCost;
      }

      if (left.recipientAmount !== right.recipientAmount) {
        return right.recipientAmount - left.recipientAmount;
      }

      return right.rankingScore - left.rankingScore;
    });
}
