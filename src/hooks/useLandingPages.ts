import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

/**
 * Public SEO landing pages API — mirrors the pattern in useBlog.ts.
 * Uses a plain axios instance so the tenant-auth interceptors in
 * `src/api/axios.ts` don't add an Authorization header (which would
 * break CORS for anonymous visitors on the root marketing domain).
 */

const landingAxios = axios.create({
  timeout: 30000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

export const LANDING_API_BASE = `${
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.echodesk.ge'
}/api/landing/public`;

// ---------------------------------------------------------------------------
// Types — mirror PublicLandingPageList / PublicLandingPageDetail in
// echodesk-back/landing_pages/serializers.py. Locale-resolved server-side,
// so top-level string fields are plain strings (not JSON maps). Nested
// content blocks and faq items keep both _ka and _en so we can switch
// locales without re-fetching.
// ---------------------------------------------------------------------------

export type LandingPageType = 'feature' | 'vertical' | 'comparison';

export interface LandingPageListItem {
  id: number;
  slug: string;
  page_type: LandingPageType;
  title: string;
  summary: string;
  hero_subtitle: string;
  og_tag: string;
  competitor_name: string;
  highlighted_feature_slugs: string[];
  published_at: string;
  updated_at: string;
}

export interface LandingBenefitGridItem {
  icon: string;
  title_ka: string;
  title_en: string;
  description_ka: string;
  description_en: string;
}

export interface LandingChecklistItemText {
  text_ka: string;
  text_en: string;
}

export interface LandingContentBlockBenefitGrid {
  type: 'benefit_grid';
  heading_ka: string;
  heading_en: string;
  items: LandingBenefitGridItem[];
}

export interface LandingContentBlockChecklist {
  type: 'checklist';
  heading_ka: string;
  heading_en: string;
  items: LandingChecklistItemText[];
}

export interface LandingContentBlockFeatureShowcase {
  type: 'feature_showcase';
  heading_ka: string;
  heading_en: string;
  feature_slug: string;
  body_ka: string;
  body_en: string;
}

export type LandingContentBlock =
  | LandingContentBlockBenefitGrid
  | LandingContentBlockChecklist
  | LandingContentBlockFeatureShowcase;

export interface LandingFaqItem {
  question_ka: string;
  question_en: string;
  answer_ka: string;
  answer_en: string;
}

export interface LandingComparisonRow {
  feature: string;
  us: string;
  them: string;
  winner: string;
}

export interface LandingPage extends LandingPageListItem {
  meta_title: string;
  meta_description: string;
  keywords: string[];
  content_blocks: LandingContentBlock[];
  faq_items: LandingFaqItem[];
  comparison_matrix: LandingComparisonRow[];
  created_at: string;
}

export interface PaginatedLandingPageList {
  count: number;
  next: string | null;
  previous: string | null;
  results: LandingPageListItem[];
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export interface LandingPagesParams {
  pageType?: LandingPageType;
  lang?: 'ka' | 'en';
  pageSize?: number;
  page?: number;
}

export const landingPageKeys = {
  all: ['landingPages'] as const,
  list: (params?: LandingPagesParams) =>
    [...landingPageKeys.all, 'list', params] as const,
  detail: (slug: string, lang: string) =>
    [...landingPageKeys.all, 'detail', slug, lang] as const,
};

// ---------------------------------------------------------------------------
// Client-side hooks (server routes fetch directly via the helpers below).
// ---------------------------------------------------------------------------

export function useLandingPages(params: LandingPagesParams = {}) {
  return useQuery({
    queryKey: landingPageKeys.list(params),
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params.pageType) sp.set('page_type', params.pageType);
      if (params.lang) sp.set('lang', params.lang);
      if (params.pageSize) sp.set('page_size', String(params.pageSize));
      if (params.page) sp.set('page', String(params.page));
      const response = await landingAxios.get<PaginatedLandingPageList>(
        `${LANDING_API_BASE}/pages/?${sp.toString()}`,
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useLandingPage(slug: string, lang: 'ka' | 'en' = 'ka') {
  return useQuery({
    queryKey: landingPageKeys.detail(slug, lang),
    queryFn: async () => {
      const response = await landingAxios.get<LandingPage>(
        `${LANDING_API_BASE}/pages/${slug}/?lang=${lang}`,
      );
      return response.data;
    },
    enabled: Boolean(slug),
    staleTime: 10 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Server-side fetch helpers. Import these from server components —
// `next: { revalidate: 300 }` gives us 5-minute ISR matching the blog.
// ---------------------------------------------------------------------------

export async function fetchLandingPagesServer(
  params: LandingPagesParams = {},
): Promise<PaginatedLandingPageList> {
  const sp = new URLSearchParams();
  if (params.pageType) sp.set('page_type', params.pageType);
  if (params.lang) sp.set('lang', params.lang);
  if (params.pageSize) sp.set('page_size', String(params.pageSize));
  if (params.page) sp.set('page', String(params.page));
  const url = `${LANDING_API_BASE}/pages/?${sp.toString()}`;
  const res = await fetch(url, {
    next: { revalidate: 300 },
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Landing list API ${res.status}`);
  return (await res.json()) as PaginatedLandingPageList;
}

export async function fetchLandingPageServer(
  slug: string,
  lang: 'ka' | 'en' = 'ka',
): Promise<LandingPage | null> {
  const url = `${LANDING_API_BASE}/pages/${slug}/?lang=${lang}`;
  const res = await fetch(url, {
    next: { revalidate: 300 },
    headers: { Accept: 'application/json' },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Landing detail API ${res.status}`);
  return (await res.json()) as LandingPage;
}
