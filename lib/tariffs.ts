import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {CorridorTariff} from '@/lib/pricing';
import {DEMO_TARIFF_PROFILES, DEMO_TARIFFS_UPDATED_AT} from '@/lib/demo-data';
import {corridorId} from '@/lib/geo';

/**
 * Couche « tarifs par couloir ».
 *
 * ⚠️ Module SERVEUR uniquement (accès disque).
 *
 * Source de vérité : `data/tariffs.json` produit par `scripts/ingest-rpw.ts`
 * (base Banque Mondiale « Remittance Prices Worldwide » normalisée). En son
 * absence, on retombe sur les profils tarifaires démo, appliqués uniformément à
 * tous les couloirs. Le normaliseur RPW est pur pour être testable.
 */

export interface TariffsSnapshot {
  updatedAt: string;
  source: string;
  /** Tarifs indexés par identifiant de couloir (« fr-sn »). */
  corridors: Record<string, CorridorTariff[]>;
}

export interface CorridorTariffs {
  tariffs: CorridorTariff[];
  updatedAt: string;
  source: string;
}

/** Convertit les profils démo (indépendants du couloir) en tarifs concrets. */
function demoCorridorTariffs(): CorridorTariff[] {
  return DEMO_TARIFF_PROFILES.map((profile) => ({...profile}));
}

/** Ligne RPW normalisée en amont par le script d'ingestion. */
export interface RpwTariffRow {
  from: string;
  to: string;
  providerId: string;
  fixedFee: number;
  variableFeeRate: number;
  fxSpreadRate: number;
  receiveFeeRate?: number;
}

/**
 * Normalise des lignes RPW en instantané de tarifs, groupées par couloir.
 * PURE : réutilisée par `scripts/ingest-rpw.ts` et testée unitairement.
 */
export function normalizeRpwRows(rows: RpwTariffRow[], meta: {updatedAt?: string; source?: string} = {}): TariffsSnapshot {
  const corridors: Record<string, CorridorTariff[]> = {};

  for (const row of rows) {
    if (!Number.isFinite(row.fixedFee) || !Number.isFinite(row.variableFeeRate) || !Number.isFinite(row.fxSpreadRate)) {
      continue; // On écarte les lignes RPW incomplètes.
    }
    const id = corridorId(row.from, row.to);
    const tariff: CorridorTariff = {
      providerId: row.providerId,
      fixedFee: Math.max(row.fixedFee, 0),
      variableFeeRate: Math.max(row.variableFeeRate, 0),
      fxSpreadRate: Math.max(row.fxSpreadRate, 0),
      receiveFeeRate: Math.max(row.receiveFeeRate ?? 0, 0)
    };
    (corridors[id] ??= []).push(tariff);
  }

  return {
    updatedAt: meta.updatedAt ?? new Date().toISOString(),
    source: meta.source ?? 'world-bank-rpw',
    corridors
  };
}

let cachedSnapshot: TariffsSnapshot | null = null;

function loadTariffsSnapshot(): TariffsSnapshot | null {
  if (cachedSnapshot) {
    return cachedSnapshot;
  }
  try {
    const filePath = join(process.cwd(), 'data', 'tariffs.json');
    const raw = JSON.parse(readFileSync(filePath, 'utf8')) as TariffsSnapshot;
    if (raw && typeof raw === 'object' && raw.corridors) {
      cachedSnapshot = raw;
      return cachedSnapshot;
    }
  } catch {
    // Fichier absent ou illisible : on utilisera la démo.
  }
  return null;
}

/**
 * Renvoie les tarifs d'un couloir. Si le fichier ingéré contient ce couloir, on
 * l'utilise ; sinon on retombe sur les profils démo (source « demo »).
 */
export function getCorridorTariffs(id: string): CorridorTariffs {
  const snapshot = loadTariffsSnapshot();
  const loaded = snapshot?.corridors[id];
  if (snapshot && loaded && loaded.length > 0) {
    return {tariffs: loaded, updatedAt: snapshot.updatedAt, source: snapshot.source};
  }
  return {tariffs: demoCorridorTariffs(), updatedAt: DEMO_TARIFFS_UPDATED_AT, source: 'demo'};
}
