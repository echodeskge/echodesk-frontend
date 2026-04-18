import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Calendar, ArrowRight } from 'lucide-react';
import { fetchBlogPostServer, fetchBlogPostsServer } from '@/hooks/useBlog';
import { ArticleSchema } from '@/components/seo/ArticleSchema';
import { ArticleContent } from '@/components/help/ArticleContent';
import { BlogCard } from '@/components/blog/BlogCard';
import { BlogFaq } from '@/components/blog/BlogFaq';

export const revalidate = 300; // 5 min ISR so edits show up quickly.

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  `https://${process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge'}`;

const POST_TYPE_LABELS: Record<string, string> = {
  comparison: 'Comparison',
  how_to: 'How-To',
  use_case: 'Use Case',
  announcement: 'Announcement',
  thought_leadership: 'Perspective',
};

async function resolveLocale(): Promise<'ka' | 'en'> {
  const cookieStore = await cookies();
  const raw = cookieStore.get('NEXT_LOCALE')?.value;
  return raw === 'en' ? 'en' : 'ka';
}

// -------------------------------------------------------------------
// Metadata
// -------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lang = await resolveLocale();
  const post = await fetchBlogPostServer(slug, lang).catch(() => null);
  if (!post) {
    return { title: 'Not found' };
  }

  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    title: post.meta_title || post.title,
    description: post.meta_description || post.summary,
    keywords: (post.keywords || []).join(', '),
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      siteName: 'EchoDesk',
      locale: lang === 'ka' ? 'ka_GE' : 'en_US',
      url,
      title: post.meta_title || post.title,
      description: post.meta_description || post.summary,
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
    },
    twitter: {
      card: 'summary_large_image',
      site: '@echodesk',
      creator: '@echodesk',
      title: post.meta_title || post.title,
      description: post.meta_description || post.summary,
    },
  };
}

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lang = await resolveLocale();
  const post = await fetchBlogPostServer(slug, lang).catch(() => null);
  if (!post) notFound();

  const url = `${SITE_URL}/blog/${post.slug}`;
  const label = POST_TYPE_LABELS[post.post_type] ?? post.post_type;
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  // Related posts: same category or same post_type, excluding this one.
  const relatedList = await fetchBlogPostsServer({
    lang,
    pageSize: 6,
    postType: post.post_type,
  }).catch(() => ({ count: 0, next: null, previous: null, results: [] }));
  const related = relatedList.results.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <ArticleSchema post={post} url={url} locale={lang} />
      <article className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {lang === 'ka' ? 'ყველა პოსტი' : 'All posts'}
        </Link>

        <header className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 font-semibold uppercase tracking-wider">
              {label}
            </span>
            {post.category?.name && (
              <Link
                href="/blog"
                className="text-muted-foreground hover:text-foreground"
              >
                {post.category.name}
              </Link>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            {post.title}
          </h1>

          {post.summary && (
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              {post.summary}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
            {date && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {date}
              </span>
            )}
            {post.reading_time_minutes > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {post.reading_time_minutes} {lang === 'ka' ? 'წთ' : 'min'}
              </span>
            )}
          </div>
        </header>

        {post.hero_image_url && (
          <div className="mt-8 rounded-2xl overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.hero_image_url}
              alt=""
              className="w-full h-auto"
            />
          </div>
        )}

        <div className="mt-10">
          <ArticleContent content={post.content_html} />
        </div>

        {post.faq_items?.length > 0 && (
          <BlogFaq
            items={post.faq_items}
            locale={lang}
            heading={lang === 'ka' ? 'ხშირად დასმული კითხვები' : 'Frequently asked questions'}
          />
        )}

        {/* CTA */}
        <div className="mt-12 rounded-2xl bg-primary/5 border border-primary/20 p-6 md:p-8">
          <h2 className="text-xl font-semibold mb-2">
            {lang === 'ka'
              ? 'სცადე EchoDesk უფასოდ 14 დღე'
              : 'Try EchoDesk free for 14 days'}
          </h2>
          <p className="text-muted-foreground mb-4">
            {lang === 'ka'
              ? 'ბარათი არ სჭირდება — ნახე თუ EchoDesk მუშაობს შენს გუნდში.'
              : 'No credit card required. See if EchoDesk fits your team.'}
          </p>
          <Link
            href="/registration"
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-5 py-2.5 font-medium hover:bg-primary/90 transition-colors"
          >
            {lang === 'ka' ? 'დაიწყე უფასო ცდა' : 'Start free trial'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </article>

      {related.length > 0 && (
        <section className="container mx-auto max-w-6xl px-4 pb-16">
          <h2 className="text-xl font-semibold mb-6">
            {lang === 'ka' ? 'სხვა პოსტები' : 'Related posts'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {related.map((p) => (
              <BlogCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
