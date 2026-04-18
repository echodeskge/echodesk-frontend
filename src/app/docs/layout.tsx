import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { ogImage } from "@/lib/og";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.docs");
  const og = ogImage({ title: t("ogTitle"), subtitle: t("ogSubtitle"), tag: t("ogTag") });
  return {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords"),
    openGraph: { title: t("title"), description: t("description"), images: [og] },
    twitter: { title: t("title"), description: t("description"), images: [og] },
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
