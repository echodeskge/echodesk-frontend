import { JsonLd } from './JsonLd';
import type { Feature } from '@/types/package';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  `https://${process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge'}`;

/**
 * Homepage SoftwareApplication schema. The Offer block uses real GEL
 * prices computed from the feature catalogue so the range Google sees in
 * rich snippets matches the pricing table below.
 */
export function SoftwareApplicationSchema({ features }: { features: Feature[] }) {
  const perUserPrices = features
    .map((f) => parseFloat(f.price_per_user_gel || '0'))
    .filter((n) => Number.isFinite(n) && n > 0);

  const lowPrice = perUserPrices.length > 0 ? Math.min(...perUserPrices) : 8;
  // A realistic "growth team" upper bound: all paid features × 5 agents.
  const highPrice =
    perUserPrices.length > 0
      ? perUserPrices.reduce((sum, p) => sum + p, 0) * 5
      : 200;

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'EchoDesk',
        url: SITE_URL,
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'CRM',
        operatingSystem: 'Web',
        inLanguage: ['ka', 'en'],
        description:
          'All-in-one CRM for Georgian businesses: tickets, WhatsApp, email, Messenger, Instagram, and SIP PBX calling — billed in Georgian Lari.',
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'GEL',
          lowPrice: lowPrice.toFixed(2),
          highPrice: highPrice.toFixed(2),
          offerCount: features.length,
          availability: 'https://schema.org/InStock',
          url: `${SITE_URL}/#pricing`,
        },
        featureList: features.map((f) => f.name).join(', '),
      }}
    />
  );
}
