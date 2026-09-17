import type {PayoutMethod} from '@/lib/engine';

/**
 * Registre des prestataires (métadonnées stables).
 *
 * ⚠️ Ces prestataires sont FICTIFS : Fikamni est un produit d'information et
 * n'est affilié à aucun établissement de paiement réel. Les URL utilisent le
 * TLD réservé `.example` pour éviter toute confusion. En production, on
 * remplacera `affiliateBaseUrl` par les vraies URL de tracking partenaires.
 *
 * Les tarifs (frais, marge de change) ne vivent PAS ici : ils dépendent du
 * couloir et proviennent de la couche `tariffs` (données démo ou RPW). Ici on
 * ne stocke que ce qui est constant : nom, mode de réception, délai, affiliation.
 */

export interface Provider {
  id: string;
  name: string;
  payoutMethod: PayoutMethod;
  speedLabelFr: string;
  speedLabelEn: string;
  /** URL d'affiliation de base vers laquelle `/go/[provider]` redirige. */
  affiliateBaseUrl: string;
}

export const providers: Provider[] = [
  {
    id: 'sango-pay',
    name: 'Sango Pay',
    payoutMethod: 'mobile',
    speedLabelFr: 'Quelques minutes',
    speedLabelEn: 'A few minutes',
    affiliateBaseUrl: 'https://www.sango-pay.example/envoyer'
  },
  {
    id: 'baobab-remit',
    name: 'Baobab Remit',
    payoutMethod: 'bank',
    speedLabelFr: '1 h',
    speedLabelEn: '1 hr',
    affiliateBaseUrl: 'https://www.baobab-remit.example/transfer'
  },
  {
    id: 'sahel-cash',
    name: 'Sahel Cash',
    payoutMethod: 'cash',
    speedLabelFr: '15 min',
    speedLabelEn: '15 min',
    affiliateBaseUrl: 'https://www.sahel-cash.example/send'
  },
  {
    id: 'teranga-money',
    name: 'Teranga Money',
    payoutMethod: 'mobile',
    speedLabelFr: '20 min',
    speedLabelEn: '20 min',
    affiliateBaseUrl: 'https://www.teranga-money.example/go'
  },
  {
    id: 'kina-transfer',
    name: 'Kina Transfer',
    payoutMethod: 'bank',
    speedLabelFr: '2 h',
    speedLabelEn: '2 hrs',
    affiliateBaseUrl: 'https://www.kina-transfer.example/start'
  },
  {
    id: 'zamani-send',
    name: 'Zamani Send',
    payoutMethod: 'bank',
    speedLabelFr: '10 min',
    speedLabelEn: '10 min',
    affiliateBaseUrl: 'https://www.zamani-send.example/pay'
  },
  {
    id: 'ubuntu-wallet',
    name: 'Ubuntu Wallet',
    payoutMethod: 'mobile',
    speedLabelFr: 'Instantané',
    speedLabelEn: 'Instant',
    affiliateBaseUrl: 'https://www.ubuntu-wallet.example/remit'
  }
];

const providerById = new Map<string, Provider>(providers.map((provider) => [provider.id, provider]));

export function getProvider(id: string): Provider | undefined {
  return providerById.get(id);
}

export interface AffiliateClickContext {
  corridor?: string;
  amount?: string;
}

/**
 * Construit l'URL d'affiliation finale en ajoutant les paramètres de tracking
 * (source Fikamni + couloir + montant) sans écraser ceux déjà présents.
 */
export function buildAffiliateUrl(provider: Provider, context: AffiliateClickContext = {}): string {
  const url = new URL(provider.affiliateBaseUrl);
  url.searchParams.set('utm_source', 'fikamni');
  url.searchParams.set('utm_medium', 'affiliate');
  if (context.corridor) {
    url.searchParams.set('fk_corridor', context.corridor);
  }
  if (context.amount) {
    url.searchParams.set('fk_amount', context.amount);
  }
  return url.toString();
}
