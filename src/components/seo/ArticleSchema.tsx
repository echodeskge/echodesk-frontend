import { JsonLd } from './JsonLd';
import type { BlogPost } from '@/hooks/useBlog';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  `https://${process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge'}`;

/**
 * schema.org `Article` + `BreadcrumbList` JSON-LD for a single blog post.
 * Emits a second `FAQPage` block if the post has any FAQ items — that's
 * what unlocks Google's FAQ rich result.
 */
export function ArticleSchema({
  post,
  url,
  locale,
}: {
  post: BlogPost;
  url: string;
  locale: 'ka' | 'en';
}) {
  const imageUrl = post.hero_image_url || `${SITE_URL}/blog/${post.slug}/opengraph-image`;

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: post.title,
    description: post.summary,
    image: imageUrl,
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    inLanguage: locale === 'ka' ? 'ka-GE' : 'en-US',
    author: {
      '@type': 'Organization',
      name: 'EchoDesk',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'EchoDesk',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-svg.svg` },
    },
    keywords: (post.keywords || []).join(', '),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'EchoDesk', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };

  const blocks: Array<Record<string, unknown>> = [article, breadcrumb];

  if (Array.isArray(post.faq_items) && post.faq_items.length > 0) {
    const faqPage = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faq_items
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
