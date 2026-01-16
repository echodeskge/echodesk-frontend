'use client';

import { Loader2 } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Header, Footer } from '@/components/landing';
import { HelpSearch, HelpCategoryCard, HelpArticleCard } from '@/components/help';
import { useHelpCategories, useFeaturedArticles } from '@/hooks/useHelpCenter';

const translations = {
  en: {
    title: 'Help Center',
    subtitle: 'Find answers to your questions',
    searchPlaceholder: 'Search for help...',
    featured: 'Popular Articles',
    categories: 'Browse by Category',
    noCategories: 'No categories available',
  },
  ka: {
    title: 'დახმარების ცენტრი',
    subtitle: 'იპოვეთ პასუხები თქვენს კითხვებზე',
    searchPlaceholder: 'მოძებნეთ დახმარება...',
    featured: 'პოპულარული სტატიები',
    categories: 'კატეგორიები',
    noCategories: 'კატეგორიები არ არის ხელმისაწვდომი',
  },
  ru: {
    title: 'Центр помощи',
    subtitle: 'Найдите ответы на свои вопросы',
    searchPlaceholder: 'Поиск помощи...',
    featured: 'Популярные статьи',
    categories: 'Категории',
    noCategories: 'Категории недоступны',
  },
};

type Language = keyof typeof translations;

export default function DocsPage() {
  const locale = useLocale();
  const language = (translations[locale as Language] ? locale : 'en') as Language;
  const t = translations[language];

  const { data: categories, isLoading: categoriesLoading } = useHelpCategories({
    forPublic: true,
    lang: language,
  });

  const { data: featuredArticles, isLoading: featuredLoading } = useFeaturedArticles({
    lang: language,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/5 to-background py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
                {t.title}
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                {t.subtitle}
              </p>

              {/* Search */}
              <HelpSearch
                lang={language}
                forPublic
                linkPrefix="/docs"
                placeholder={t.searchPlaceholder}
              />
            </div>
          </div>
        </section>

        {/* Featured Articles */}
        {featuredLoading ? (
          <section className="py-12">
            <div className="container mx-auto px-4 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          </section>
        ) : featuredArticles && featuredArticles.length > 0 ? (
          <section className="py-12 bg-muted/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-semibold mb-6">{t.featured}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredArticles.map((article) => (
                  <HelpArticleCard
                    key={article.id}
                    article={article}
                    linkPrefix="/docs"
                    showCategory
                  />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* Categories */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-semibold mb-6">{t.categories}</h2>

            {categoriesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : categories && categories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((category) => (
                  <HelpCategoryCard
                    key={category.id}
                    category={category}
                    linkPrefix="/docs"
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {t.noCategories}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
