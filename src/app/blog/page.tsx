import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cookies } from 'next/headers';
import { fetchBlogPostsServer } from '@/hooks/useBlog';
import { BlogCard } from '@/components/blog/BlogCard';
import { BlogSearchBar } from '@/components/blog/BlogSearchBar';

export const revalidate = 300; // 5 min ISR — new posts reach /blog within 5 minutes of approval.

async function resolveLocale(): Promise<'ka' | 'en'> {
  const cookieStore = await cookies();
  const raw = cookieStore.get('NEXT_LOCALE')?.value;
  return raw === 'en' ? 'en' : 'ka';
}

export default async function BlogIndexPage() {
  const lang = await resolveLocale();
  const listing = await fetchBlogPostsServer({ lang, pageSize: 24 }).catch(() => ({
    count: 0,
    next: null,
    previous: null,
    results: [],
  }));

  const featured = listing.results.filter((p) => p.is_featured);
  const rest = listing.results.filter((p) => !p.is_featured);

  const hero = featured[0] ?? rest[0] ?? null;
  const secondaryFeatured = featured.slice(1, 3);
  const remainder = [...rest.filter((p) => p.id !== hero?.id)];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12 md:py-16 space-y-12">
      {/* Intro */}
      <header className="space-y-4 text-center mx-auto max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
          {lang === 'ka' ? 'ბლოგი' : 'Blog'}
        </span>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          {lang === 'ka'
            ? 'ყველაფერი რაც უნდა იცოდე CRM-ზე, WhatsApp-ზე და ქართულ ბიზნესზე'
            : 'Everything about CRM, WhatsApp, and running a Georgian business'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {lang === 'ka'
            ? 'შედარებები, გზამკვლევები, კლიენტის ისტორიები — ერთი ადგილიდან მთელი ბიზნესის მართვის გარშემო.'
            : 'Comparisons, guides, and customer stories — all about running your whole business from one tool.'}
        </p>
        <div className="pt-2">
          <BlogSearchBar />
        </div>
      </header>

      {listing.results.length === 0 ? (
        <EmptyState lang={lang} />
      ) : (
        <>
          {/* Hero — biggest card */}
          {hero && (
            <section>
              <BlogCard post={hero} featured />
            </section>
          )}

          {/* Secondary featured */}
          {secondaryFeatured.length > 0 && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {secondaryFeatured.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </section>
          )}

          {/* Remainder */}
          {remainder.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-6">
                {lang === 'ka' ? 'მეტი პოსტი' : 'More posts'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {remainder.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ lang }: { lang: 'ka' | 'en' }) {
  return (
    <div className="rounded-2xl border-2 border-dashed p-12 text-center space-y-4">
      <h2 className="text-xl font-semibold">
        {lang === 'ka' ? 'პოსტები მალე!' : 'Posts coming soon.'}
      </h2>
      <p className="text-muted-foreground">
        {lang === 'ka'
          ? 'ჩვენ ვამზადებთ შედარებების, გზამკვლევების და კლიენტის ისტორიების სერიას.'
          : 'We are preparing a series of comparisons, how-to guides, and customer stories.'}
      </p>
      <Link
        href="/registration"
        className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
      >
        {lang === 'ka' ? 'დაიწყე EchoDesk-ის გამოცდა' : 'Start an EchoDesk trial'}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
