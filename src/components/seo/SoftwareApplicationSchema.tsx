import { JsonLd } from './JsonLd';
import type { Feature } from '@/types/package';
import { PACKS } from '@/data/packs';
import { MIN_EMPLOYEES, packModuleKeys, packPerEmployee } from '@/lib/pricing';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  `https://${process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge'}`;

type Translator = (key: string) => string;

/**
 * Homepage SoftwareApplication schema. One `Offer` per pack, priced from
 * the live feature catalogue. `price` is the pack's price for one employee
 * (MIN_EMPLOYEES = 1) — intentional: pricing is per employee from 1, with no
 * packs of seats — and the unit price repeats it in `priceSpecification`,
 * so the numbers Google sees match the pack cards below.
 */
export function SoftwareApplicationSchema({ features, t }: { features: Feature[]; t?: Translator }) {
  const slugs = PACKS.map((p) => p.slug);
  const offers = slugs
    .filter((slug) => packModuleKeys(slug, features).length > 0)
    .map((slug) => {
      const perEmployee = packPerEmployee(slug, features);
      return {
        '@type': 'Offer',
        name: t ? t(`packs.${slug}.name`) : slug,
        priceCurrency: 'GEL',
        price: (perEmployee * MIN_EMPLOYEES).toFixed(2),
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          priceCurrency: 'GEL',
          price: perEmployee.toFixed(2),
          unitText: 'employee / month',
        },
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}/registration?pack=${slug}&employees=${MIN_EMPLOYEES}`,
      };
    });

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
          'All-in-one business platform for Georgian SMBs: tickets, unified inbox (WhatsApp, Messenger, Instagram, email), calls & PBX, bookings, online shop, invoices and leave management — priced per employee in Georgian Lari.',
        offers,
        featureList: features.map((f) => f.name).join(', '),
      }}
    />
  );
}
