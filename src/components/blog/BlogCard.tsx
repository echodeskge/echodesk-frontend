import Link from 'next/link';
import { Clock, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlogPostListItem } from '@/hooks/useBlog';

const POST_TYPE_LABELS: Record<string, string> = {
  comparison: 'Comparison',
  how_to: 'How-To',
  use_case: 'Use Case',
  announcement: 'Announcement',
  thought_leadership: 'Perspective',
};

const POST_TYPE_ACCENT: Record<string, string> = {
  comparison: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  how_to: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  use_case: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  announcement: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  thought_leadership: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
};

export function BlogCard({ post, featured = false }: { post: BlogPostListItem; featured?: boolean }) {
  const label = POST_TYPE_LABELS[post.post_type] ?? post.post_type;
  const accent = POST_TYPE_ACCENT[post.post_type] ?? 'bg-muted text-foreground';
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:border-primary/50 hover:shadow-lg',
        featured && 'md:flex-row md:min-h-[320px]',
      )}
    >
      {post.hero_image_url ? (
        <div
          className={cn(
            'bg-muted overflow-hidden',
            featured ? 'md:w-1/2 aspect-video md:aspect-auto' : 'aspect-video',
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.hero_image_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      ) : null}

      <div className={cn('flex-1 p-6 flex flex-col gap-3', featured && 'md:p-8')}>
        <div className="flex items-center gap-2 text-xs">
          <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold uppercase tracking-wide', accent)}>
            {label}
          </span>
          {post.category?.name && (
            <span className="text-muted-foreground">· {post.category.name}</span>
          )}
        </div>

        <h3
          className={cn(
            'font-semibold leading-tight text-foreground transition-colors group-hover:text-primary',
            featured ? 'text-2xl md:text-3xl' : 'text-xl',
          )}
        >
          {post.title}
        </h3>

        {post.summary && (
          <p className="text-sm text-muted-foreground line-clamp-3">{post.summary}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            {date}
            {post.reading_time_minutes > 0 && (
              <>
                <span>·</span>
                <Clock className="h-3 w-3" />
                <span>{post.reading_time_minutes} min</span>
              </>
            )}
          </span>
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
