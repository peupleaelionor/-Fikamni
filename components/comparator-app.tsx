'use client';

import {createContext, useContext, useMemo, useState} from 'react';
import {NextIntlClientProvider, useTranslations} from 'next-intl';
import enMessages from '@/messages/en.json';
import frMessages from '@/messages/fr.json';
import type {Locale} from '@/lib/engine';
import {buildRankedOffers, type CorridorPricing, type ProviderMeta} from '@/lib/pricing';
import type {ComparatorData, CorridorDataset} from '@/lib/offers';

const messagesByLocale = {en: enMessages, fr: frMessages};

const ZERO_DECIMAL = new Set(['XAF', 'XOF', 'CDF']);

function formatMoney(value: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: ZERO_DECIMAL.has(currency) ? 0 : 2
  }).format(value);
}

function formatDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    dateStyle: 'long',
    timeZone: 'UTC'
  }).format(new Date(iso));
}

interface ComparatorProps {
  data: ComparatorData;
  initialFrom?: string;
  initialTo?: string;
  /** Verrouille le couloir (page couloir) : masque les sélecteurs de pays. */
  lockCorridor?: boolean;
}

function ComparatorContent({data, initialFrom, initialTo, lockCorridor}: ComparatorProps) {
  const t = useTranslations();
  const {locale} = useLocaleContext();

  const firstCorridor = data.corridors[Object.keys(data.corridors)[0]!]!;
  const [fromCode, setFromCode] = useState<string>(initialFrom ?? firstCorridor.fromCode);
  const [toCode, setToCode] = useState<string>(initialTo ?? firstCorridor.toCode);

  const dataset: CorridorDataset =
    data.corridors[`${fromCode}-${toCode}`] ?? firstCorridor;
  const [amount, setAmount] = useState<number>(dataset.defaultAmount);

  const providersById = useMemo(
    () => new Map<string, ProviderMeta>(data.providers.map((provider) => [provider.id, provider])),
    [data.providers]
  );

  const offers = useMemo(() => {
    const pricing: CorridorPricing = {
      corridorId: dataset.id,
      sendCurrency: dataset.sendCurrency,
      receiveCurrency: dataset.receiveCurrency,
      midMarketRate: dataset.midMarketRate
    };
    return buildRankedOffers(pricing, dataset.tariffs, providersById, amount, locale);
  }, [dataset, providersById, amount, locale]);

  const bestOffer = offers[0];
  const isDemo = dataset.ratesSource === 'demo' && dataset.tariffsSource === 'demo';

  function handleCorridorChange(nextFrom: string, nextTo: string) {
    setFromCode(nextFrom);
    setToCode(nextTo);
    const next = data.corridors[`${nextFrom}-${nextTo}`];
    if (next) {
      setAmount(next.defaultAmount);
    }
  }

  return (
    <section className="grid gap-4 rounded-[2rem] bg-white p-4 shadow-soft sm:p-6 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-5 rounded-[1.5rem] bg-slate-50 p-4">
        <LocaleSwitcher />

        {!lockCorridor ? (
          <>
            <div>
              <label htmlFor="from" className="mb-2 block text-sm font-medium text-slate-600">
                {t('controls.from')}
              </label>
              <select
                id="from"
                value={fromCode}
                onChange={(event) => handleCorridorChange(event.target.value, toCode)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500"
              >
                {data.sendCountries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {locale === 'fr' ? country.nameFr : country.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="to" className="mb-2 block text-sm font-medium text-slate-600">
                {t('controls.to')}
              </label>
              <select
                id="to"
                value={toCode}
                onChange={(event) => handleCorridorChange(fromCode, event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500"
              >
                {data.receiveCountries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {locale === 'fr' ? country.nameFr : country.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}

        <div>
          <label htmlFor="amount" className="mb-2 block text-sm font-medium text-slate-600">
            {t('controls.amount')}
          </label>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="mb-1 text-xs uppercase tracking-wide text-slate-400">{dataset.sendCurrency}</div>
            <input
              id="amount"
              type="number"
              min={1}
              step={1}
              value={amount}
              onChange={(event) => {
                const nextAmount = Number(event.target.value);
                setAmount(nextAmount > 0 ? nextAmount : dataset.defaultAmount);
              }}
              className="w-full border-0 p-0 text-2xl font-semibold text-slate-950 outline-none"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">{t('controls.amountHint')}</p>
        </div>

        <button
          type="button"
          onClick={() => setAmount(dataset.defaultAmount)}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
        >
          {t('controls.reset')}
        </button>

        <p className="rounded-2xl bg-white px-3 py-2 text-xs text-slate-500">
          {t('data.updated')} : {formatDate(dataset.updatedAt, locale)}
          <br />
          <span className="text-slate-400">
            {isDemo
              ? t('data.sourceDemo')
              : `${t('data.sourceRates')}: ${dataset.ratesSource} · ${t('data.sourceTariffs')}: ${dataset.tariffsSource}`}
          </span>
        </p>
      </aside>

      <div className="space-y-4">
        <div className="rounded-[1.5rem] bg-emerald-50 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-900">
                {t('summary.results')}: {offers.length}
              </p>
              <h3 className="mt-1 text-xl font-semibold text-slate-950">
                {bestOffer ? `${t('summary.best')}: ${bestOffer.providerName}` : t('summary.none')}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500">{t('summary.send')}</p>
                <p className="font-semibold text-slate-950">{formatMoney(amount, dataset.sendCurrency, locale)}</p>
              </div>
              <div>
                <p className="text-slate-500">{t('summary.receive')}</p>
                <p className="font-semibold text-slate-950">
                  {bestOffer ? formatMoney(bestOffer.recipientAmount, dataset.receiveCurrency, locale) : '—'}
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
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      {t('offer.speed')}: {offer.speedLabel}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      {t('offer.method')}: {t(`payout.${offer.payoutMethod}`)}
                    </span>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm text-slate-500">{t('offer.realCost')}</p>
                  <p className="text-2xl font-semibold text-slate-950">
                    {formatMoney(offer.totalRealCost, dataset.sendCurrency, locale)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 rounded-[1.25rem] bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-slate-500">{t('offer.debited')}</p>
                  <p className="mt-1 font-semibold text-slate-950">{formatMoney(offer.debitedAmount, dataset.sendCurrency, locale)}</p>
                </div>
                <div>
                  <p className="text-slate-500">{t('summary.receive')}</p>
                  <p className="mt-1 font-semibold text-slate-950">{formatMoney(offer.recipientAmount, dataset.receiveCurrency, locale)}</p>
                </div>
                <div>
                  <p className="text-slate-500">{t('offer.hiddenFx')}</p>
                  <p className="mt-1 font-semibold text-slate-950">{formatMoney(offer.hiddenFxCost, dataset.sendCurrency, locale)}</p>
                </div>
                <div>
                  <p className="text-slate-500">{t('offer.receiveFees')}</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {formatMoney(offer.receiveFeeInSendCurrency, dataset.sendCurrency, locale)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-400">
                  {t('offer.marketMax')}: {formatMoney(offer.midMarketRecipientAmount, dataset.receiveCurrency, locale)}
                </p>
                <a
                  href={`/go/${offer.providerId}?corridor=${dataset.id}&amount=${amount}`}
                  rel="sponsored nofollow noopener"
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  {t('offer.cta')}
                </a>
              </div>
            </article>
          ))}
        </div>

        <p className="rounded-[1.25rem] bg-amber-50 px-4 py-3 text-xs text-amber-900">{t('offer.affiliateNote')}</p>
      </div>
    </section>
  );
}

// Contexte minimal pour partager la langue entre le sélecteur et le contenu,
// sans dupliquer l'état ni recréer un provider next-intl.
const LocaleContext = createContext<{locale: Locale; setLocale: (locale: Locale) => void}>({
  locale: 'fr',
  setLocale: () => {}
});

function useLocaleContext() {
  return useContext(LocaleContext);
}

function LocaleSwitcher() {
  const t = useTranslations();
  const {locale, setLocale} = useLocaleContext();
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-600">{t('controls.language')}</label>
      <div className="flex gap-2">
        {(['fr', 'en'] as const).map((candidate) => (
          <button
            key={candidate}
            type="button"
            onClick={() => setLocale(candidate)}
            className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              locale === candidate
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
            aria-pressed={locale === candidate}
          >
            {candidate.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ComparatorApp({data, initialFrom, initialTo, lockCorridor}: ComparatorProps) {
  const [locale, setLocale] = useState<Locale>('fr');

  return (
    <LocaleContext.Provider value={{locale, setLocale}}>
      <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]} timeZone="UTC">
        <ComparatorContent data={data} initialFrom={initialFrom} initialTo={initialTo} lockCorridor={lockCorridor} />
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
