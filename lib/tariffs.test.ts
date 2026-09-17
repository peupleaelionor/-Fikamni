import {describe, expect, it} from 'vitest';
import {DEMO_TARIFF_PROFILES} from './demo-data';
import {getCorridorTariffs, normalizeRpwRows, type RpwTariffRow} from './tariffs';

describe('normalizeRpwRows', () => {
  it('groupe les lignes RPW par couloir et nettoie les valeurs négatives', () => {
    const rows: RpwTariffRow[] = [
      {from: 'fr', to: 'sn', providerId: 'p1', fixedFee: 2, variableFeeRate: 0.01, fxSpreadRate: 0.02, receiveFeeRate: 0},
      {from: 'fr', to: 'sn', providerId: 'p2', fixedFee: -1, variableFeeRate: -0.01, fxSpreadRate: 0.03},
      {from: 'gb', to: 'ng', providerId: 'p3', fixedFee: 0, variableFeeRate: 0.015, fxSpreadRate: 0.04, receiveFeeRate: 0.001}
    ];

    const snapshot = normalizeRpwRows(rows, {source: 'world-bank-rpw', updatedAt: '2026-03-01T00:00:00.000Z'});

    expect(Object.keys(snapshot.corridors).sort()).toEqual(['fr-sn', 'gb-ng']);
    expect(snapshot.corridors['fr-sn']).toHaveLength(2);
    // Les valeurs négatives sont ramenées à 0.
    expect(snapshot.corridors['fr-sn']?.[1]).toMatchObject({fixedFee: 0, variableFeeRate: 0, receiveFeeRate: 0});
    expect(snapshot.source).toBe('world-bank-rpw');
  });

  it('écarte les lignes RPW incomplètes', () => {
    const rows = [
      {from: 'fr', to: 'sn', providerId: 'p1', fixedFee: Number.NaN, variableFeeRate: 0.01, fxSpreadRate: 0.02}
    ] as RpwTariffRow[];

    const snapshot = normalizeRpwRows(rows);
    expect(snapshot.corridors['fr-sn']).toBeUndefined();
  });
});

describe('getCorridorTariffs', () => {
  it('retombe sur les profils démo en l’absence de fichier ingéré', () => {
    const result = getCorridorTariffs('fr-sn');
    expect(result.source).toBe('demo');
    expect(result.tariffs).toHaveLength(DEMO_TARIFF_PROFILES.length);
  });
});
