'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ChevronRight, ArrowLeft, Calendar } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Header, Footer } from '@/components/landing';
import {
  VideoTutorial,
  StepByStepGuide,
  FAQAccordion,
  ArticleContent,
} from '@/components/help';
import { useHelpArticle } from '@/hooks/useHelpCenter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const translations = {
  en: {
    backToHelp: 'Help Center',
    backToCategory: 'Back to',
    lastUpdated: 'Last updated',
    contentTypes: {
      video: 'Video Tutorial',
      article: 'Article',
      guide: 'Step-by-Step Guide',
      faq: 'FAQ',
    },
  },
  ka: {
    backToHelp: 'დახმარების ცენტრი',
    backToCategory: 'უკან',
    lastUpdated: 'ბოლო განახლება',
    contentTypes: {
      video: 'ვიდეო გაკვეთილი',
      article: 'სტატია',
      guide: 'ნაბიჯ-ნაბიჯ სახელმძღვანელო',
      faq: 'FAQ',
    },
  },
  ru: {
    backToHelp: 'Центр помощи',
    backToCategory: 'Назад к',
    lastUpdated: 'Последнее обновление',
    contentTypes: {
      video: 'Видео урок',
      article: 'Статья',
      guide: 'Пошаговое руководство',
      faq: 'FAQ',
    },
  },
};

type Language = keyof typeof translations;

const contentTypeColors = {
  video: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  article: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  guide: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  faq: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export default function ArticlePage() {
  const params = useParams();
  const slug = params.slug as string;
  const articleSlug = params.articleSlug as string;
  const locale = useLocale();
  const language = (translations[locale as Language] ? locale : 'en') as Language;
  const t = translations[language];

  const { data: article, isLoading } = useHelpArticle(articleSlug, {
    lang: language,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      language === 'ka' ? 'ka-GE' : language === 'ru' ? 'ru-RU' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <Link href="/docs" className="hover:text-foreground transition-colors">
                {t.backToHelp}
              </Link>
              <ChevronRight className="w-4 h-4" />
              <Link
                href={`/docs/${slug}`}
                className="hover:text-foreground transition-colors"
              >
                {article?.category?.name || slug}
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground font-medium truncate max-w-[200px]">
                {article?.title || articleSlug}
              </span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : article ? (
          <article className="py-12">
            <div className="container mx-auto px-4 max-w-4xl">
              {/* Back Button */}
              <Link href={`/docs/${slug}`}>
                <Button variant="ghost" size="sm" className="mb-6">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t.backToCategory} {article.category?.name}
                </Button>
              </Link>

              {/* Article Header */}
              <header className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Badge className={cn(contentTypeColors[article.content_type])}>
                    {t.contentTypes[article.content_type]}
                  </Badge>
                  {article.is_featured && (
                    <Badge variant="default">Featured</Badge>
                  )}
                </div>

                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  {article.title}
                </h1>

                {article.summary && (
                  <p className="text-lg text-muted-foreground mb-4">
                    {article.summary}
                  </p>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {t.lastUpdated}: {formatDate(article.updated_at)}
                  </span>
                </div>
              </header>

              {/* Content based on type */}
              <div className="mt-8">
                {article.content_type === 'video' && article.video_url && (
                  <div className="mb-8">
                    <VideoTutorial
                      url={article.video_url}
                      title={article.title}
                      thumbnail={article.video_thumbnail}
                      duration={article.video_duration}
                    />
                  </div>
                )}

                {article.content_type === 'article' && article.content && (
                  <ArticleContent content={article.content} />
                )}

                {article.content_type === 'guide' && article.guide_steps && (
                  <StepByStepGuide steps={article.guide_steps} />
                )}

                {article.content_type === 'faq' && article.faq_items && (
                  <FAQAccordion items={article.faq_items} />
                )}

                {/* Additional content for videos (description below video) */}
                {article.content_type === 'video' && article.content && (
                  <div className="mt-8">
                    <ArticleContent content={article.content} />
                  </div>
                )}
              </div>
            </div>
          </article>
        ) : (
          <div className="text-center py-24 text-muted-foreground">
            Article not found
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
