'use client';

import Link from 'next/link';
import { Video, FileText, ListOrdered, HelpCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { HelpArticle } from '@/hooks/useHelpCenter';

interface HelpArticleCardProps {
  article: HelpArticle;
  linkPrefix?: string;
  showCategory?: boolean;
  className?: string;
}

const contentTypeConfig = {
  video: {
    icon: Video,
    label: 'Video',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  article: {
    icon: FileText,
    label: 'Article',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  guide: {
    icon: ListOrdered,
    label: 'Guide',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  faq: {
    icon: HelpCircle,
    label: 'FAQ',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
};

export function HelpArticleCard({
  article,
  linkPrefix = '/docs',
  showCategory = false,
  className,
}: HelpArticleCardProps) {
  const config = contentTypeConfig[article.content_type];
  const Icon = config.icon;

  const href = article.category_slug
    ? `${linkPrefix}/${article.category_slug}/${article.slug}`
    : `${linkPrefix}/${article.slug}`;

  return (
    <Link href={href}>
      <Card className={cn(
        'h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer group',
        className
      )}>
        {/* Video Thumbnail */}
        {article.content_type === 'video' && article.video_thumbnail && (
          <div className="relative aspect-video overflow-hidden rounded-t-lg">
            <img
              src={article.video_thumbnail}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
            {article.video_duration && (
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-white text-xs font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {article.video_duration}
              </div>
            )}
          </div>
        )}

        <CardHeader className={article.content_type === 'video' && article.video_thumbnail ? 'pt-4' : ''}>
          <div className="flex items-start gap-3">
            <div className={cn('p-2 rounded-lg', config.color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="secondary" className={cn('text-xs', config.color)}>
                  {config.label}
                </Badge>
                {article.is_featured && (
                  <Badge variant="default" className="text-xs">
                    Featured
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base mb-1 group-hover:text-primary transition-colors line-clamp-2">
                {article.title}
              </CardTitle>
              {article.summary && (
                <CardDescription className="line-clamp-2 text-sm">
                  {article.summary}
                </CardDescription>
              )}
              {showCategory && article.category_name && (
                <p className="text-xs text-muted-foreground mt-2">
                  in {article.category_name}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
