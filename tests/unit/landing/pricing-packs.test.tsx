/**
 * Landing pricing section — pack presets above the builder, computed from a
 * mocked API catalogue (ka and en), hidden stubs, notes row.
 */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";
import { EDITED, LIVE_LIKE, mockFeature } from "./pricing-fixtures";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
const api = vi.hoisted(() => ({ featuresList: vi.fn() }));
vi.mock("@/api/generated/api", () => api);

import { Pricing } from "@/components/landing/Pricing";

function renderPricing(features = LIVE_LIKE, locale: "ka" | "en" = "ka") {
  const messages = (locale === "ka" ? ka : en) as Record<string, unknown>;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Pricing initialFeatures={features} />
    </NextIntlClientProvider>,
  );
}

describe("pack presets", () => {
  it("shows the three packs + Everything with totals computed from the API prices (ka)", () => {
    renderPricing(EDITED);
    const bookings = within(screen.getByTestId("pack-bookings"));
    expect(bookings.getByText("ჯავშნების პაკეტი")).toBeInTheDocument();
    expect(bookings.getByText("46 ₾")).toBeInTheDocument();
    expect(bookings.getByTestId("pack-total")).toHaveTextContent("= 230 ₾ / თვეში 5 თანამშრომელზე");

    const shop = within(screen.getByTestId("pack-shop"));
    expect(shop.getByText("45 ₾")).toBeInTheDocument();
    expect(shop.getByTestId("pack-total")).toHaveTextContent("225 ₾");

    const cc = within(screen.getByTestId("pack-callcentre"));
    expect(cc.getByText("48 ₾")).toBeInTheDocument();
    expect(cc.getByText("ყველაზე პოპულარული")).toBeInTheDocument();

    const all = within(screen.getByTestId("pack-everything"));
    expect(all.getByText("102 ₾")).toBeInTheDocument();
    expect(all.getByTestId("pack-total")).toHaveTextContent("510 ₾");
  });

  it("lists the included modules in Georgian", () => {
    renderPricing();
    const bookings = screen.getByTestId("pack-bookings");
    expect(bookings).toHaveTextContent("ონლაინ ჯავშნები · ერთიანი ინბოქსი · ინვოისები");
    expect(bookings).toHaveTextContent("სალონები, კლინიკები");
  });

  it("links to /registration with the pack keys and 5 employees preselected", () => {
    renderPricing();
    const href = screen.getByTestId("pack-cta-bookings").getAttribute("href") ?? "";
    expect(href).toContain("/registration?");
    expect(href).toContain("pack=bookings");
    expect(href).toContain("employees=5");
    expect(decodeURIComponent(href)).toContain("modules=booking_management,social_integrations,invoice_management");

    const all = decodeURIComponent(screen.getByTestId("pack-cta-everything").getAttribute("href") ?? "");
    expect(all).toContain("pack=everything");
    expect(all).toContain("ai_companion");
    expect(all).not.toContain("sip_calling");
  });

  it("renders the English copy under the en locale", () => {
    renderPricing(LIVE_LIKE, "en");
    expect(within(screen.getByTestId("pack-bookings")).getByText("Bookings pack")).toBeInTheDocument();
    expect(within(screen.getByTestId("pack-callcentre")).getByText("Call centre & logistics")).toBeInTheDocument();
    expect(within(screen.getByTestId("pack-bookings")).getByTestId("pack-total")).toHaveTextContent(
      "= 220 ₾ / month for 5 employees",
    );
    expect(screen.getByText("30 days free to start, no card needed.", { exact: false })).toBeInTheDocument();
    for (const note of ["Pay for what you use", "Scale with confidence", "Cancel anytime"]) {
      expect(screen.getByText(note)).toBeInTheDocument();
    }
  });

  it("uses the Georgian seat word, never 'operator', and no 14-day trial", () => {
    const { container } = renderPricing();
    const text = container.textContent ?? "";
    expect(text).toContain("თანამშრომელ");
    expect(text).not.toContain("ოპერატორების რაოდენობა");
    expect(text).not.toMatch(/14[- ]?დღ/);
    expect(text).not.toMatch(/14-day/);
  });
});

describe("module list + hidden stubs", () => {
  it("hides the zero-price stubs and shows one switch per sellable module plus the workspace", () => {
    const { container } = renderPricing();
    const text = container.textContent ?? "";
    for (const stub of ["SIP Calling", "Order Management", "Advanced Analytics"]) {
      expect(text).not.toContain(stub);
    }
    for (const key of ["sip_calling", "order_management", "advanced_analytics", "settings", "user_management"]) {
      expect(screen.queryByTestId(`module-${key}`)).toBeNull();
    }
    const builder = screen.getByTestId("plan-builder");
    expect(within(builder).getAllByRole("switch")).toHaveLength(9);
    expect(within(builder).getByTestId("module-workspace")).toBeInTheDocument();
  });

  it("falls back to the API name for a sellable key without a translation", () => {
    const withUnknown = [...LIVE_LIKE, mockFeature(99, "crystal_ball", "Crystal Ball", "3.00")];
    renderPricing(withUnknown);
    expect(screen.getByTestId("module-crystal_ball")).toHaveTextContent("Crystal Ball");
    expect(within(screen.getByTestId("pack-everything")).getByText("103 ₾")).toBeInTheDocument();
  });
});
