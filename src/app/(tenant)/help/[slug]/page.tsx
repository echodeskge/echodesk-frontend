'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ChevronRight, ArrowLeft } from 'lucide-react';
import { useLocale } from 'next-intl';
import { HelpArticleCard } from '@/components/help';
import { useHelpCategory } from '@/hooks/useHelpCenter';
import { Button } from '@/components/ui/button';

const translations = {
  en: {
    backToHelp: 'Back to Help Center',
    articles: 'articles',
    noArticles: 'No articles in this category yet',
  },
  ka: {
    backToHelp: 'დახმარების ცენტრში დაბრუნება',
    articles: 'სტატია',
    noArticles: 'ამ კატეგორიაში სტატიები ჯერ არ არის',
  },
  ru: {
    backToHelp: 'Вернуться в центр помощи',
    articles: 'статей',
    noArticles: 'В этой категории пока нет статей',
  },
};

type Language = keyof typeof translations;

export default function HelpCategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const locale = useLocale();
  const language = (translations[locale as Language] ? locale : 'en') as Language;
  const t = translations[language];

  const { data: category, isLoading } = useHelpCategory(slug, {
    lang: language,
    forDashboard: true,
  });

  return (
    <div className="min-h-full bg-background">
      {/* Breadcrumb */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/help" className="hover:text-foreground transition-colors">
              {t.backToHelp}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground font-medium">
              {category?.name || slug}
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : category ? (
        <>
          {/* Category Header */}
          <section className="py-8 bg-muted/30">
            <div className="container mx-auto px-4">
              <Link href="/help">
                <Button variant="ghost" size="sm" className="mb-3">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t.backToHelp}
                </Button>
              </Link>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                {category.name}
              </h1>
              {category.description && (
                <p className="text-muted-foreground">
                  {category.description}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {category.article_count} {t.articles}
              </p>
            </div>
          </section>

          {/* Articles */}
          <section className="py-8">
            <div className="container mx-auto px-4">
              {category.articles && category.articles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.articles.map((article) => (
                    <HelpArticleCard
                      key={article.id}
                      article={article}
                      linkPrefix="/help"
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t.noArticles}
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          Category not found
        </div>
      )}
    </div>
  );
}
