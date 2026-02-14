import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// Use plain axios without tenant auth interceptors for public help center API
const helpCenterAxios = axios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Types
export interface HelpCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  position: number;
  is_active: boolean;
  show_on_public: boolean;
  show_in_dashboard: boolean;
  required_feature_key: string;
  article_count: number;
  articles?: HelpArticle[];
  created_at: string;
  updated_at: string;
}

export interface HelpArticle {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content_type: 'video' | 'article' | 'guide' | 'faq';
  content?: string;
  video_url?: string;
  video_thumbnail?: string;
  video_duration?: string;
  guide_steps?: GuideStep[];
  faq_items?: FAQItem[];
  position: number;
  is_active: boolean;
  is_featured: boolean;
  show_on_public: boolean;
  show_in_dashboard: boolean;
  category_name: string;
  category_slug: string;
  category?: HelpCategory;
  created_at: string;
  updated_at: string;
}

export interface GuideStep {
  step: number;
  title: string;
  content: string;
  image?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

// Query keys
export const helpCenterKeys = {
  all: ['helpCenter'] as const,
  categories: (params?: { forPublic?: boolean; forDashboard?: boolean; lang?: string }) =>
    [...helpCenterKeys.all, 'categories', params] as const,
  category: (slug: string, params?: { lang?: string; forDashboard?: boolean }) =>
    [...helpCenterKeys.all, 'category', slug, params] as const,
  articles: (params?: { category?: string; contentType?: string; featured?: boolean; forPublic?: boolean; forDashboard?: boolean; lang?: string }) =>
    [...helpCenterKeys.all, 'articles', params] as const,
  article: (slug: string, params?: { lang?: string; forDashboard?: boolean }) =>
    [...helpCenterKeys.all, 'article', slug, params] as const,
  featured: (params?: { lang?: string; forDashboard?: boolean }) =>
    [...helpCenterKeys.all, 'featured', params] as const,
  search: (query: string, params?: { lang?: string }) =>
    [...helpCenterKeys.all, 'search', query, params] as const,
};

// Base URL - use main API (help center is shared across all tenants)
const HELP_API_BASE = 'https://api.echodesk.ge/api/help/public';

// Hooks
export function useHelpCategories(params?: {
  forPublic?: boolean;
  forDashboard?: boolean;
  lang?: string;
}) {
  return useQuery({
    queryKey: helpCenterKeys.categories(params),
    queryFn: async (): Promise<HelpCategory[]> => {
      const searchParams = new URLSearchParams();
      if (params?.forPublic) searchParams.append('for_public', 'true');
      if (params?.forDashboard) searchParams.append('for_dashboard', 'true');
      if (params?.lang) searchParams.append('lang', params.lang);

      const url = `${HELP_API_BASE}/categories/${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      const response = await helpCenterAxios.get(url);
      return response.data;
    },
  });
}

export function useHelpCategory(slug: string | null, params?: { lang?: string; forDashboard?: boolean }) {
  return useQuery({
    queryKey: helpCenterKeys.category(slug!, params),
    queryFn: async (): Promise<HelpCategory> => {
      const searchParams = new URLSearchParams();
      if (params?.lang) searchParams.append('lang', params.lang);
      if (params?.forDashboard) searchParams.append('for_dashboard', 'true');

      const url = `${HELP_API_BASE}/categories/${slug}/${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      const response = await helpCenterAxios.get(url);
      return response.data;
    },
    enabled: !!slug,
  });
}

export function useHelpArticles(params?: {
  category?: string;
  contentType?: string;
  featured?: boolean;
  forPublic?: boolean;
  forDashboard?: boolean;
  lang?: string;
}) {
  return useQuery({
    queryKey: helpCenterKeys.articles(params),
    queryFn: async (): Promise<HelpArticle[]> => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.append('category', params.category);
      if (params?.contentType) searchParams.append('content_type', params.contentType);
      if (params?.featured) searchParams.append('featured', 'true');
      if (params?.forPublic) searchParams.append('for_public', 'true');
      if (params?.forDashboard) searchParams.append('for_dashboard', 'true');
      if (params?.lang) searchParams.append('lang', params.lang);

      const url = `${HELP_API_BASE}/articles/${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      const response = await helpCenterAxios.get(url);
      return response.data;
    },
  });
}

export function useHelpArticle(slug: string | null, params?: { lang?: string; forDashboard?: boolean }) {
  return useQuery({
    queryKey: helpCenterKeys.article(slug!, params),
    queryFn: async (): Promise<HelpArticle> => {
      const searchParams = new URLSearchParams();
      if (params?.lang) searchParams.append('lang', params.lang);
      if (params?.forDashboard) searchParams.append('for_dashboard', 'true');

      const url = `${HELP_API_BASE}/articles/${slug}/${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      const response = await helpCenterAxios.get(url);
      return response.data;
    },
    enabled: !!slug,
  });
}

export function useFeaturedArticles(params?: { lang?: string; forDashboard?: boolean }) {
  return useQuery({
    queryKey: helpCenterKeys.featured(params),
    queryFn: async (): Promise<HelpArticle[]> => {
      const searchParams = new URLSearchParams();
      if (params?.lang) searchParams.append('lang', params.lang);
      if (params?.forDashboard) searchParams.append('for_dashboard', 'true');

      const url = `${HELP_API_BASE}/articles/featured/${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      const response = await helpCenterAxios.get(url);
      return response.data;
    },
  });
}

export function useHelpSearch(query: string, params?: { lang?: string; forPublic?: boolean; forDashboard?: boolean }) {
  return useQuery({
    queryKey: helpCenterKeys.search(query, params),
    queryFn: async (): Promise<HelpArticle[]> => {
      const searchParams = new URLSearchParams();
      searchParams.append('q', query);
      if (params?.lang) searchParams.append('lang', params.lang);
      if (params?.forPublic) searchParams.append('for_public', 'true');
      if (params?.forDashboard) searchParams.append('for_dashboard', 'true');

      const url = `${HELP_API_BASE}/search/?${searchParams.toString()}`;
      const response = await helpCenterAxios.get(url);
      return response.data;
    },
    enabled: query.length >= 2,
  });
}
