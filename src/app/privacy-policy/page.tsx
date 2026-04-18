import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import PrivacyPolicy from '@/components/PrivacyPolicy';
import { ogImage } from '@/lib/og';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('seo.privacyPolicy');
  const og = ogImage({ title: t('ogTitle'), subtitle: t('ogSubtitle'), tag: t('ogTag') });
  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    openGraph: { title: t('title'), description: t('description'), images: [og] },
    twitter: { title: t('title'), description: t('description'), images: [og] },
    alternates: { canonical: '/privacy-policy' },
  };
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicy />;
}
