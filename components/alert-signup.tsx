'use client';

import {useState} from 'react';

/**
 * Formulaire de capture d'alerte de taux (beta). Envoie une demande à
 * `POST /api/alerts` pour le couloir et le montant courants.
 */
export function AlertSignup({corridorId, amount, label}: {corridorId: string; amount: number; label: string}) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, corridorId, amount})
      });
      const data = (await response.json()) as {ok: boolean; error?: string};
      if (response.ok && data.ok) {
        setStatus('success');
        setMessage('C’est noté ! Nous vous préviendrons par email dès qu’un meilleur prix apparaît.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error ?? 'Une erreur est survenue.');
      }
    } catch {
      setStatus('error');
      setMessage('Impossible d’enregistrer l’alerte pour le moment.');
    }
  }

  return (
    <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-emerald-900">🔔 {label}</h3>
        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          beta
        </span>
      </div>
      <p className="mt-1 text-sm text-emerald-800">
        Recevez un email dès que le meilleur coût réel baisse pour ce couloir et ce montant.
      </p>
      {status === 'success' ? (
        <p className="mt-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-emerald-700">{message}</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="votre@email.com"
            className="flex-1 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500"
            aria-label="Adresse email pour l'alerte"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {status === 'loading' ? '…' : 'M’alerter'}
          </button>
        </form>
      )}
      {status === 'error' ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
    </div>
  );
}
