import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import TermsOfService from '@/components/TermsOfService';
import { ogImage } from '@/lib/og';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('seo.termsOfService');
  const og = ogImage({ title: t('ogTitle'), subtitle: t('ogSubtitle'), tag: t('ogTag') });
  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    openGraph: { title: t('title'), description: t('description'), images: [og] },
    twitter: { title: t('title'), description: t('description'), images: [og] },
    alternates: { canonical: '/terms-of-service' },
  };
}

export default function TermsOfServicePage() {
  return <TermsOfService />;
}
