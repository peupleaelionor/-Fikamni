import type {CurrencyCode} from '@/lib/engine';
import type {CorridorTariff, ProviderMeta} from '@/lib/pricing';
import {listCorridors, receiveCountries, sendCountries} from '@/lib/geo';
import {providers} from '@/lib/providers';
import {loadRatesSnapshot, rateBetween} from '@/lib/rates';
import {getCorridorTariffs} from '@/lib/tariffs';

/**
 * Orchestration SERVEUR : assemble un instantané sérialisable (taux + tarifs +
 * fraîcheur) que les pages passent au comparateur client. Le client recalcule
 * ensuite les offres localement (via `lib/pricing`) au changement de montant ou
 * de couloir, sans nouvel aller-retour serveur.
 *
 * ⚠️ Importe des modules à accès disque : à n'utiliser que dans des composants
 * serveur / route handlers, jamais dans un composant client.
 */

export interface CountrySummary {
  code: string;
  nameFr: string;
  nameEn: string;
  flag: string;
  currency: CurrencyCode;
}

export interface CorridorDataset {
  id: string;
  fromCode: string;
  toCode: string;
  sendCurrency: CurrencyCode;
  receiveCurrency: CurrencyCode;
  defaultAmount: number;
  /** Taux mi-marché (unités reçues pour 1 unité envoyée). */
  midMarketRate: number;
  /** Date de dernière mise à jour du couloir (max taux / tarifs). */
  updatedAt: string;
  ratesSource: string;
  tariffsSource: string;
  tariffs: CorridorTariff[];
}

export interface ComparatorData {
  providers: ProviderMeta[];
  sendCountries: CountrySummary[];
  receiveCountries: CountrySummary[];
  /** Datasets indexés par identifiant de couloir. */
  corridors: Record<string, CorridorDataset>;
}

function toProviderMeta(): ProviderMeta[] {
  return providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    payoutMethod: provider.payoutMethod,
    speedLabelFr: provider.speedLabelFr,
    speedLabelEn: provider.speedLabelEn,
    speedMinutes: provider.speedMinutes
  }));
}

function latestIso(a: string, b: string): string {
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

/** Construit l'instantané complet servi au comparateur. */
export function getComparatorData(): ComparatorData {
  const rates = loadRatesSnapshot();
  const corridors: Record<string, CorridorDataset> = {};

  for (const corridor of listCorridors()) {
    const corridorTariffs = getCorridorTariffs(corridor.id);
    corridors[corridor.id] = {
      id: corridor.id,
      fromCode: corridor.from.code,
      toCode: corridor.to.code,
      sendCurrency: corridor.sendCurrency,
      receiveCurrency: corridor.receiveCurrency,
      defaultAmount: corridor.defaultAmount,
      midMarketRate: rateBetween(rates, corridor.sendCurrency, corridor.receiveCurrency),
      updatedAt: latestIso(rates.updatedAt, corridorTariffs.updatedAt),
      ratesSource: rates.source,
      tariffsSource: corridorTariffs.source,
      tariffs: corridorTariffs.tariffs
    };
  }

  return {
    providers: toProviderMeta(),
    sendCountries: sendCountries.map((country) => ({
      code: country.code,
      nameFr: country.nameFr,
      nameEn: country.nameEn,
      flag: country.flag,
      currency: country.currency
    })),
    receiveCountries: receiveCountries.map((country) => ({
      code: country.code,
      nameFr: country.nameFr,
      nameEn: country.nameEn,
      flag: country.flag,
      currency: country.currency
    })),
    corridors
  };
}
