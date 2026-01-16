'use client';

import { cn } from '@/lib/utils';

interface ArticleContentProps {
  content: string;
  className?: string;
}

export function ArticleContent({ content, className }: ArticleContentProps) {
  if (!content) {
    return null;
  }

  return (
    <div
      className={cn(
        'prose prose-lg dark:prose-invert max-w-none',
        // Headings
        'prose-headings:font-semibold prose-headings:text-foreground',
        // Links
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        // Code
        'prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none',
        // Pre/code blocks
        'prose-pre:bg-muted prose-pre:border',
        // Images
        'prose-img:rounded-lg prose-img:shadow-md',
        // Lists
        'prose-li:marker:text-muted-foreground',
        // Blockquotes
        'prose-blockquote:border-l-primary prose-blockquote:bg-muted/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r',
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
