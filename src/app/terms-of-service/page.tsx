import type { Metadata } from 'next';
import TermsOfService from '@/components/TermsOfService';
import { buildSeoMetadata } from '@/lib/seo-metadata';

export function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ namespace: 'seo.termsOfService', path: '/terms-of-service' });
}

export default function TermsOfServicePage() {
  return <TermsOfService />;
}
