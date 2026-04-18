import { JsonLd } from './JsonLd';
import type { LandingPage } from '@/hooks/useLandingPages';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  `https://${process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge'}`;

const CATEGORY_NAMES: Record<string, { ka: string; en: string; path: string }> = {
  feature: { ka: 'ფუნქციები', en: 'Features', path: '/#features' },
  vertical: { ka: 'ინდუსტრიები', en: 'Verticals', path: '/#verticals' },
  comparison: { ka: 'შედარება', en: 'Compare', path: '/#compare' },
};

/**
 * schema.org `WebPage` + `BreadcrumbList` + optional `FAQPage` JSON-LD
 * for a single SEO landing page. Rendered synchronously from pre-resolved
 * data so it lands in the initial HTML response alongside <title>/<meta>.
 */
export function LandingPageSchema({
  page,
  url,
  locale,
}: {
  page: LandingPage;
  url: string;
  locale: 'ka' | 'en';
}) {
  const category = CATEGORY_NAMES[page.page_type] || CATEGORY_NAMES.feature;
  const categoryName = locale === 'ka' ? category.ka : category.en;
  const categoryUrl = `${SITE_URL}${category.path}`;

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.meta_title || page.title,
    description: page.meta_description || page.summary,
    url,
    inLanguage: locale === 'ka' ? 'ka-GE' : 'en-US',
    isPartOf: {
      '@type': 'WebSite',
      name: 'EchoDesk',
      url: SITE_URL,
    },
    breadcrumb: { '@id': `${url}#breadcrumb` },
    datePublished: page.published_at,
    dateModified: page.updated_at || page.published_at,
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'EchoDesk', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: categoryName, item: categoryUrl },
      { '@type': 'ListItem', position: 3, name: page.title, item: url },
    ],
  };

  const blocks: Array<Record<string, unknown>> = [webPage, breadcrumb];

  if (Array.isArray(page.faq_items) && page.faq_items.length > 0) {
    const faqPage = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faq_items
        .map((item) => {
          const q = locale === 'ka' ? item.question_ka : item.question_en;
          const a = locale === 'ka' ? item.answer_ka : item.answer_en;
          if (!q || !a) return null;
          return {
            '@type': 'Question',
            name: q,
            acceptedAnswer: { '@type': 'Answer', text: a },
          };
        })
        .filter(Boolean),
    };
    blocks.push(faqPage as Record<string, unknown>);
  }

  return (
    <>
      {blocks.map((block, i) => (
        <JsonLd key={i} data={block} />
      ))}
    </>
  );
}
