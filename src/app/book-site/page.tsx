import { getTranslations } from 'next-intl/server';

/** book.echodesk.ge with no salon in the path. */
export default async function BookSiteHome() {
  const t = await getTranslations('publicBooking');
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold">{t('home.title')}</h1>
      <p className="text-sm text-muted-foreground">{t('home.description')}</p>
    </main>
  );
}
