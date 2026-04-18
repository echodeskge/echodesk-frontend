import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { buildSeoMetadata } from "@/lib/seo-metadata";

export function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ namespace: "seo.docs", path: "/docs" });
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
