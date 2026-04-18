import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.docs");
  return {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords"),
    openGraph: { title: t("title"), description: t("description") },
    twitter: { title: t("title"), description: t("description") },
    alternates: { canonical: "/docs" },
  };
}

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
