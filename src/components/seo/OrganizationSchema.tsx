import { JsonLd } from './JsonLd';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  `https://${process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge'}`;

/**
 * Site-wide Organization schema. Rendered once from the root layout so every
 * page carries it. Describes EchoDesk as a company — not a product —
 * which is what Google uses for knowledge-panel eligibility and
 * brand-name queries.
 */
export function OrganizationSchema() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'EchoDesk',
        url: SITE_URL,
        logo: `${SITE_URL}/logo-svg.svg`,
        description:
          'EchoDesk is an all-in-one CRM for Georgian businesses — tickets, WhatsApp, email, Messenger, Instagram, and SIP telephony billed in GEL.',
        email: 'info@echodesk.ge',
        telephone: '+995 510 003 358',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Tbilisi',
          addressCountry: 'GE',
        },
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'Customer Service',
            email: 'info@echodesk.ge',
            telephone: '+995 510 003 358',
            availableLanguage: ['ka', 'en'],
            areaServed: ['GE', 'EU'],
          },
        ],
        areaServed: {
          '@type': 'Country',
          name: 'Georgia',
        },
      }}
    />
  );
}
