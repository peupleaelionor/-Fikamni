'use client';

import {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {NextIntlClientProvider, useTranslations} from 'next-intl';
import enMessages from '@/messages/en.json';
import frMessages from '@/messages/fr.json';
import type {Locale, RankedTransferOffer} from '@/lib/engine';
import {
  buildRankedOffers,
  buildRankedOffersForTarget,
  passesFilters,
  type CorridorPricing,
  type OfferFilters,
  type ProviderMeta
} from '@/lib/pricing';
import type {ComparatorData, CorridorDataset} from '@/lib/offers';

const messagesByLocale = {en: enMessages, fr: frMessages};

const ZERO_DECIMAL = new Set(['XAF', 'XOF', 'CDF']);
const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];
const FAVORITES_KEY = 'fikamni:favorites';

type Mode = 'send' | 'receive';

function formatMoney(value: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: ZERO_DECIMAL.has(currency) ? 0 : 2
  }).format(value);
}

function formatDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {dateStyle: 'long', timeZone: 'UTC'}).format(
    new Date(iso)
  );
}

interface ComparatorProps {
  data: ComparatorData;
  initialFrom?: string;
  initialTo?: string;
}

function ComparatorContent({data, initialFrom, initialTo}: ComparatorProps) {
  const t = useTranslations();
  const {locale} = useLocaleContext();

  const firstCorridor = data.corridors[Object.keys(data.corridors)[0]!]!;
  const [fromCode, setFromCode] = useState<string>(initialFrom ?? firstCorridor.fromCode);
  const [toCode, setToCode] = useState<string>(initialTo ?? firstCorridor.toCode);
  const dataset: CorridorDataset = data.corridors[`${fromCode}-${toCode}`] ?? firstCorridor;

  const [mode, setMode] = useState<Mode>('send');
  const [sendAmount, setSendAmount] = useState<number>(dataset.defaultAmount);
  const [targetReceive, setTargetReceive] = useState<number>(
    Math.round(dataset.defaultAmount * dataset.midMarketRate)
  );
  const [filters, setFilters] = useState<OfferFilters>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const providersById = useMemo(
    () => new Map<string, ProviderMeta>(data.providers.map((provider) => [provider.id, provider])),
    [data.providers]
  );

  // Hydratation post-montage : deep-link (?amount, ?mode, ?target) + favoris.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlAmount = Number(params.get('amount'));
      const urlTarget = Number(params.get('target'));
      const urlMode = params.get('mode');
      if (urlMode === 'receive' || urlMode === 'send') {
        setMode(urlMode);
      }
      if (Number.isFinite(urlAmount) && urlAmount > 0) {
        setSendAmount(urlAmount);
      }
      if (Number.isFinite(urlTarget) && urlTarget > 0) {
        setTargetReceive(urlTarget);
      }
    } catch {
      // window indisponible : on garde les valeurs par défaut.
    }
    try {
      const stored = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) ?? '[]');
      if (Array.isArray(stored)) {
        setFavorites(stored.filter((id): id is string => typeof id === 'string'));
      }
    } catch {
      // localStorage indisponible : pas de favoris.
    }
  }, []);

  const rankedOffers = useMemo(() => {
    const pricing: CorridorPricing = {
      corridorId: dataset.id,
      sendCurrency: dataset.sendCurrency,
      receiveCurrency: dataset.receiveCurrency,
      midMarketRate: dataset.midMarketRate
    };
    return mode === 'send'
      ? buildRankedOffers(pricing, dataset.tariffs, providersById, sendAmount, locale)
      : buildRankedOffersForTarget(pricing, dataset.tariffs, providersById, targetReceive, locale);
  }, [dataset, providersById, mode, sendAmount, targetReceive, locale]);

  const offers = useMemo(
    () =>
      rankedOffers.filter((offer) =>
        passesFilters(offer, providersById.get(offer.providerId)?.speedMinutes ?? Infinity, filters)
      ),
    [rankedOffers, providersById, filters]
  );

  const bestOffer = offers[0];
  const isDemo = dataset.ratesSource === 'demo' && dataset.tariffsSource === 'demo';
  const isFavorite = favorites.includes(dataset.id);

  function changeCorridor(nextFrom: string, nextTo: string) {
    setFromCode(nextFrom);
    setToCode(nextTo);
    const next = data.corridors[`${nextFrom}-${nextTo}`];
    if (next) {
      setSendAmount(next.defaultAmount);
      setTargetReceive(Math.round(next.defaultAmount * next.midMarketRate));
    }
  }

  function toggleFilter(key: keyof OfferFilters, value: boolean | number) {
    setFilters((current) => {
      const next = {...current};
      if (current[key] === undefined) {
        (next[key] as boolean | number) = value;
      } else {
        delete next[key];
      }
      return next;
    });
  }

  function toggleFavorite() {
    setFavorites((current) => {
      const next = current.includes(dataset.id)
        ? current.filter((id) => id !== dataset.id)
        : [...current, dataset.id];
      try {
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        // Ignoré.
      }
      return next;
    });
  }

  function shareUrl(): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://fikamni.app';
    const params = new URLSearchParams({mode});
    if (mode === 'send') {
      params.set('amount', String(sendAmount));
    } else {
      params.set('target', String(targetReceive));
    }
    return `${origin}/corridor/${fromCode}/${toCode}?${params.toString()}`;
  }

  function shareWhatsApp() {
    const link = shareUrl();
    const message = bestOffer
      ? t('share.message', {
          provider: bestOffer.providerName,
          send: formatMoney(mode === 'receive' ? bestOffer.sendAmount : sendAmount, dataset.sendCurrency, locale),
          received: formatMoney(bestOffer.recipientAmount, dataset.receiveCurrency, locale)
        })
      : t('share.messageGeneric');
    const url = `https://wa.me/?text=${encodeURIComponent(`${message} ${link}`)}`;
    window.open(url, '_blank', 'noopener');
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignoré.
    }
  }

  const activeAmount = mode === 'send' ? sendAmount : targetReceive;
  const activeCurrency = mode === 'send' ? dataset.sendCurrency : dataset.receiveCurrency;

  return (
    <section className="grid gap-4 rounded-[2rem] bg-white p-4 shadow-soft sm:p-6 lg:grid-cols-[340px_1fr]">
      <aside className="space-y-5 rounded-[1.5rem] bg-slate-50 p-4">
        <LocaleSwitcher />

        <div>
          <label htmlFor="from" className="mb-2 block text-sm font-medium text-slate-600">
            {t('controls.from')}
          </label>
          <select
            id="from"
            value={fromCode}
            onChange={(event) => changeCorridor(event.target.value, toCode)}
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
            onChange={(event) => changeCorridor(fromCode, event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500"
          >
            {data.receiveCountries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} {locale === 'fr' ? country.nameFr : country.nameEn}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={toggleFavorite}
          className={`w-full rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
            isFavorite
              ? 'border-amber-300 bg-amber-100 text-amber-800'
              : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300'
          }`}
        >
          {isFavorite ? '★ ' + t('favorites.remove') : '☆ ' + t('favorites.add')}
        </button>

        {favorites.length > 0 ? (
          <div>
            <div className="mb-2 block text-sm font-medium text-slate-600">{t('favorites.title')}</div>
            <div className="flex flex-wrap gap-1.5">
              {favorites.map((id) => {
                const [favFrom, favTo] = id.split('-');
                const favFromCountry = data.sendCountries.find((country) => country.code === favFrom);
                const favToCountry = data.receiveCountries.find((country) => country.code === favTo);
                if (!favFromCountry || !favToCountry) {
                  return null;
                }
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => changeCorridor(favFrom, favTo)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      id === dataset.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-500'
                    }`}
                  >
                    {favFromCountry.flag} → {favToCountry.flag}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Bascule mode envoi / réception */}
        <div>
          <div className="mb-2 block text-sm font-medium text-slate-600">{t('controls.modeLabel')}</div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1 text-xs">
            {(['send', 'receive'] as const).map((candidate) => (
              <button
                key={candidate}
                type="button"
                onClick={() => setMode(candidate)}
                className={`rounded-xl px-2 py-2 font-semibold transition ${
                  mode === candidate ? 'bg-emerald-600 text-white' : 'text-slate-600'
                }`}
                aria-pressed={mode === candidate}
              >
                {candidate === 'send' ? t('controls.modeSend') : t('controls.modeReceive')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="amount" className="mb-2 block text-sm font-medium text-slate-600">
            {mode === 'send' ? t('controls.amount') : t('controls.targetReceive')}
          </label>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="mb-1 text-xs uppercase tracking-wide text-slate-400">{activeCurrency}</div>
            <input
              id="amount"
              type="number"
              min={1}
              step={1}
              value={activeAmount}
              onChange={(event) => {
                const next = Number(event.target.value);
                const safe = next > 0 ? next : mode === 'send' ? dataset.defaultAmount : activeAmount;
                if (mode === 'send') {
                  setSendAmount(safe);
                } else {
                  setTargetReceive(safe);
                }
              }}
              className="w-full border-0 p-0 text-2xl font-semibold text-slate-950 outline-none"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => (mode === 'send' ? setSendAmount(value) : setTargetReceive(value))}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-emerald-500 hover:text-emerald-700"
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {/* Filtres rapides */}
        <div>
          <div className="mb-2 block text-sm font-medium text-slate-600">{t('filters.title')}</div>
          <div className="flex flex-col gap-2 text-sm">
            <FilterToggle active={!!filters.mobileOnly} onClick={() => toggleFilter('mobileOnly', true)} label={t('filters.mobile')} />
            <FilterToggle active={filters.maxFeeRate !== undefined} onClick={() => toggleFilter('maxFeeRate', 0.02)} label={t('filters.cheap')} />
            <FilterToggle active={filters.maxSpeedMinutes !== undefined} onClick={() => toggleFilter('maxSpeedMinutes', 60)} label={t('filters.fast')} />
          </div>
        </div>

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
        <p className="rounded-full bg-slate-900 px-4 py-2 text-center text-xs font-semibold text-emerald-300">
          {t('trust.independent')}
        </p>

        {/* Meilleure offre mise en avant */}
        {bestOffer ? (
          <div className="rounded-[1.5rem] border-2 border-emerald-500 bg-emerald-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                  {t('offer.bestBadge')}
                </span>
                <h3 className="mt-2 text-2xl font-bold text-slate-950">{bestOffer.providerName}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {t('offer.youSend')}{' '}
                  <strong>{formatMoney(mode === 'receive' ? bestOffer.sendAmount : sendAmount, dataset.sendCurrency, locale)}</strong>
                  {' · '}
                  {t('offer.received')}{' '}
                  <strong>{formatMoney(bestOffer.recipientAmount, dataset.receiveCurrency, locale)}</strong>
                </p>
                <p className="mt-1 text-sm text-emerald-800">
                  {t('offer.realCost')} : <strong>{formatMoney(bestOffer.totalRealCost, dataset.sendCurrency, locale)}</strong>
                  {' · '}
                  {providersById.get(bestOffer.providerId)?.[locale === 'fr' ? 'speedLabelFr' : 'speedLabelEn']}
                </p>
              </div>
              <a
                href={`/go/${bestOffer.providerId}?corridor=${dataset.id}&amount=${Math.round(mode === 'receive' ? bestOffer.sendAmount : sendAmount)}`}
                rel="sponsored nofollow noopener"
                className="inline-flex items-center justify-center rounded-2xl bg-amber-400 px-6 py-4 text-base font-bold text-slate-900 shadow-sm transition hover:bg-amber-300"
              >
                {t('offer.cta')} →
              </a>
            </div>
          </div>
        ) : (
          <p className="rounded-[1.5rem] bg-slate-100 p-6 text-center text-sm text-slate-500">{t('filters.none')}</p>
        )}

        {/* Partage */}
        <div className="flex flex-wrap items-center gap-2 rounded-[1.25rem] bg-slate-50 px-4 py-3">
          <span className="text-sm font-medium text-slate-600">{t('share.title')} :</span>
          <button
            type="button"
            onClick={shareWhatsApp}
            className="rounded-full bg-[#25D366] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
          >
            WhatsApp
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-500"
          >
            {copied ? t('share.copied') : t('share.copy')}
          </button>
        </div>

        {/* Liste complète */}
        <div className="grid gap-3">
          {offers.map((offer, index) => (
            <OfferCard
              key={offer.providerId}
              offer={offer}
              rank={index}
              dataset={dataset}
              mode={mode}
              baseSendAmount={sendAmount}
              speedLabel={providersById.get(offer.providerId)?.[locale === 'fr' ? 'speedLabelFr' : 'speedLabelEn'] ?? ''}
              locale={locale}
            />
          ))}
        </div>

        <p className="rounded-[1.25rem] bg-amber-50 px-4 py-3 text-xs text-amber-900">{t('offer.affiliateNote')}</p>
      </div>
    </section>
  );
}

function FilterToggle({active, onClick, label}: {active: boolean; onClick: () => void; label: string}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-left font-medium transition ${
        active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-700'
      }`}
      aria-pressed={active}
    >
      <span className={`h-4 w-4 rounded ${active ? 'bg-white' : 'border border-slate-300'}`} aria-hidden />
      {label}
    </button>
  );
}

function OfferCard({
  offer,
  rank,
  dataset,
  mode,
  baseSendAmount,
  speedLabel,
  locale
}: {
  offer: RankedTransferOffer;
  rank: number;
  dataset: CorridorDataset;
  mode: Mode;
  baseSendAmount: number;
  speedLabel: string;
  locale: Locale;
}) {
  const t = useTranslations();
  const displaySend = mode === 'receive' ? offer.sendAmount : baseSendAmount;

  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-semibold text-slate-950">{offer.providerName}</h4>
            {rank === 0 ? (
              <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                {t('offer.bestBadge')}
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-2.5 py-1">
              {t('offer.speed')}: {speedLabel}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">
              {t('offer.method')}: {t(`payout.${offer.payoutMethod}`)}
            </span>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-sm text-slate-500">{t('offer.realCost')}</p>
          <p className="text-2xl font-semibold text-slate-950">{formatMoney(offer.totalRealCost, dataset.sendCurrency, locale)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-[1.25rem] bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-slate-500">{t('offer.youSend')}</p>
          <p className="mt-1 font-semibold text-slate-950">{formatMoney(displaySend, dataset.sendCurrency, locale)}</p>
        </div>
        <div>
          <p className="text-slate-500">{t('offer.received')}</p>
          <p className="mt-1 font-semibold text-slate-950">{formatMoney(offer.recipientAmount, dataset.receiveCurrency, locale)}</p>
        </div>
        <div>
          <p className="text-slate-500">{t('offer.hiddenFx')}</p>
          <p className="mt-1 font-semibold text-slate-950">{formatMoney(offer.hiddenFxCost, dataset.sendCurrency, locale)}</p>
        </div>
        <div>
          <p className="text-slate-500">{t('offer.debited')}</p>
          <p className="mt-1 font-semibold text-slate-950">{formatMoney(offer.debitedAmount, dataset.sendCurrency, locale)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-400">
          {t('offer.marketMax')}: {formatMoney(offer.midMarketRecipientAmount, dataset.receiveCurrency, locale)}
        </p>
        <a
          href={`/go/${offer.providerId}?corridor=${dataset.id}&amount=${Math.round(displaySend)}`}
          rel="sponsored nofollow noopener"
          className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          {t('offer.cta')}
        </a>
      </div>
    </article>
  );
}

// Contexte minimal pour partager la langue entre le sélecteur et le contenu.
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

export function ComparatorApp({data, initialFrom, initialTo}: ComparatorProps) {
  const [locale, setLocale] = useState<Locale>('fr');

  return (
    <LocaleContext.Provider value={{locale, setLocale}}>
      <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]} timeZone="UTC">
        <ComparatorContent data={data} initialFrom={initialFrom} initialTo={initialTo} />
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
