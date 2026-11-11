/**
 * Landing calculator ("build your own"): switches, employee stepper, live
 * total, AI → inbox rule, "50+ contact us", pack → calculator hand-off.
 */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";
import { LIVE_LIKE } from "./pricing-fixtures";

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

function renderPricing(locale: "ka" | "en" = "en") {
  const messages = (locale === "ka" ? ka : en) as Record<string, unknown>;
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Pricing initialFeatures={LIVE_LIKE} />
    </NextIntlClientProvider>,
  );
}

const total = () => screen.getByTestId("plan-total").textContent?.replace(/\s/g, " ");
const moduleSwitch = (key: string) => within(screen.getByTestId(`module-${key}`)).getByRole("switch");
const plus = () => screen.getByRole("button", { name: "More employees" });

describe("calculator", () => {
  it("starts with tickets + workspace for 5 employees = 50 ₾ and follows the switches", () => {
    renderPricing();
    expect(moduleSwitch("ticket_management")).toHaveAttribute("aria-checked", "true");
    expect(total()).toBe("50 ₾");

    fireEvent.click(moduleSwitch("social_integrations"));
    expect(total()).toBe("145 ₾");

    fireEvent.click(moduleSwitch("ticket_management"));
    expect(total()).toBe("100 ₾");
  });

  it("the employee stepper goes 5 → 10 → … in steps of 5 and rescales the total", () => {
    renderPricing();
    expect(screen.getByRole("button", { name: "Fewer employees" })).toBeDisabled();
    fireEvent.click(plus());
    expect(screen.getByTestId("employee-count")).toHaveTextContent("10");
    expect(total()).toBe("100 ₾");
    // Pack cards follow the same count.
    expect(within(screen.getByTestId("pack-bookings")).getByTestId("pack-total")).toHaveTextContent(
      "= 440 ₾ / month for 10 employees",
    );
  });

  it("switching AI on also switches the inbox on and says so", () => {
    renderPricing();
    fireEvent.click(moduleSwitch("ai_companion"));
    expect(moduleSwitch("social_integrations")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("status")).toHaveTextContent("we switched Unified inbox on for you");
    expect(total()).toBe("220 ₾"); // (1 + 9 + 19 + 15) × 5
    expect(within(screen.getByTestId("module-ai_companion")).getByText("Requires Unified inbox")).toBeInTheDocument();
  });

  it("shows 'contact us' from 50 employees", () => {
    renderPricing();
    expect(screen.queryByTestId("contact-us")).toBeNull();
    for (let i = 0; i < 9; i += 1) fireEvent.click(plus());
    expect(screen.getByTestId("employee-count")).toHaveTextContent("50");
    expect(screen.getByTestId("contact-us")).toHaveTextContent("50+ employees?");
    expect(within(screen.getByTestId("contact-us")).getByRole("link")).toHaveAttribute("href", "mailto:info@echodesk.ge");
  });

  it("the CTA carries the selected module keys and employee count", () => {
    renderPricing();
    fireEvent.click(moduleSwitch("invoice_management"));
    fireEvent.click(plus());
    const href = decodeURIComponent(screen.getByTestId("plan-cta").getAttribute("href") ?? "");
    expect(href).toBe("/registration?modules=ticket_management,invoice_management&employees=10");
  });

  it("'load into calculator' copies a pack into the builder", () => {
    renderPricing();
    const load = within(screen.getByTestId("pack-callcentre")).getByRole("button", { name: "Load into calculator" });
    fireEvent.click(load);
    expect(total()).toBe("235 ₾");
    expect(moduleSwitch("ip_calling")).toHaveAttribute("aria-checked", "true");
    expect(moduleSwitch("booking_management")).toHaveAttribute("aria-checked", "false");
  });

  it("renders the Georgian calculator copy", () => {
    renderPricing("ka");
    expect(screen.getByText("ან ააწყვეთ თავად")).toBeInTheDocument();
    expect(screen.getByText("დაიწყეთ ამ პაკეტით")).toBeInTheDocument();
    expect(screen.getByText("რამდენი ადამიანი შევა სისტემაში?")).toBeInTheDocument();
    expect(screen.getByTestId("plan-summary")).toHaveTextContent("10 ₾ თანამშრომელზე");
  });
});
