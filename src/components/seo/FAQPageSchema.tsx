import { getTranslations } from 'next-intl/server';
import { JsonLd } from './JsonLd';
import { FAQ_KEYS } from '@/components/landing/FAQ';

/**
 * FAQPage JSON-LD for the homepage. Reads the same translations the
 * on-page accordion uses so the two stay in lockstep (Google rejects
 * FAQPage schema that doesn't mirror the on-page text).
 *
 * Rendered from a server component so the block is in the initial
 * HTML response — crawlers don't run hydration.
 */
export async function FAQPageSchema() {
  const t = await getTranslations('landing.faq');

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ_KEYS.map((key) => ({
          '@type': 'Question',
          name: t(`items.${key}.question`),
          acceptedAnswer: {
            '@type': 'Answer',
            text: t(`items.${key}.answer`),
          },
        })),
      }}
    />
  );
}
