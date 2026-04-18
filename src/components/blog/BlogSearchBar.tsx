'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useLocale } from 'next-intl';
import { Search, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchHit {
  id: number;
  slug: string;
  title: string;
  summary: string;
  post_type: string;
  category: { slug: string; name: string } | null;
}

const API_BASE = `${
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.echodesk.ge'
}/api/blog/public/posts/search`;

const blogAxios = axios.create({
  timeout: 15000,
  headers: { Accept: 'application/json' },
});

const POST_TYPE_LABEL_KA: Record<string, string> = {
  comparison: 'შედარება',
  how_to: 'გაიდი',
  use_case: 'გამოყენება',
  announcement: 'სიახლე',
  thought_leadership: 'იდეა',
};
const POST_TYPE_LABEL_EN: Record<string, string> = {
  comparison: 'Compare',
  how_to: 'How-to',
  use_case: 'Use case',
  announcement: 'Announcement',
  thought_leadership: 'Insight',
};

export function BlogSearchBar() {
  const locale = useLocale() as 'ka' | 'en';
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Debounced fetch
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const { data } = await blogAxios.get<{ results: SearchHit[] }>(API_BASE, {
          params: { q: trimmed, lang: locale },
        });
        setHits(data.results?.slice(0, 5) ?? []);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, locale]);

  // Click outside closes
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, hits.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, -1));
    } else if (e.key === 'Enter' && cursor >= 0 && hits[cursor]) {
      window.location.href = `/blog/${hits[cursor].slug}`;
    }
  };

  const placeholder = locale === 'ka' ? 'ბლოგში ძიება...' : 'Search the blog...';

  return (
    <div ref={containerRef} className="relative w-full max-w-xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setCursor(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full rounded-full border bg-card pl-10 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
        {query && (
          <button
            type="button"
            aria-label={locale === 'ka' ? 'გასუფთავება' : 'Clear'}
            onClick={() => {
              setQuery('');
              setHits([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border bg-card shadow-lg overflow-hidden z-50">
          {loading && (
            <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {locale === 'ka' ? 'ძიება...' : 'Searching...'}
            </div>
          )}
          {!loading && hits.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">
              {locale === 'ka' ? 'შედეგები ვერ მოიძებნა' : 'No results'}
            </div>
          )}
          {!loading && hits.length > 0 && (
            <ul role="listbox">
              {hits.map((hit, idx) => {
                const label = (locale === 'ka' ? POST_TYPE_LABEL_KA : POST_TYPE_LABEL_EN)[hit.post_type] ?? hit.post_type;
                return (
                  <li key={hit.id} role="option" aria-selected={cursor === idx}>
                    <Link
                      href={`/blog/${hit.slug}`}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'block px-4 py-3 hover:bg-accent transition-colors border-b last:border-b-0',
                        cursor === idx && 'bg-accent',
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5">
                          {label}
                        </span>
                        {hit.category?.name && (
                          <span className="text-xs text-muted-foreground">{hit.category.name}</span>
                        )}
                      </div>
                      <div className="text-sm font-medium leading-tight line-clamp-1">{hit.title}</div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
