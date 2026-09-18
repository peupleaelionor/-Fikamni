'use client';

import {useMemo, useState} from 'react';
import type {CorridorRatePoint} from '@/lib/rate-history';

/**
 * Graphique d'évolution du taux mi-marché d'un couloir (SVG inline, sans
 * dépendance). Bascule 7 / 30 / 90 jours. Série unique, couleur de marque.
 */
const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

const BRAND = '#059669'; // emerald-600
const WIDTH = 640;
const HEIGHT = 200;
const PADDING = {top: 16, right: 12, bottom: 24, left: 12};

function formatRate(value: number, locale: 'fr' | 'en') {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {maximumFractionDigits: 2}).format(value);
}

export function RateChart({
  series,
  fromCurrency,
  toCurrency,
  title,
  locale = 'fr'
}: {
  series: CorridorRatePoint[];
  fromCurrency: string;
  toCurrency: string;
  title: string;
  locale?: 'fr' | 'en';
}) {
  const [range, setRange] = useState<Range>(30);

  const view = useMemo(() => series.slice(-range), [series, range]);

  const geometry = useMemo(() => {
    if (view.length === 0) {
      return null;
    }
    const values = view.map((point) => point.rate);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || max || 1;
    const innerW = WIDTH - PADDING.left - PADDING.right;
    const innerH = HEIGHT - PADDING.top - PADDING.bottom;

    const coords = view.map((point, index) => {
      const x = PADDING.left + (view.length === 1 ? innerW / 2 : (index / (view.length - 1)) * innerW);
      const y = PADDING.top + innerH - ((point.rate - min) / span) * innerH;
      return {x, y};
    });

    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
    const area = `${line} L${coords[coords.length - 1].x.toFixed(1)},${(PADDING.top + innerH).toFixed(1)} L${coords[0].x.toFixed(1)},${(PADDING.top + innerH).toFixed(1)} Z`;

    return {min, max, coords, line, area, last: coords[coords.length - 1]};
  }, [view]);

  const first = view[0]?.rate;
  const last = view[view.length - 1]?.rate;
  const deltaPct = first && last ? ((last - first) / first) * 100 : 0;
  const deltaLabel = `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(2)} %`;

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950">{title}</h3>
          <p className="text-xs text-slate-500">
            {fromCurrency} → {toCurrency} · sur {range} jours :{' '}
            <span className={deltaPct >= 0 ? 'text-emerald-600' : 'text-red-600'}>{deltaLabel}</span>
          </p>
        </div>
        <div className="flex gap-1 rounded-full bg-slate-100 p-1 text-xs">
          {RANGES.map((candidate) => (
            <button
              key={candidate}
              type="button"
              onClick={() => setRange(candidate)}
              className={`rounded-full px-3 py-1 font-semibold transition ${
                range === candidate ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'
              }`}
              aria-pressed={range === candidate}
            >
              {candidate}j
            </button>
          ))}
        </div>
      </div>

      {geometry ? (
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="mt-4 h-auto w-full"
          role="img"
          aria-label={`${title} : de ${formatRate(first ?? 0, locale)} à ${formatRate(last ?? 0, locale)} ${toCurrency} pour 1 ${fromCurrency} sur ${range} jours (${deltaLabel}).`}
        >
          <path d={geometry.area} fill={BRAND} fillOpacity={0.08} />
          <path d={geometry.line} fill="none" stroke={BRAND} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={geometry.last.x} cy={geometry.last.y} r={3.5} fill={BRAND} />
          <text x={PADDING.left} y={12} className="fill-slate-400" fontSize={11}>
            max {formatRate(geometry.max, locale)}
          </text>
          <text x={PADDING.left} y={HEIGHT - 8} className="fill-slate-400" fontSize={11}>
            min {formatRate(geometry.min, locale)}
          </text>
        </svg>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Historique indisponible.</p>
      )}

      <p className="mt-2 text-xs text-slate-400">
        Taux mi-marché indicatif. Les parités du Franc CFA (XOF, XAF) sont fixes vis-à-vis de l&apos;euro.
      </p>
    </div>
  );
}
