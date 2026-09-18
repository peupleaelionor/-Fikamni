import {getCorridor} from '@/lib/geo';

/**
 * Validation et normalisation des demandes d'alerte de taux (module PUR).
 *
 * Une alerte = « préviens-moi quand le meilleur coût réel pour ce couloir et ce
 * montant baisse ». La logique de validation est isolée ici pour être testée et
 * réutilisée par la route `POST /api/alerts`.
 */

export type AlertChannel = 'email';

export interface AlertInput {
  email?: unknown;
  corridorId?: unknown;
  amount?: unknown;
  channel?: unknown;
}

export interface NormalizedAlert {
  email: string;
  corridorId: string;
  amount: number;
  channel: AlertChannel;
  createdAt: string;
}

export type AlertValidation =
  | {ok: true; value: NormalizedAlert}
  | {ok: false; error: string};

// Validation d'email volontairement simple et robuste (pas de sur-ingénierie).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAlertInput(raw: AlertInput): AlertValidation {
  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return {ok: false, error: 'Adresse email invalide.'};
  }

  const corridorId = typeof raw.corridorId === 'string' ? raw.corridorId.trim() : '';
  const [from, to] = corridorId.split('-');
  if (!from || !to || !getCorridor(from, to)) {
    return {ok: false, error: 'Couloir inconnu.'};
  }

  const amount = typeof raw.amount === 'number' ? raw.amount : Number(raw.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    return {ok: false, error: 'Montant invalide.'};
  }

  return {
    ok: true,
    value: {
      email,
      corridorId,
      amount: Math.round(amount * 100) / 100,
      channel: 'email',
      createdAt: new Date().toISOString()
    }
  };
}
