'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ChevronRight, ArrowLeft } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Header, Footer } from '@/components/landing';
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

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const locale = useLocale();
  const language = (translations[locale as Language] ? locale : 'en') as Language;
  const t = translations[language];

  const { data: category, isLoading } = useHelpCategory(slug, {
    lang: language,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/docs" className="hover:text-foreground transition-colors">
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
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : category ? (
          <>
            {/* Category Header */}
            <section className="py-12 bg-muted/30">
              <div className="container mx-auto px-4">
                <Link href="/docs">
                  <Button variant="ghost" size="sm" className="mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t.backToHelp}
                  </Button>
                </Link>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  {category.name}
                </h1>
                {category.description && (
                  <p className="text-lg text-muted-foreground">
                    {category.description}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {category.article_count} {t.articles}
                </p>
              </div>
            </section>

            {/* Articles */}
            <section className="py-12">
              <div className="container mx-auto px-4">
                {category.articles && category.articles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {category.articles.map((article) => (
                      <HelpArticleCard
                        key={article.id}
                        article={article}
                        linkPrefix="/docs"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    {t.noArticles}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <div className="text-center py-24 text-muted-foreground">
            Category not found
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
