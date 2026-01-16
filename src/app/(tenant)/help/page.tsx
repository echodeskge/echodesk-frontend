'use client';

import { Loader2 } from 'lucide-react';
import { useLocale } from 'next-intl';
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

export default function HelpPage() {
  const locale = useLocale();
  const language = (translations[locale as Language] ? locale : 'en') as Language;
  const t = translations[language];

  const { data: categories, isLoading: categoriesLoading } = useHelpCategories({
    forDashboard: true,
    lang: language,
  });

  const { data: featuredArticles, isLoading: featuredLoading } = useFeaturedArticles({
    lang: language,
    forDashboard: true,
  });

  return (
    <div className="min-h-full bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-12">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">
              {t.title}
            </h1>
            <p className="text-muted-foreground mb-6">
              {t.subtitle}
            </p>

            {/* Search */}
            <HelpSearch
              lang={language}
              forDashboard
              linkPrefix="/help"
              placeholder={t.searchPlaceholder}
            />
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      {featuredLoading ? (
        <section className="py-8">
          <div className="container mx-auto px-4 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </section>
      ) : featuredArticles && featuredArticles.length > 0 ? (
        <section className="py-8 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-xl font-semibold mb-4">{t.featured}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredArticles.map((article) => (
                <HelpArticleCard
                  key={article.id}
                  article={article}
                  linkPrefix="/help"
                  showCategory
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Categories */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <h2 className="text-xl font-semibold mb-4">{t.categories}</h2>

          {categoriesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : categories && categories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <HelpCategoryCard
                  key={category.id}
                  category={category}
                  linkPrefix="/help"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t.noCategories}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
