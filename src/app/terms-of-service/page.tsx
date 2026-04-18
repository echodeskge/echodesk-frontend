import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import TermsOfService from '@/components/TermsOfService';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('seo.termsOfService');
  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    openGraph: { title: t('title'), description: t('description') },
    twitter: { title: t('title'), description: t('description') },
    alternates: { canonical: '/terms-of-service' },
  };
}

export default function TermsOfServicePage() {
  return <TermsOfService />;
}
