/**
 * Landing features grid: the eight sellable modules from the mocked
 * catalogue + the Workspace card (3×3), inbox channel chips, prices from
 * the API, and the card → builder hand-off.
 */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";
import { EDITED, LIVE_LIKE } from "./pricing-fixtures";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
const api = vi.hoisted(() => ({ featuresList: vi.fn() }));
vi.mock("@/api/generated/api", () => api);

import { Features } from "@/components/landing/Features";
import { Pricing } from "@/components/landing/Pricing";

const SELLABLE = [
  "ticket_management",
  "social_integrations",
  "ai_companion",
  "ip_calling",
  "booking_management",
  "ecommerce_crm",
  "invoice_management",
  "leave_management",
];

function renderFeatures(features = LIVE_LIKE, locale: "ka" | "en" = "en", withPricing = false) {
  const messages = (locale === "ka" ? ka : en) as Record<string, unknown>;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Features features={features} />
      {withPricing && <Pricing initialFeatures={features} />}
    </NextIntlClientProvider>,
  );
}

describe("features grid", () => {
  it("renders the 8 sellable modules in catalogue order + the Workspace card", () => {
    renderFeatures();
    const grid = screen.getByTestId("feature-grid");
    const cards = within(grid).getAllByTestId(/^feature-/);
    expect(cards.map((c) => c.getAttribute("data-testid"))).toEqual([
      ...SELLABLE.map((k) => `feature-${k}`),
      "feature-workspace",
    ]);
    expect(cards).toHaveLength(9);
  });

  it("takes names, taglines and prices from the catalogue — no channel cards", () => {
    renderFeatures(EDITED);
    expect(screen.getByTestId("feature-ticket_management")).toHaveTextContent("Tickets & boards");
    expect(screen.getByTestId("feature-ticket_management")).toHaveTextContent("9 ₾ per employee / month");
    expect(screen.getByTestId("feature-booking_management")).toHaveTextContent("20 ₾ per employee / month");
    expect(screen.getByTestId("feature-ip_calling")).toHaveTextContent("Magti, Silknet");
    expect(screen.getByTestId("feature-workspace")).toHaveTextContent("Included in every pack");
    expect(screen.getByTestId("feature-workspace")).toHaveTextContent("Mobile app");

    const titles = within(screen.getByTestId("feature-grid"))
      .getAllByRole("link")
      .map((a) => a.textContent ?? "");
    for (const banned of ["WhatsApp Business API", "Messenger API", "Instagram API", "Email helpdesk", "SIP Calling Integration"]) {
      expect(titles.some((t) => t.startsWith(banned))).toBe(false);
    }
  });

  it("the inbox card lists the channels as chips with the Settings note", () => {
    renderFeatures();
    const chips = within(screen.getByTestId("inbox-channels")).getAllByRole("listitem");
    expect(chips.map((c) => c.textContent)).toEqual([
      "Messenger",
      "Instagram",
      "WhatsApp",
      "Telegram",
      "TikTok",
      "Email",
      "Website chat",
    ]);
    expect(screen.getByTestId("inbox-channels")).toHaveTextContent("connected in Settings → Channels");
  });

  it("a module card links to #pricing and switches its module on in the builder", () => {
    renderFeatures(LIVE_LIKE, "en", true);
    const card = screen.getByTestId("feature-invoice_management");
    expect(card).toHaveAttribute("href", "#pricing");
    const sw = within(screen.getByTestId("module-invoice_management")).getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "false");
    fireEvent.click(card);
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("plan-total")).toHaveTextContent("15 ₾"); // (1 + 9 + 5) × 1
    // AI pulls the inbox in through the same `requires` rule.
    fireEvent.click(screen.getByTestId("feature-ai_companion"));
    expect(within(screen.getByTestId("module-social_integrations")).getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("renders the Georgian copy", () => {
    renderFeatures(LIVE_LIKE, "ka");
    expect(screen.getByText("ყველა მოდული, რაც თქვენს ბიზნესს სჭირდება")).toBeInTheDocument();
    expect(screen.getByTestId("feature-social_integrations")).toHaveTextContent("ერთიანი ინბოქსი");
    expect(screen.getByTestId("inbox-channels")).toHaveTextContent("უკავშირდება პარამეტრებიდან → არხები");
    expect(screen.getByTestId("inbox-channels")).toHaveTextContent("ელფოსტა");
    expect(screen.getByTestId("feature-workspace")).toHaveTextContent("სამუშაო სივრცე");
  });
});
