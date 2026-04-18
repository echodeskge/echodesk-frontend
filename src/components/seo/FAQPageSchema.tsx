import { JsonLd } from './JsonLd';
import { FAQ_KEYS } from '@/components/landing/faq-keys';

type Translator = (key: string) => string;

/**
 * FAQPage JSON-LD for the homepage. Reads the same translations the
 * on-page accordion uses so the two stay in lockstep (Google rejects
 * FAQPage schema that doesn't mirror the on-page text).
 *
 * Intentionally SYNCHRONOUS — awaiting translations here causes React
 * to suspend mid-stream, which pushes the page's <title> + <meta name=
 * "description"> into <body> instead of <head> (Lighthouse then marks
 * meta-description as missing). The caller resolves translations and
 * hands in a translator function.
 */
export function FAQPageSchema({ t }: { t: Translator }) {
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
