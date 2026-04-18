'use client';

import { useRef } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { cn } from '@/lib/utils';
import { useEnhanceCodeBlocks } from './useEnhanceCodeBlocks';

interface ArticleContentProps {
  content: string;
  className?: string;
}

export function ArticleContent({ content, className }: ArticleContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEnhanceCodeBlocks(ref, [content]);

  if (!content) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(
        'prose prose-lg dark:prose-invert max-w-none',
        // Heading rhythm.
        'prose-headings:font-semibold prose-headings:text-foreground',
        'prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4',
        'prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3',
        // Body copy — keep at full foreground so dark mode is readable.
        'prose-p:text-foreground/90 prose-li:text-foreground/90',
        'prose-strong:text-foreground',
        // Links.
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        // Inline code chips.
        'prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-code:text-sm',
        // Pre/code blocks — dark panel with visible border, not the page bg.
        'prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800',
        'prose-pre:text-zinc-100 prose-pre:rounded-md',
        // Images.
        'prose-img:rounded-lg prose-img:shadow-md',
        // Lists.
        'prose-li:marker:text-muted-foreground prose-li:my-1',
        // Blockquotes.
        'prose-blockquote:border-l-primary prose-blockquote:bg-muted/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r',
        // Give <details>/<summary> room — articles lean on them.
        '[&_details]:my-3 [&_summary]:cursor-pointer [&_summary]:select-none',
        className
      )}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
    />
  );
}
