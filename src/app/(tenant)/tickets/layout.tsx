import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { pickRouteMessages } from "@/lib/pick-messages";

import { TicketsWrapper } from "./_components/tickets-wrapper";

/** Route namespaces; the global ones (`tickets`, `common`, …) are added by pickRouteMessages. */
const NAMESPACES = ["ticketsScreen", "timeTracking"];

export default async function TicketsLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={pickRouteMessages(messages as Record<string, unknown>, NAMESPACES)}>
      <TicketsWrapper>{children}</TicketsWrapper>
    </NextIntlClientProvider>
  );
}
