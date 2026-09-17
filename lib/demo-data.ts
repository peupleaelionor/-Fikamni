import {rankTransferOffers, type Locale, type PayoutMethod, type RankedTransferOffer, type TransferOfferInput} from '@/lib/engine';

export interface CorridorDefinition {
  id: 'fr-congo' | 'fr-senegal' | 'uk-nigeria';
  localeLabels: Record<Locale, string>;
  sendCurrency: 'EUR' | 'GBP';
  receiveCurrency: 'XAF' | 'XOF' | 'NGN';
  defaultAmount: number;
  countryFlag: string;
}

interface OfferTemplate {
  providerId: string;
  providerName: string;
  fixedFee: number;
  variableFeeRate: number;
  midMarketRate: number;
  providerRate: number;
  receiveFee: number;
  speedLabel: string;
  payoutMethod: PayoutMethod;
}

export const corridors: CorridorDefinition[] = [
  {
    id: 'fr-congo',
    localeLabels: {
      fr: 'France → Congo-Brazzaville',
      en: 'France → Republic of the Congo'
    },
    sendCurrency: 'EUR',
    receiveCurrency: 'XAF',
    defaultAmount: 200,
    countryFlag: '🇨🇬'
  },
  {
    id: 'fr-senegal',
    localeLabels: {
      fr: 'France → Sénégal',
      en: 'France → Senegal'
    },
    sendCurrency: 'EUR',
    receiveCurrency: 'XOF',
    defaultAmount: 200,
    countryFlag: '🇸🇳'
  },
  {
    id: 'uk-nigeria',
    localeLabels: {
      fr: 'Royaume-Uni → Nigeria',
      en: 'United Kingdom → Nigeria'
    },
    sendCurrency: 'GBP',
    receiveCurrency: 'NGN',
    defaultAmount: 150,
    countryFlag: '🇳🇬'
  }
];

const offerTemplates: Record<CorridorDefinition['id'], OfferTemplate[]> = {
  'fr-congo': [
    {
      providerId: 'mbote-cash',
      providerName: 'Mbote Cash',
      fixedFee: 2.5,
      variableFeeRate: 0.009,
      midMarketRate: 651,
      providerRate: 646,
      receiveFee: 0,
      speedLabel: '15 min',
      payoutMethod: 'cash'
    },
    {
      providerId: 'kongo-direct',
      providerName: 'Kongo Direct',
      fixedFee: 1.5,
      variableFeeRate: 0.012,
      midMarketRate: 651,
      providerRate: 641,
      receiveFee: 400,
      speedLabel: '1 h',
      payoutMethod: 'bank'
    },
    {
      providerId: 'salama-send',
      providerName: 'Salama Send',
      fixedFee: 3,
      variableFeeRate: 0.004,
      midMarketRate: 651,
      providerRate: 648,
      receiveFee: 0,
      speedLabel: '20 min',
      payoutMethod: 'mobile'
    }
  ],
  'fr-senegal': [
    {
      providerId: 'teranga-fast',
      providerName: 'Teranga Fast',
      fixedFee: 1.99,
      variableFeeRate: 0.006,
      midMarketRate: 655,
      providerRate: 652,
      receiveFee: 0,
      speedLabel: '10 min',
      payoutMethod: 'mobile'
    },
    {
      providerId: 'dakarsafe',
      providerName: 'DakarSafe',
      fixedFee: 0.99,
      variableFeeRate: 0.013,
      midMarketRate: 655,
      providerRate: 648,
      receiveFee: 250,
      speedLabel: '45 min',
      payoutMethod: 'bank'
    },
    {
      providerId: 'baobab-remit',
      providerName: 'Baobab Remit',
      fixedFee: 2.2,
      variableFeeRate: 0.004,
      midMarketRate: 655,
      providerRate: 654,
      receiveFee: 0,
      speedLabel: '25 min',
      payoutMethod: 'cash'
    }
  ],
  'uk-nigeria': [
    {
      providerId: 'naija-now',
      providerName: 'Naija Now',
      fixedFee: 1.2,
      variableFeeRate: 0.009,
      midMarketRate: 2100,
      providerRate: 2080,
      receiveFee: 0,
      speedLabel: '5 min',
      payoutMethod: 'bank'
    },
    {
      providerId: 'lagos-link',
      providerName: 'Lagos Link',
      fixedFee: 0,
      variableFeeRate: 0.015,
      midMarketRate: 2100,
      providerRate: 2068,
      receiveFee: 500,
      speedLabel: '20 min',
      payoutMethod: 'mobile'
    },
    {
      providerId: 'ubuntu-transfer',
      providerName: 'Ubuntu Transfer',
      fixedFee: 2.5,
      variableFeeRate: 0.003,
      midMarketRate: 2100,
      providerRate: 2092,
      receiveFee: 0,
      speedLabel: '1 h',
      payoutMethod: 'cash'
    }
  ]
};

export function getCorridorById(corridorId: CorridorDefinition['id']): CorridorDefinition {
  return corridors.find((corridor) => corridor.id === corridorId) ?? corridors[0];
}

export function getOffersForCorridor(corridorId: CorridorDefinition['id'], sendAmount: number): RankedTransferOffer[] {
  const corridor = getCorridorById(corridorId);
  const offers: TransferOfferInput[] = offerTemplates[corridor.id].map((offer) => ({
    ...offer,
    corridorId: corridor.id,
    sendAmount,
    sendCurrency: corridor.sendCurrency,
    receiveCurrency: corridor.receiveCurrency
  }));

  return rankTransferOffers(offers);
}
