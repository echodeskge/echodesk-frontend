import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { pickRouteMessages } from "@/lib/pick-messages";

import { EmailWrapper } from "./_components/email-wrapper";

const NAMESPACES = ["email"];

export default async function EmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider
      messages={pickRouteMessages(
        messages as Record<string, unknown>,
        NAMESPACES
      )}
    >
      <EmailWrapper>{children}</EmailWrapper>
    </NextIntlClientProvider>
  );
}
