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
  it("shows the four packs with totals computed from the API prices (ka)", () => {
    renderPricing(EDITED);
    const bookings = within(screen.getByTestId("pack-bookings"));
    expect(bookings.getByText("ჯავშნების პაკეტი")).toBeInTheDocument();
    expect(bookings.getByText("46 ₾")).toBeInTheDocument();
    expect(bookings.getByTestId("pack-total")).toHaveTextContent("= 46 ₾ / თვეში 1 თანამშრომელზე");

    const shop = within(screen.getByTestId("pack-shop"));
    expect(shop.getByText("45 ₾")).toBeInTheDocument();
    expect(shop.getByTestId("pack-total")).toHaveTextContent("= 45 ₾");

    const cc = within(screen.getByTestId("pack-callcentre"));
    expect(cc.getByText("48 ₾")).toBeInTheDocument();
    expect(cc.getByText("ყველაზე პოპულარული")).toBeInTheDocument();

    const builders = within(screen.getByTestId("pack-builders"));
    expect(builders.getByText("დეველოპერის პაკეტი")).toBeInTheDocument();
    expect(builders.getByText("64 ₾")).toBeInTheDocument();
    expect(builders.getByTestId("pack-total")).toHaveTextContent("= 64 ₾");
    // The "Everything" card was replaced by the builders pack.
    expect(screen.queryByTestId("pack-everything")).toBeNull();
  });

  it("the builders pack lists inbox, site-visit bookings, tasks, calls and invoices", () => {
    renderPricing();
    const builders = screen.getByTestId("pack-builders");
    expect(builders).toHaveTextContent("სამშენებლო და დეველოპერული კომპანიები");
    const href = decodeURIComponent(screen.getByTestId("pack-cta-builders").getAttribute("href") ?? "");
    expect(href).toContain("pack=builders");
    expect(href).toContain(
      "modules=social_integrations,booking_management,ticket_management,ip_calling,invoice_management",
    );
    expect(href).not.toContain("ecommerce_crm");
  });

  it("lists the included modules in Georgian", () => {
    renderPricing();
    const bookings = screen.getByTestId("pack-bookings");
    expect(bookings).toHaveTextContent("ონლაინ ჯავშნები · ერთიანი ინბოქსი · ინვოისები");
    expect(bookings).toHaveTextContent("სალონები, კლინიკები");
  });

  it("links to /registration with the pack keys and 1 employee preselected", () => {
    renderPricing();
    const href = screen.getByTestId("pack-cta-bookings").getAttribute("href") ?? "";
    expect(href).toContain("/registration?");
    expect(href).toContain("pack=bookings");
    expect(href).toContain("employees=1");
    expect(decodeURIComponent(href)).toContain("modules=booking_management,social_integrations,invoice_management");

    const cc = decodeURIComponent(screen.getByTestId("pack-cta-callcentre").getAttribute("href") ?? "");
    expect(cc).toContain("pack=callcentre");
    expect(cc).not.toContain("sip_calling");
  });

  it("renders the English copy under the en locale", () => {
    renderPricing(LIVE_LIKE, "en");
    expect(within(screen.getByTestId("pack-bookings")).getByText("Bookings pack")).toBeInTheDocument();
    expect(within(screen.getByTestId("pack-callcentre")).getByText("Call centre & logistics")).toBeInTheDocument();
    expect(within(screen.getByTestId("pack-builders")).getByText("Builders & developers")).toBeInTheDocument();
    expect(within(screen.getByTestId("pack-bookings")).getByTestId("pack-total")).toHaveTextContent(
      "= 44 ₾ / month for 1 employee",
    );
    expect(screen.getByText("30 days free to start, no card needed.", { exact: false })).toBeInTheDocument();
    for (const note of ["Pay for what you use", "Scale with confidence", "Cancel anytime"]) {
      expect(screen.getByText(note)).toBeInTheDocument();
    }
  });

  it("uses the Georgian seat word, never 'operator', no 14-day trial, no minimum or 50+ cap", () => {
    const { container } = renderPricing();
    const text = container.textContent ?? "";
    expect(text).toContain("თანამშრომელ");
    expect(text).not.toContain("ოპერატორების რაოდენობა");
    expect(text).not.toMatch(/14[- ]?დღ/);
    expect(text).not.toMatch(/14-day/);
    expect(text).not.toMatch(/მინიმუმ 5|50\+|50-ზე მეტი|info@echodesk\.ge/);
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
    // Packs are fixed module sets, so an unknown sellable key changes no card.
    expect(within(screen.getByTestId("pack-builders")).getByText("62 ₾")).toBeInTheDocument();
  });
});
