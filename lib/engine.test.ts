import {describe, expect, it} from 'vitest';
import {calculateRankedOffer, rankTransferOffers, type TransferOfferInput} from './engine';

const baseOffer: TransferOfferInput = {
  providerId: 'alpha',
  providerName: 'Alpha Transfer',
  corridorId: 'fr-cd',
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

  it('additionne frais fixe et frais variable, et n’applique que le frais fixe quand le taux variable est nul', () => {
    const fixedOnly = calculateRankedOffer({
      ...baseOffer,
      sendAmount: 100,
      fixedFee: 4,
      variableFeeRate: 0,
      providerRate: 650, // taux = mi-marché → isole le frais fixe
      receiveFee: 0
    });

    expect(fixedOnly.directFeeAmount).toBe(4);
    expect(fixedOnly.debitedAmount).toBe(104);
    expect(fixedOnly.hiddenFxCost).toBe(0);
    expect(fixedOnly.receiveFeeInSendCurrency).toBe(0);
    expect(fixedOnly.totalRealCost).toBe(4);
  });

  it('mesure la marge de change comme l’écart entre taux fournisseur et taux mi-marché', () => {
    const withMargin = calculateRankedOffer({
      ...baseOffer,
      sendAmount: 100,
      fixedFee: 0,
      variableFeeRate: 0,
      midMarketRate: 10,
      providerRate: 9, // 1 point sous le mi-marché → 10 % de marge relative
      receiveFee: 0
    });

    // (100 × (10 − 9)) / 10 = 10 unités de coût caché dans la devise d'envoi.
    expect(withMargin.hiddenFxCost).toBe(10);
    expect(withMargin.recipientAmount).toBe(900);
    expect(withMargin.midMarketRecipientAmount).toBe(1000);
    expect(withMargin.recipientShortfall).toBe(100);
  });

  it('n’attribue jamais de marge de change négative quand le taux fournisseur dépasse le mi-marché', () => {
    const result = calculateRankedOffer({...baseOffer, providerRate: 655, receiveFee: 0});

    expect(result.hiddenFxCost).toBe(0);
    expect(result.recipientAmount).toBe(131000);
    expect(result.recipientShortfall).toBe(0);
  });

  it('reconvertit les frais côté réception dans la devise d’envoi au taux mi-marché', () => {
    const result = calculateRankedOffer({
      ...baseOffer,
      sendAmount: 100,
      fixedFee: 0,
      variableFeeRate: 0,
      midMarketRate: 10,
      providerRate: 10,
      receiveFee: 50 // 50 unités reçues ÷ 10 = 5 unités envoyées
    });

    expect(result.receiveFeeInSendCurrency).toBe(5);
    expect(result.totalRealCost).toBe(5);
    expect(result.recipientAmount).toBe(950);
  });

  it('rejette un montant négatif', () => {
    expect(() => calculateRankedOffer({...baseOffer, sendAmount: -1})).toThrow(/sendAmount/);
  });

  it('rejette un montant nul', () => {
    expect(() => calculateRankedOffer({...baseOffer, sendAmount: 0})).toThrow(/supérieur à zéro/);
  });

  it('rejette un taux de change nul', () => {
    expect(() => calculateRankedOffer({...baseOffer, providerRate: 0})).toThrow(/taux de change/);
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

  it('départage deux offres de même coût réel par le montant reçu le plus élevé', () => {
    // A et B ont un coût réel identique (10), mais B fait parvenir davantage.
    const offerA: TransferOfferInput = {
      ...baseOffer,
      providerId: 'a',
      sendAmount: 100,
      fixedFee: 0,
      variableFeeRate: 0,
      midMarketRate: 10,
      providerRate: 9,
      receiveFee: 0
    };
    const offerB: TransferOfferInput = {
      ...baseOffer,
      providerId: 'b',
      sendAmount: 100,
      fixedFee: 5,
      variableFeeRate: 0,
      midMarketRate: 10,
      providerRate: 9.5,
      receiveFee: 0
    };

    const [first, second] = rankTransferOffers([offerA, offerB]);

    expect(first?.totalRealCost).toBe(second?.totalRealCost);
    expect(first?.providerId).toBe('b');
    expect(first?.recipientAmount).toBe(950);
    expect(second?.recipientAmount).toBe(900);
  });

  it('renvoie une liste vide quand aucune offre n’est fournie', () => {
    expect(rankTransferOffers([])).toEqual([]);
  });
});
