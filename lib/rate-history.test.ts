import {describe, expect, it} from 'vitest';
import {appendSnapshot, corridorRateSeries, generateDemoHistory, type RateHistoryPoint} from './rate-history';

describe('generateDemoHistory', () => {
  it('produit le nombre de points demandé, du plus ancien au plus récent', () => {
    const end = new Date('2026-03-31T00:00:00.000Z');
    const history = generateDemoHistory(30, end);
    expect(history).toHaveLength(30);
    expect(history[0].date < history[29].date).toBe(true);
    expect(history[29].date).toBe('2026-03-31');
  });

  it('est déterministe (mêmes entrées → mêmes sorties)', () => {
    const end = new Date('2026-03-31T00:00:00.000Z');
    expect(generateDemoHistory(15, end)).toEqual(generateDemoHistory(15, end));
  });
});

describe('corridorRateSeries', () => {
  const history = generateDemoHistory(90, new Date('2026-03-31T00:00:00.000Z'));

  it('reste plate pour un couloir en zone Franc CFA (parité fixe)', () => {
    const series = corridorRateSeries(history, 'EUR', 'XOF');
    expect(series).toHaveLength(90);
    expect(new Set(series.map((point) => point.rate)).size).toBe(1);
    expect(series[0].rate).toBeCloseTo(655.957, 2);
  });

  it('varie pour une devise volatile', () => {
    const series = corridorRateSeries(history, 'EUR', 'NGN');
    expect(new Set(series.map((point) => point.rate)).size).toBeGreaterThan(1);
  });
});

describe('appendSnapshot', () => {
  const base: RateHistoryPoint[] = [
    {date: '2026-01-01', ratesPerEur: {} as never},
    {date: '2026-01-02', ratesPerEur: {} as never}
  ];

  it('remplace le point d’une date existante', () => {
    const next = appendSnapshot(base, '2026-01-02', {NGN: 1700} as never);
    expect(next).toHaveLength(2);
    expect(next[1]).toMatchObject({date: '2026-01-02', ratesPerEur: {NGN: 1700}});
  });

  it('ajoute une nouvelle date et borne la longueur', () => {
    const next = appendSnapshot(base, '2026-01-03', {} as never, 2);
    expect(next).toHaveLength(2);
    expect(next.map((point) => point.date)).toEqual(['2026-01-02', '2026-01-03']);
  });
});
