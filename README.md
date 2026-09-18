# Fikamni

Comparateur **d'information** de transferts d'argent pour la diaspora africaine.
Fikamni classe les offres selon le **coût réel** (frais visibles + marge de change
+ frais côté réception) et non selon les seuls frais affichés.

> ⚠️ Fikamni est un produit d'information : ce **n'est pas** un prestataire de
> services de paiement (PSP). Aucun fonds n'est détenu, aucun transfert n'est
> exécuté. Certains liens vers les prestataires sont des liens d'affiliation
> (sans incidence sur le classement).

## Architecture

- **Next.js App Router + TypeScript + Tailwind + next-intl** (FR/EN).
- `lib/engine.ts` — moteur de calcul **pur** du coût réel (couvert par Vitest).
- `lib/pricing.ts` — assemble les entrées du moteur (pur, partagé serveur/client).
- `lib/geo.ts` — pays d'envoi/réception, devises, couloirs, slugs SEO.
- `lib/providers.ts` — registre des prestataires + URL d'affiliation.
- `lib/rates.ts` / `lib/tariffs.ts` — chargement des données (taux, tarifs) avec
  **repli sur les données de démonstration** (`lib/demo-data.ts`).
- `lib/offers.ts` — orchestration serveur → instantané sérialisable pour le client.

### Pages

- `/` — comparateur générique + couloirs populaires.
- `/corridor/[from]/[to]` — landing SEO par couloir (60 pages statiques,
  `generateStaticParams`), comparateur pré-rempli.
- `/methodologie` — explication du calcul du coût réel.
- `/go/[provider]` — journalise le clic puis redirige vers l'URL d'affiliation.
- `/api/cron/fetch-rates` — point d'entrée du cron Vercel (taux mi-marché).

### Périmètre Phase 1

- **6 pays d'envoi** : France, Belgique, Allemagne, Royaume-Uni, États-Unis, Canada.
- **10 pays de réception** : Congo (RDC), Sénégal, Côte d'Ivoire, Mali, Cameroun,
  Congo-Brazzaville, Maroc, Nigeria, Ghana, Kenya.

## Couche données

Les scripts produisent des fichiers dans `data/` (ignorés par git). En leur
absence, l'application utilise les données de démonstration de `lib/demo-data.ts`.
La **date de dernière mise à jour** est affichée par couloir.

- `npm run fetch:rates` — taux mi-marché (base EUR) via **exchangerate.host**
  (clé optionnelle `EXCHANGERATE_ACCESS_KEY`) avec repli **ECB** puis démo.
  Écrit `data/rates.json`. Les parités du Franc CFA (XOF, XAF) sont forcées à
  655,957 (parité fixe avec l'euro).
- `npm run ingest:rpw -- ./chemin/vers/rpw.csv` — normalise la base Banque
  Mondiale « Remittance Prices Worldwide » en `data/tariffs.json`. Sans source,
  génère une grille depuis les profils de démonstration.

## Scripts npm

- `npm run dev` — démarre l'application en développement.
- `npm run build` — récupère les taux (`fetch:rates`) **puis** construit l'app.
- `npm run start` — sert le build de production.
- `npm run lint` — ESLint.
- `npm run typecheck` — vérification TypeScript (`tsc --noEmit`).
- `npm run test` — tests Vitest.
- `npm run fetch:rates` / `npm run ingest:rpw` — voir « Couche données ».

## Commandes — développement local

```bash
npm install
npm run test         # 27 tests (moteur, tarification, géo, taux, tarifs)
npm run typecheck
npm run lint
npm run fetch:rates  # optionnel : taux frais dans data/rates.json
npm run dev          # http://localhost:3000
```

## Déploiement Vercel (avec cron)

Le build exécute automatiquement `fetch:rates`, donc chaque déploiement construit
les pages statiques avec des taux frais.

```bash
npm i -g vercel
vercel            # première fois : lie le projet
vercel --prod     # déploiement en production
```

### Cron

`vercel.json` déclare un cron quotidien (06:00 UTC) :

```json
{ "crons": [ { "path": "/api/cron/fetch-rates", "schedule": "0 6 * * *" } ] }
```

Les pages étant statiques (SSG), le cron ne peut pas les régénérer seul (système
de fichiers en lecture seule sur Vercel). Pour boucler le rafraîchissement,
configurez un **Deploy Hook** Vercel et exposez-le à la route :

- `VERCEL_DEPLOY_HOOK_URL` — URL du Deploy Hook ; le cron déclenche alors un
  redéploiement qui reconstruit les pages avec les taux du jour.
- `CRON_SECRET` (optionnel) — si défini, la route exige
  `Authorization: Bearer <CRON_SECRET>` (Vercel Cron l'envoie automatiquement).
- `EXCHANGERATE_ACCESS_KEY` (optionnel) — clé exchangerate.host.
- `NEXT_PUBLIC_SITE_URL` (optionnel) — URL canonique pour les métadonnées SEO.

Variables à définir dans **Vercel → Settings → Environment Variables**.
