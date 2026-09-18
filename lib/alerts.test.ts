import {describe, expect, it} from 'vitest';
import {validateAlertInput} from './alerts';

describe('validateAlertInput', () => {
  it('accepte et normalise une demande valide', () => {
    const result = validateAlertInput({email: '  User@Example.COM ', corridorId: 'fr-sn', amount: '200.005'});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe('user@example.com');
      expect(result.value.corridorId).toBe('fr-sn');
      expect(result.value.amount).toBe(200.01);
      expect(result.value.channel).toBe('email');
    }
  });

  it('rejette un email invalide', () => {
    const result = validateAlertInput({email: 'pas-un-email', corridorId: 'fr-sn', amount: 100});
    expect(result).toMatchObject({ok: false});
  });

  it('rejette un couloir inconnu', () => {
    expect(validateAlertInput({email: 'a@b.co', corridorId: 'fr-xx', amount: 100})).toMatchObject({ok: false});
    expect(validateAlertInput({email: 'a@b.co', corridorId: 'nimportequoi', amount: 100})).toMatchObject({ok: false});
  });

  it('rejette un montant invalide', () => {
    expect(validateAlertInput({email: 'a@b.co', corridorId: 'fr-sn', amount: 0})).toMatchObject({ok: false});
    expect(validateAlertInput({email: 'a@b.co', corridorId: 'fr-sn', amount: -5})).toMatchObject({ok: false});
    expect(validateAlertInput({email: 'a@b.co', corridorId: 'fr-sn', amount: 'abc'})).toMatchObject({ok: false});
  });
});
