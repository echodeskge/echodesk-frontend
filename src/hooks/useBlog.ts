import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

/**
 * Public blog API — no auth needed. Uses a plain axios instance so the
 * tenant-auth interceptors in `src/api/axios.ts` don't add an Authorization
 * header (which would cause CORS issues for anonymous visitors).
 *
 * Server components can fetch the same endpoints directly with
 * `fetch()` — this hook is for client-side interactions (live search,
 * "load more" pagination, etc.).
 */

const blogAxios = axios.create({
  timeout: 30000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

export const BLOG_API_BASE = `${
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.echodesk.ge'
}/api/blog/public`;

// ---------------------------------------------------------------------------
// Types — mirror PublicBlogPostListSerializer / PublicBlogPostDetailSerializer
// in echodesk-back/blog/serializers.py. Locale-resolved server-side, so all
// string fields are plain strings here (not JSON maps).
// ---------------------------------------------------------------------------

export type BlogPostType =
  | 'comparison'
  | 'how_to'
  | 'use_case'
  | 'announcement'
  | 'thought_leadership';

export interface BlogCategory {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  position: number;
  is_featured: boolean;
  post_count: number;
}

export interface BlogPostListItem {
  id: number;
  slug: string;
  post_type: BlogPostType;
  title: string;
  summary: string;
  category: BlogCategory | null;
  hero_image_url: string;
  published_at: string;
  reading_time_minutes: number;
  is_featured: boolean;
  competitor_name: string;
}

export interface BlogFaqItem {
  question_en: string;
  question_ka: string;
  answer_en: string;
  answer_ka: string;
}

export interface BlogPost extends BlogPostListItem {
  content_html: string;
  meta_title: string;
  meta_description: string;
  keywords: string[];
  faq_items: BlogFaqItem[];
  comparison_matrix: Array<{ feature: string; us: string; them: string; winner: string }>;
  created_at: string;
  updated_at: string;
}

export interface PaginatedBlogPostList {
  count: number;
  next: string | null;
  previous: string | null;
  results: BlogPostListItem[];
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export interface BlogPostsParams {
  page?: number;
  pageSize?: number;
  category?: string;
  postType?: BlogPostType;
  featured?: boolean;
  competitor?: string;
  lang?: 'en' | 'ka';
}

export const blogKeys = {
  all: ['blog'] as const,
  posts: (params?: BlogPostsParams) => [...blogKeys.all, 'posts', params] as const,
  post: (slug: string, lang: string) => [...blogKeys.all, 'post', slug, lang] as const,
  categories: () => [...blogKeys.all, 'categories'] as const,
  search: (q: string, lang: string) => [...blogKeys.all, 'search', q, lang] as const,
};

// ---------------------------------------------------------------------------
// Client-side hooks (server pages fetch directly, see
// src/app/blog/page.tsx + [slug]/page.tsx).
// ---------------------------------------------------------------------------

export function useBlogPosts(params: BlogPostsParams = {}) {
  return useQuery({
    queryKey: blogKeys.posts(params),
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params.page) sp.set('page', String(params.page));
      if (params.pageSize) sp.set('page_size', String(params.pageSize));
      if (params.category) sp.set('category', params.category);
      if (params.postType) sp.set('post_type', params.postType);
      if (params.featured) sp.set('featured', 'true');
      if (params.competitor) sp.set('competitor', params.competitor);
      if (params.lang) sp.set('lang', params.lang);
      const response = await blogAxios.get<PaginatedBlogPostList>(
        `${BLOG_API_BASE}/posts/?${sp.toString()}`,
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useBlogPost(slug: string, lang: 'en' | 'ka' = 'ka') {
  return useQuery({
    queryKey: blogKeys.post(slug, lang),
    queryFn: async () => {
      const response = await blogAxios.get<BlogPost>(
        `${BLOG_API_BASE}/posts/${slug}/?lang=${lang}`,
      );
      return response.data;
    },
    enabled: Boolean(slug),
    staleTime: 10 * 60 * 1000,
  });
}

export function useBlogCategories() {
  return useQuery({
    queryKey: blogKeys.categories(),
    queryFn: async () => {
      const response = await blogAxios.get<BlogCategory[] | { results: BlogCategory[] }>(
        `${BLOG_API_BASE}/categories/`,
      );
      // Endpoint is paginated; tolerate both shapes.
      const data = response.data as { results?: BlogCategory[] };
      return (data.results ?? (response.data as BlogCategory[])) || [];
    },
    staleTime: 15 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Server-side fetch helpers. Import these from server components.
// ---------------------------------------------------------------------------

export async function fetchBlogPostsServer(params: BlogPostsParams = {}): Promise<PaginatedBlogPostList> {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('page_size', String(params.pageSize));
  if (params.category) sp.set('category', params.category);
  if (params.postType) sp.set('post_type', params.postType);
  if (params.featured) sp.set('featured', 'true');
  if (params.competitor) sp.set('competitor', params.competitor);
  if (params.lang) sp.set('lang', params.lang);
  const res = await fetch(`${BLOG_API_BASE}/posts/?${sp.toString()}`, {
    next: { revalidate: 300 },
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Blog list API ${res.status}`);
  return (await res.json()) as PaginatedBlogPostList;
}

export async function fetchBlogPostServer(slug: string, lang: 'en' | 'ka' = 'ka'): Promise<BlogPost | null> {
  const res = await fetch(`${BLOG_API_BASE}/posts/${slug}/?lang=${lang}`, {
    next: { revalidate: 300 },
    headers: { Accept: 'application/json' },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Blog detail API ${res.status}`);
  return (await res.json()) as BlogPost;
}
