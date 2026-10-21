import type { Metadata } from 'next';
import PrivacyPolicy from '@/components/PrivacyPolicy';
import { buildSeoMetadata } from '@/lib/seo-metadata';
import { readPublicMarkdown } from '@/lib/legal/readPublicMarkdown';

export function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ namespace: 'seo.privacyPolicy', path: '/privacy-policy' });
}

export default function PrivacyPolicyPage() {
  // Read on the server so both language versions are in the HTML.
  return (
    <PrivacyPolicy
      content={{
        ka: readPublicMarkdown('privacy-georgian.md'),
        en: readPublicMarkdown('privacy-english.md'),
      }}
    />
  );
}
