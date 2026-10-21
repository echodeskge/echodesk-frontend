import type { Metadata } from 'next';
import DataDeletion from '@/components/legal/DataDeletion';
import { buildSeoMetadata } from '@/lib/seo-metadata';

export function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ namespace: 'seo.dataDeletion', path: '/data-deletion' });
}

// Static, server-rendered: Meta's reviewers / crawler get the full
// instructions in the HTML without running any client code.
export default function DataDeletionPage() {
  return <DataDeletion />;
}
