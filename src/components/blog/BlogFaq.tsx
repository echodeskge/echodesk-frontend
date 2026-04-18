'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlogFaqItem } from '@/hooks/useBlog';

interface Props {
  items: BlogFaqItem[];
  locale: 'ka' | 'en';
  heading?: string;
}

/**
 * Accordion for the FAQ section rendered at the bottom of a blog post.
 * The underlying Q/A pairs also seed the FAQPage JSON-LD in
 * ArticleSchema, so this component + the schema stay in lockstep.
 */
export function BlogFaq({ items, locale, heading }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const pickQ = (item: BlogFaqItem) => (locale === 'ka' ? item.question_ka : item.question_en);
  const pickA = (item: BlogFaqItem) => (locale === 'ka' ? item.answer_ka : item.answer_en);

  const filtered = items.filter((item) => pickQ(item) && pickA(item));

  if (filtered.length === 0) return null;

  return (
    <section className="mt-12 pt-10 border-t">
      <h2 className="text-2xl font-bold mb-6">{heading || 'FAQ'}</h2>
      <div className="space-y-3">
        {filtered.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={idx} className="rounded-xl border bg-card">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="flex w-full items-center justify-between gap-4 p-4 text-left"
                aria-expanded={isOpen}
              >
                <span className="font-semibold">{pickQ(item)}</span>
                {isOpen ? (
                  <Minus className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <Plus className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
              </button>
              <div
                className={cn(
                  'grid overflow-hidden transition-all duration-200',
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
              >
                <div className="min-h-0">
                  <div className="px-4 pb-4 text-muted-foreground whitespace-pre-wrap">
                    {pickA(item)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
