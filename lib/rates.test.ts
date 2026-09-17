import {describe, expect, it} from 'vitest';
import {demoRatesSnapshot, normalizeRatesPayload, rateBetween} from './rates';

describe('normalizeRatesPayload', () => {
  it('force la parité fixe du Franc CFA même si l’API renvoie autre chose', () => {
    const snapshot = normalizeRatesPayload({
      source: 'exchangerate-host',
      updatedAt: '2026-02-01T00:00:00.000Z',
      ratesPerEur: {XOF: 640, XAF: 700, USD: 1.1}
    });

    expect(snapshot.ratesPerEur.XOF).toBe(655.957);
    expect(snapshot.ratesPerEur.XAF).toBe(655.957);
    expect(snapshot.ratesPerEur.USD).toBe(1.1);
    expect(snapshot.ratesPerEur.EUR).toBe(1);
    expect(snapshot.source).toBe('exchangerate-host');
  });

  it('complète les devises absentes ou invalides avec la démo', () => {
    const demo = demoRatesSnapshot();
    const snapshot = normalizeRatesPayload({ratesPerEur: {NGN: -5, GHS: 0}});

    // Valeurs invalides ignorées → repli sur la démo.
    expect(snapshot.ratesPerEur.NGN).toBe(demo.ratesPerEur.NGN);
    expect(snapshot.ratesPerEur.GHS).toBe(demo.ratesPerEur.GHS);
    expect(snapshot.ratesPerEur.KES).toBe(demo.ratesPerEur.KES);
  });
});

describe('rateBetween', () => {
  it('convertit via la base EUR', () => {
    const snapshot = demoRatesSnapshot();
    // EUR → XOF = 655,957 / 1.
    expect(rateBetween(snapshot, 'EUR', 'XOF')).toBeCloseTo(655.957, 3);
    // GBP → XOF = 655,957 / 0,85.
    expect(rateBetween(snapshot, 'GBP', 'XOF')).toBeCloseTo(655.957 / 0.85, 3);
  });

  it('lève une erreur pour une devise indisponible', () => {
    const snapshot = demoRatesSnapshot();
    // @ts-expect-error test volontaire d'une devise hors union.
    expect(() => rateBetween(snapshot, 'EUR', 'ZZZ')).toThrow(/indisponible/);
  });
});
