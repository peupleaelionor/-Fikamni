import {describe, expect, it} from 'vitest';
import {
  buildRankedOffers,
  buildRankedOffersForTarget,
  passesFilters,
  tariffToOfferInput,
  type CorridorPricing,
  type CorridorTariff,
  type ProviderMeta
} from './pricing';

const corridor: CorridorPricing = {
  corridorId: 'fr-sn',
  sendCurrency: 'EUR',
  receiveCurrency: 'XOF',
  midMarketRate: 10
};

const provider: ProviderMeta = {
  id: 'demo',
  name: 'Démo',
  payoutMethod: 'mobile',
  speedLabelFr: 'Instantané',
  speedLabelEn: 'Instant',
  speedMinutes: 5
};

describe('tariffToOfferInput', () => {
  it('dérive le taux fournisseur de la marge de change et met à l’échelle les frais de réception', () => {
    const tariff: CorridorTariff = {
      providerId: 'demo',
      fixedFee: 2,
      variableFeeRate: 0.01,
      fxSpreadRate: 0.02,
      receiveFeeRate: 0.01
    };

    const input = tariffToOfferInput(corridor, tariff, provider, 100, 'fr');

    // Taux fournisseur = 10 × (1 − 0,02) = 9,8.
    expect(input.providerRate).toBeCloseTo(9.8, 10);
    // Frais réception = 0,01 × 100 × 10 = 10 (dans la devise de réception).
    expect(input.receiveFee).toBe(10);
    expect(input.sendCurrency).toBe('EUR');
    expect(input.receiveCurrency).toBe('XOF');
    expect(input.speedLabel).toBe('Instantané');
  });

  it('choisit le libellé de délai selon la langue', () => {
    const tariff: CorridorTariff = {providerId: 'demo', fixedFee: 0, variableFeeRate: 0, fxSpreadRate: 0, receiveFeeRate: 0};
    expect(tariffToOfferInput(corridor, tariff, provider, 100, 'en').speedLabel).toBe('Instant');
  });
});

describe('buildRankedOffers', () => {
  const providersById = new Map<string, ProviderMeta>([
    ['cher', {...provider, id: 'cher', name: 'Cher'}],
    ['econome', {...provider, id: 'econome', name: 'Économe'}]
  ]);

  it('construit et classe les offres, le meilleur coût réel en tête', () => {
    const tariffs: CorridorTariff[] = [
      {providerId: 'cher', fixedFee: 5, variableFeeRate: 0.02, fxSpreadRate: 0.03, receiveFeeRate: 0},
      {providerId: 'econome', fixedFee: 1, variableFeeRate: 0.004, fxSpreadRate: 0.005, receiveFeeRate: 0}
    ];

    const ranked = buildRankedOffers(corridor, tariffs, providersById, 200, 'fr');

    expect(ranked).toHaveLength(2);
    expect(ranked[0]?.providerId).toBe('econome');
    expect(ranked[0]?.totalRealCost).toBeLessThan(ranked[1]?.totalRealCost ?? Infinity);
  });

  it('ignore les tarifs dont le prestataire est introuvable', () => {
    const tariffs: CorridorTariff[] = [
      {providerId: 'fantome', fixedFee: 1, variableFeeRate: 0, fxSpreadRate: 0, receiveFeeRate: 0},
      {providerId: 'econome', fixedFee: 1, variableFeeRate: 0, fxSpreadRate: 0, receiveFeeRate: 0}
    ];

    const ranked = buildRankedOffers(corridor, tariffs, providersById, 100, 'fr');
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.providerId).toBe('econome');
  });

  it('renvoie une liste vide pour un couloir sans tarif (ex. couloir inconnu)', () => {
    expect(buildRankedOffers(corridor, [], providersById, 100, 'fr')).toEqual([]);
  });
});

describe('buildRankedOffersForTarget (mode inversé)', () => {
  const providersById = new Map<string, ProviderMeta>([['demo', provider]]);

  it('résout le montant à envoyer pour atteindre le montant reçu cible', () => {
    const tariff: CorridorTariff = {providerId: 'demo', fixedFee: 2, variableFeeRate: 0.01, fxSpreadRate: 0.02, receiveFeeRate: 0};
    // reçu = envoi × taux × (1 − 0,02) = envoi × 9,8. Cible 980 → envoi 100.
    const [offer] = buildRankedOffersForTarget(corridor, [tariff], providersById, 980, 'fr');
    expect(offer?.sendAmount).toBeCloseTo(100, 2);
    expect(offer?.recipientAmount).toBeCloseTo(980, 0);
  });

  it('classe par montant débité croissant pour délivrer la cible', () => {
    const tariffs: CorridorTariff[] = [
      {providerId: 'cher', fixedFee: 5, variableFeeRate: 0.02, fxSpreadRate: 0.04, receiveFeeRate: 0},
      {providerId: 'econome', fixedFee: 1, variableFeeRate: 0.004, fxSpreadRate: 0.006, receiveFeeRate: 0}
    ];
    const byId = new Map<string, ProviderMeta>([
      ['cher', {...provider, id: 'cher'}],
      ['econome', {...provider, id: 'econome'}]
    ]);
    const ranked = buildRankedOffersForTarget(corridor, tariffs, byId, 950, 'fr');
    expect(ranked[0]?.providerId).toBe('econome');
    expect(ranked[0]?.debitedAmount).toBeLessThan(ranked[1]?.debitedAmount ?? Infinity);
  });
});

describe('passesFilters', () => {
  const tariff: CorridorTariff = {providerId: 'demo', fixedFee: 1, variableFeeRate: 0.005, fxSpreadRate: 0.01, receiveFeeRate: 0};
  const [offer] = buildRankedOffers(corridor, [tariff], new Map([['demo', provider]]), 200, 'fr');

  it('filtre par mode de réception mobile', () => {
    expect(passesFilters(offer!, 5, {mobileOnly: true})).toBe(true);
    expect(passesFilters({...offer!, payoutMethod: 'bank'}, 5, {mobileOnly: true})).toBe(false);
  });

  it('filtre par délai maximal', () => {
    expect(passesFilters(offer!, 30, {maxSpeedMinutes: 60})).toBe(true);
    expect(passesFilters(offer!, 120, {maxSpeedMinutes: 60})).toBe(false);
  });

  it('filtre par coût réel maximal en fraction du montant envoyé', () => {
    const feeRate = offer!.totalRealCost / offer!.sendAmount;
    expect(passesFilters(offer!, 5, {maxFeeRate: feeRate + 0.001})).toBe(true);
    expect(passesFilters(offer!, 5, {maxFeeRate: feeRate - 0.001})).toBe(false);
  });
});
