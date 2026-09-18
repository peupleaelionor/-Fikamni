/**
 * Ingestion des tarifs « Remittance Prices Worldwide » (Banque Mondiale) et
 * écriture de `data/tariffs.json` normalisé (indexé par couloir).
 *
 * Entrée (optionnelle) : chemin passé en argument ou via RPW_SOURCE.
 *   - Fichier .json : tableau de lignes déjà mises en forme (RpwTariffRow[]).
 *   - Fichier .csv  : CSV brut RPW (ou CSV « maison ») — les colonnes sont
 *     détectées par leur en-tête, les pays hors Phase 1 sont ignorés.
 *
 * Sans entrée exploitable, on GÉNÈRE une grille à partir des profils de
 * démonstration appliqués à tous les couloirs (source « demo-generated »), afin
 * que le pipeline reste démontrable de bout en bout. La couche `lib/tariffs`
 * retombe de toute façon sur la démo si le fichier est absent.
 *
 * Exécution : `npm run ingest:rpw -- ./chemin/vers/rpw.csv`
 */
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {DEMO_TARIFF_PROFILES} from '@/lib/demo-data';
import {listCorridors} from '@/lib/geo';
import {normalizeRpwRows, type RpwTariffRow, type TariffsSnapshot} from '@/lib/tariffs';

/** Correspondance nom / code ISO3 RPW → code ISO2 interne (Phase 1 uniquement). */
const COUNTRY_TO_INTERNAL: Record<string, string> = {
  // Envoi
  france: 'fr', fra: 'fr',
  belgium: 'be', belgique: 'be', bel: 'be',
  germany: 'de', allemagne: 'de', deu: 'de',
  'united kingdom': 'gb', gbr: 'gb', uk: 'gb',
  'united states': 'us', usa: 'us',
  canada: 'ca', can: 'ca',
  // Réception
  'congo, dem. rep.': 'cd', 'dr congo': 'cd', cod: 'cd',
  senegal: 'sn', sénégal: 'sn', sen: 'sn',
  "cote d'ivoire": 'ci', "côte d'ivoire": 'ci', civ: 'ci',
  mali: 'ml', mli: 'ml',
  cameroon: 'cm', cameroun: 'cm', cmr: 'cm',
  'congo, rep.': 'cg', 'republic of the congo': 'cg', cog: 'cg',
  morocco: 'ma', maroc: 'ma', mar: 'ma',
  nigeria: 'ng', nga: 'ng',
  ghana: 'gh', gha: 'gh',
  kenya: 'ke', ken: 'ke'
};

function toInternalCode(raw: string): string | undefined {
  const key = raw.trim().toLowerCase();
  if (COUNTRY_TO_INTERNAL[key]) {
    return COUNTRY_TO_INTERNAL[key];
  }
  // Déjà un code interne ?
  if (/^[a-z]{2}$/.test(key) && listCorridors().some((c) => c.from.code === key || c.to.code === key)) {
    return key;
  }
  return undefined;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Parseur CSV minimal gérant les champs entre guillemets. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') {
        i += 1;
      }
      row.push(field);
      rows.push(row);
      field = '';
      row = [];
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

function pick(headers: string[], record: string[], candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    const index = headers.indexOf(candidate);
    if (index !== -1 && record[index] !== undefined && record[index].trim() !== '') {
      return record[index].trim();
    }
  }
  return undefined;
}

function rowsFromCsv(text: string): RpwTariffRow[] {
  const parsed = parseCsv(text);
  if (parsed.length < 2) {
    return [];
  }
  const headers = parsed[0].map((h) => h.trim().toLowerCase());
  const out: RpwTariffRow[] = [];

  for (const record of parsed.slice(1)) {
    const fromRaw = pick(headers, record, ['from', 'source_code', 'source_name', 'sending_country']);
    const toRaw = pick(headers, record, ['to', 'destination_code', 'destination_name', 'receiving_country']);
    const firm = pick(headers, record, ['providerid', 'provider_id', 'firm', 'provider']);
    if (!fromRaw || !toRaw || !firm) {
      continue;
    }
    const from = toInternalCode(fromRaw);
    const to = toInternalCode(toRaw);
    if (!from || !to) {
      continue; // Pays hors Phase 1.
    }

    const fixedFee = Number(pick(headers, record, ['fixedfee', 'cc1_fee_lcu', 'fee_lcu']) ?? '0');
    const feePct = Number(pick(headers, record, ['variablefeerate', 'cc1_fee_pct', 'fee_pct']) ?? '0');
    const marginPct = Number(pick(headers, record, ['fxspreadrate', 'cc2_ex_rate_margin_pct', 'margin_pct']) ?? '0');
    const receivePct = Number(pick(headers, record, ['receivefeerate', 'cc2_fee_pct']) ?? '0');

    out.push({
      from,
      to,
      providerId: /^[a-z0-9-]+$/.test(firm) ? firm : slugify(firm),
      fixedFee,
      // Les pourcentages RPW sont exprimés en %, on convertit en fraction si > 1.
      variableFeeRate: feePct > 1 ? feePct / 100 : feePct,
      fxSpreadRate: marginPct > 1 ? marginPct / 100 : marginPct,
      receiveFeeRate: receivePct > 1 ? receivePct / 100 : receivePct
    });
  }
  return out;
}

function readRows(inputPath: string): RpwTariffRow[] {
  const content = readFileSync(inputPath, 'utf8');
  if (inputPath.endsWith('.json')) {
    const parsed = JSON.parse(content) as RpwTariffRow[];
    return Array.isArray(parsed) ? parsed : [];
  }
  return rowsFromCsv(content);
}

/** Génère une grille tarifaire à partir des profils démo (secours). */
function generateFromDemo(): TariffsSnapshot {
  const rows: RpwTariffRow[] = [];
  for (const corridor of listCorridors()) {
    for (const profile of DEMO_TARIFF_PROFILES) {
      rows.push({
        from: corridor.from.code,
        to: corridor.to.code,
        providerId: profile.providerId,
        fixedFee: profile.fixedFee,
        variableFeeRate: profile.variableFeeRate,
        fxSpreadRate: profile.fxSpreadRate,
        receiveFeeRate: profile.receiveFeeRate
      });
    }
  }
  return normalizeRpwRows(rows, {source: 'demo-generated', updatedAt: new Date().toISOString()});
}

function main() {
  const inputPath = process.argv[2] ?? process.env.RPW_SOURCE;
  let snapshot: TariffsSnapshot;

  if (inputPath) {
    const rows = readRows(inputPath);
    if (rows.length > 0) {
      snapshot = normalizeRpwRows(rows, {source: 'world-bank-rpw', updatedAt: new Date().toISOString()});
      console.log(`→ ${rows.length} lignes RPW lues depuis ${inputPath}.`);
    } else {
      console.warn(`⚠ Aucune ligne exploitable dans ${inputPath}. Repli sur la génération démo.`);
      snapshot = generateFromDemo();
    }
  } else {
    console.warn('⚠ Aucune source RPW fournie. Génération depuis les profils de démonstration.');
    snapshot = generateFromDemo();
  }

  const dir = join(process.cwd(), 'data');
  mkdirSync(dir, {recursive: true});
  writeFileSync(join(dir, 'tariffs.json'), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  const corridorCount = Object.keys(snapshot.corridors).length;
  console.log(`✓ data/tariffs.json écrit (source: ${snapshot.source}, ${corridorCount} couloirs).`);
}

main();
