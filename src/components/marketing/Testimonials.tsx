import { getTranslations } from 'next-intl/server';
import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Testimonial } from '@/api/generated/interfaces';

/**
 * Social-proof strip rendered between the Pricing and FAQ sections on
 * the marketing homepage. Server component — testimonials are fetched
 * by the parent page and passed in so hydration stays static (no
 * spinner flashes during CSR).
 *
 * Graceful fallback: if `testimonials` is empty, renders nothing so
 * launch-day / API-down scenarios don't show a sad "no reviews yet"
 * card.
 */
export async function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  if (!testimonials || testimonials.length === 0) return null;

  const t = await getTranslations('testimonials');

  return (
    <section id="testimonials" className="container py-16 space-y-8">
      <div className="text-center mx-auto space-y-2 max-w-3xl">
        <h2 className="text-4xl font-bold">{t('heading')}</h2>
        <p className="text-lg text-muted-foreground">{t('subheading')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        {testimonials.map((item) => (
          <TestimonialCard key={item.slug} item={item} />
        ))}
      </div>
    </section>
  );
}

function TestimonialCard({ item }: { item: Testimonial }) {
  const rating = Math.max(0, Math.min(5, item.rating ?? 5));
  return (
    <Card className="h-full flex flex-col transition-shadow hover:shadow-lg hover:-translate-y-0.5 transition-transform duration-200">
      <CardContent className="p-6 flex flex-col gap-4 h-full">
        <div className="flex items-center gap-3">
          <AuthorAvatar authorName={item.author_name} avatarUrl={item.avatar_url} />
          <div className="min-w-0">
            <p className="font-semibold truncate">{item.author_name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {item.role}
              {item.company_name ? ` · ${item.company_name}` : ''}
            </p>
          </div>
        </div>

        <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
          {Array.from({ length: 5 }).map((_, idx) => (
            <Star
              key={idx}
              className={
                idx < rating
                  ? 'h-4 w-4 fill-amber-400 text-amber-400'
                  : 'h-4 w-4 text-muted-foreground/30'
              }
              aria-hidden="true"
            />
          ))}
        </div>

        <blockquote className="text-sm leading-relaxed text-foreground/90 prose prose-sm">
          &ldquo;{item.quote}&rdquo;
        </blockquote>
      </CardContent>
    </Card>
  );
}

function AuthorAvatar({
  authorName,
  avatarUrl,
}: {
  authorName: string;
  avatarUrl?: string;
}) {
  const initials = getInitials(authorName);
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={authorName}
        className="h-11 w-11 rounded-full object-cover bg-muted flex-shrink-0"
        loading="lazy"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="h-11 w-11 rounded-full bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center flex-shrink-0"
    >
      {initials}
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
