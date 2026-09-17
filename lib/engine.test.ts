import {describe, expect, it} from 'vitest';
import {calculateRankedOffer, rankTransferOffers, type TransferOfferInput} from './engine';

const baseOffer: TransferOfferInput = {
  providerId: 'alpha',
  providerName: 'Alpha Transfer',
  corridorId: 'fr-congo',
  sendAmount: 200,
  sendCurrency: 'EUR',
  receiveCurrency: 'XAF',
  fixedFee: 1.5,
  variableFeeRate: 0.01,
  midMarketRate: 650,
  providerRate: 640,
  receiveFee: 500,
  speedLabel: '30 min',
  payoutMethod: 'cash'
};

describe('calculateRankedOffer', () => {
  it('calcule le coût réel en intégrant frais visibles, marge FX et frais côté réception', () => {
    const result = calculateRankedOffer(baseOffer);

    expect(result.directFeeAmount).toBe(3.5);
    expect(result.debitedAmount).toBe(203.5);
    expect(result.hiddenFxCost).toBe(3.08);
    expect(result.receiveFeeInSendCurrency).toBe(0.77);
    expect(result.totalRealCost).toBe(7.35);
    expect(result.recipientAmount).toBe(127500);
    expect(result.midMarketRecipientAmount).toBe(130000);
    expect(result.recipientShortfall).toBe(2500);
    expect(result.effectiveRate).toBe(637.5);
    expect(result.rankingScore).toBe(626.54);
  });

  it('évite un coût FX caché négatif quand le taux fournisseur est meilleur que le taux médian', () => {
    const result = calculateRankedOffer({...baseOffer, providerRate: 655, receiveFee: 0});

    expect(result.hiddenFxCost).toBe(0);
    expect(result.recipientAmount).toBe(131000);
  });

  it('rejette une entrée invalide', () => {
    expect(() => calculateRankedOffer({...baseOffer, sendAmount: -1})).toThrow(/sendAmount/);
  });
});

describe('rankTransferOffers', () => {
  it('classe les offres par coût réel croissant puis par meilleur montant reçu', () => {
    const offers: TransferOfferInput[] = [
      baseOffer,
      {...baseOffer, providerId: 'beta', providerName: 'Beta Cash', fixedFee: 0.5, providerRate: 638},
      {...baseOffer, providerId: 'gamma', providerName: 'Gamma Send', fixedFee: 1, providerRate: 645, receiveFee: 0}
    ];

    const result = rankTransferOffers(offers);

    expect(result.map((offer) => offer.providerId)).toEqual(['gamma', 'beta', 'alpha']);
    expect(result[0]?.totalRealCost).toBeLessThan(result[1]?.totalRealCost ?? Infinity);
  });
});
