import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import PrivacyPolicy from '@/components/PrivacyPolicy';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('seo.privacyPolicy');
  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    openGraph: { title: t('title'), description: t('description') },
    twitter: { title: t('title'), description: t('description') },
    alternates: { canonical: '/privacy-policy' },
  };
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicy />;
}
