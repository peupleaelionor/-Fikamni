'use client';

import {useMemo, useState} from 'react';
import {NextIntlClientProvider, useTranslations} from 'next-intl';
import enMessages from '@/messages/en.json';
import frMessages from '@/messages/fr.json';
import {corridors, getCorridorById, getOffersForCorridor, type CorridorDefinition} from '@/lib/demo-data';
import type {Locale} from '@/lib/engine';

const messagesByLocale = {
  en: enMessages,
  fr: frMessages
};

function formatMoney(value: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'XAF' || currency === 'XOF' || currency === 'NGN' ? 0 : 2
  }).format(value);
}

function ComparatorContent({
  amount,
  corridor,
  locale,
  onAmountChange,
  onCorridorChange,
  onLocaleChange,
  onReset
}: {
  amount: number;
  corridor: CorridorDefinition;
  locale: Locale;
  onAmountChange: (amount: number) => void;
  onCorridorChange: (corridorId: CorridorDefinition['id']) => void;
  onLocaleChange: (locale: Locale) => void;
  onReset: () => void;
}) {
  const t = useTranslations();
  const offers = useMemo(() => getOffersForCorridor(corridor.id, amount), [corridor.id, amount]);
  const bestOffer = offers[0];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-soft">
        <div className="flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-emerald-300">{t('hero.eyebrow')}</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-5xl">{t('brand.name')}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">{t('brand.tagline')}</p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 p-1 text-sm">
              {(['fr', 'en'] as const).map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  onClick={() => onLocaleChange(candidate)}
                  className={`rounded-full px-3 py-2 font-medium transition ${
                    locale === candidate ? 'bg-white text-slate-950' : 'text-white/80'
                  }`}
                  aria-pressed={locale === candidate}
                >
                  {candidate.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <h2 className="text-2xl font-semibold sm:text-4xl">{t('hero.title')}</h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">{t('hero.description')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-3xl bg-white/5 p-4 text-sm sm:text-base">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-slate-300">{t('summary.results')}</p>
                <p className="mt-2 text-2xl font-semibold">{offers.length}</p>
              </div>
              <div className="rounded-2xl bg-emerald-400/10 p-4">
                <p className="text-emerald-100">{t('summary.best')}</p>
                <p className="mt-2 text-lg font-semibold">{bestOffer?.providerName}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-[2rem] bg-white p-4 shadow-soft sm:p-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5 rounded-[1.5rem] bg-slate-50 p-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">{t('controls.language')}</label>
            <div className="flex gap-2">
              {(['fr', 'en'] as const).map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  onClick={() => onLocaleChange(candidate)}
                  className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    locale === candidate
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {candidate.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="corridor" className="mb-2 block text-sm font-medium text-slate-600">
              {t('controls.corridor')}
            </label>
            <select
              id="corridor"
              value={corridor.id}
              onChange={(event) => onCorridorChange(event.target.value as CorridorDefinition['id'])}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500"
            >
              {corridors.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.countryFlag} {item.localeLabels[locale]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="amount" className="mb-2 block text-sm font-medium text-slate-600">
              {t('controls.amount')}
            </label>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="mb-1 text-xs uppercase tracking-wide text-slate-400">{corridor.sendCurrency}</div>
              <input
                id="amount"
                type="number"
                min={1}
                step={1}
                value={amount}
                onChange={(event) => {
                  const nextAmount = Number(event.target.value);
                  onAmountChange(nextAmount > 0 ? nextAmount : corridor.defaultAmount);
                }}
                className="w-full border-0 p-0 text-2xl font-semibold text-slate-950 outline-none"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">{t('controls.amountHint')}</p>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
          >
            {t('controls.reset')}
          </button>
        </aside>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] bg-emerald-50 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-900">{corridor.countryFlag} {corridor.localeLabels[locale]}</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-950">{bestOffer?.providerName}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">{t('summary.send')}</p>
                  <p className="font-semibold text-slate-950">{formatMoney(amount, corridor.sendCurrency, locale)}</p>
                </div>
                <div>
                  <p className="text-slate-500">{t('summary.receive')}</p>
                  <p className="font-semibold text-slate-950">
                    {bestOffer ? formatMoney(bestOffer.recipientAmount, corridor.receiveCurrency, locale) : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {offers.map((offer, index) => (
              <article
                key={offer.providerId}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-semibold text-slate-950">{offer.providerName}</h4>
                      {index === 0 ? (
                        <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                          {t('offer.bestBadge')}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">{t('offer.speed')}: {offer.speedLabel}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        {t('offer.method')}: {t(`payout.${offer.payoutMethod}`)}
                      </span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-slate-500">{t('offer.realCost')}</p>
                    <p className="text-2xl font-semibold text-slate-950">
                      {formatMoney(offer.totalRealCost, corridor.sendCurrency, locale)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 rounded-[1.25rem] bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-slate-500">{t('offer.debited')}</p>
                    <p className="mt-1 font-semibold text-slate-950">{formatMoney(offer.debitedAmount, corridor.sendCurrency, locale)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{t('summary.receive')}</p>
                    <p className="mt-1 font-semibold text-slate-950">{formatMoney(offer.recipientAmount, corridor.receiveCurrency, locale)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{t('offer.directFees')}</p>
                    <p className="mt-1 font-semibold text-slate-950">{formatMoney(offer.directFeeAmount, corridor.sendCurrency, locale)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{t('offer.effectiveRate')}</p>
                    <p className="mt-1 font-semibold text-slate-950">{offer.effectiveRate.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB')}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-slate-500">{t('offer.hiddenFx')}</p>
                    <p className="mt-1 font-semibold text-slate-950">{formatMoney(offer.hiddenFxCost, corridor.sendCurrency, locale)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-slate-500">{t('offer.receiveFees')}</p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {formatMoney(offer.receiveFeeInSendCurrency, corridor.sendCurrency, locale)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-slate-500">{t('summary.receive')}</p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {formatMoney(offer.midMarketRecipientAmount, corridor.receiveCurrency, locale)} · {t('offer.marketMax')}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export function ComparatorApp() {
  const [locale, setLocale] = useState<Locale>('fr');
  const [corridorId, setCorridorId] = useState<CorridorDefinition['id']>('fr-congo');
  const currentCorridor = getCorridorById(corridorId);
  const [amount, setAmount] = useState<number>(currentCorridor.defaultAmount);

  const handleCorridorChange = (nextCorridorId: CorridorDefinition['id']) => {
    const nextCorridor = getCorridorById(nextCorridorId);
    setCorridorId(nextCorridorId);
    setAmount(nextCorridor.defaultAmount);
  };

  const handleReset = () => {
    const defaultCorridor = getCorridorById(corridorId);
    setAmount(defaultCorridor.defaultAmount);
  };

  return (
    <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]} timeZone="UTC">
      <ComparatorContent
        amount={amount}
        corridor={currentCorridor}
        locale={locale}
        onAmountChange={setAmount}
        onCorridorChange={handleCorridorChange}
        onLocaleChange={setLocale}
        onReset={handleReset}
      />
    </NextIntlClientProvider>
  );
}
