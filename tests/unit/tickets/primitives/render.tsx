import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";

export function renderIntl(ui: ReactElement, locale: "en" | "ka" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "ka" ? ka : en} timeZone="Asia/Tbilisi">
      {ui}
    </NextIntlClientProvider>,
  );
}
