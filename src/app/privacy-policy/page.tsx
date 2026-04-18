import type { Metadata } from 'next';
import PrivacyPolicy from '@/components/PrivacyPolicy';
import { buildSeoMetadata } from '@/lib/seo-metadata';

export function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ namespace: 'seo.privacyPolicy', path: '/privacy-policy' });
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicy />;
}
