import {describe, expect, it} from 'vitest';
import {
  corridorTitleFr,
  getCorridor,
  listCorridorParams,
  listCorridors,
  receiveCountries,
  sendCountries
} from './geo';

describe('geo — couloirs', () => {
  it('résout un couloir connu avec les bonnes devises', () => {
    const corridor = getCorridor('fr', 'sn');
    expect(corridor?.id).toBe('fr-sn');
    expect(corridor?.sendCurrency).toBe('EUR');
    expect(corridor?.receiveCurrency).toBe('XOF');
  });

  it('renvoie undefined pour un couloir inconnu', () => {
    expect(getCorridor('xx', 'sn')).toBeUndefined();
    expect(getCorridor('fr', 'xx')).toBeUndefined();
    expect(getCorridor('zz', 'zz')).toBeUndefined();
  });

  it('génère le produit cartésien complet des couloirs Phase 1', () => {
    const expected = sendCountries.length * receiveCountries.length;
    expect(listCorridors()).toHaveLength(expected);
    expect(listCorridorParams()).toHaveLength(expected);
    expect(sendCountries).toHaveLength(6);
    expect(receiveCountries).toHaveLength(10);
  });

  it('produit un titre SEO en français grammaticalement correct', () => {
    expect(corridorTitleFr(getCorridor('fr', 'sn')!)).toBe(
      "Envoyer de l'argent au Sénégal depuis la France"
    );
    expect(corridorTitleFr(getCorridor('de', 'ci')!)).toBe(
      "Envoyer de l'argent en Côte d'Ivoire depuis l'Allemagne"
    );
    expect(corridorTitleFr(getCorridor('us', 'ng')!)).toBe(
      "Envoyer de l'argent au Nigeria depuis les États-Unis"
    );
  });
});
