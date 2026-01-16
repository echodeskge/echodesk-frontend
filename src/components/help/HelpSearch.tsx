'use client';

import { useState, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useHelpSearch } from '@/hooks/useHelpCenter';
import { HelpArticleCard } from './HelpArticleCard';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

interface HelpSearchProps {
  lang?: string;
  forPublic?: boolean;
  forDashboard?: boolean;
  linkPrefix?: string;
  placeholder?: string;
  className?: string;
}

export function HelpSearch({
  lang = 'en',
  forPublic = true,
  forDashboard = false,
  linkPrefix = '/docs',
  placeholder = 'Search for help...',
  className,
}: HelpSearchProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  const { data: results, isLoading } = useHelpSearch(debouncedQuery, {
    lang,
    forPublic,
    forDashboard,
  });

  const handleClear = useCallback(() => {
    setQuery('');
  }, []);

  const showResults = isFocused && query.length >= 2;

  return (
    <div className={cn('relative w-full max-w-2xl mx-auto', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          className="pl-10 pr-10 h-12 text-base"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={handleClear}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : results && results.length > 0 ? (
            <div className="p-2 space-y-2">
              {results.map((article) => (
                <HelpArticleCard
                  key={article.id}
                  article={article}
                  linkPrefix={linkPrefix}
                  showCategory
                  className="border-0 shadow-none hover:bg-muted"
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
