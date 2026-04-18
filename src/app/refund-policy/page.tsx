import type { Metadata } from 'next';
import RefundPolicy from '@/components/RefundPolicy';
import { buildSeoMetadata } from '@/lib/seo-metadata';

export function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ namespace: 'seo.refundPolicy', path: '/refund-policy' });
}

export default function RefundPolicyPage() {
  return <RefundPolicy />;
}
