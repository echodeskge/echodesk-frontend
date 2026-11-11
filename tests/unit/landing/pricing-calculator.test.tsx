/**
 * Landing calculator (design: module list + sticky "Your plan"): switches,
 * team-size stepper/presets, live total, AI → inbox rule, "50+ contact us",
 * pack → calculator hand-off, select all / clear, info panels.
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

const total = () => screen.getByTestId("plan-total").textContent?.replace(/\s+/g, " ").trim();
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

  it("clicking anywhere on a row toggles it, except the (i) button", () => {
    renderPricing();
    fireEvent.click(screen.getByTestId("module-invoice_management"));
    expect(moduleSwitch("invoice_management")).toHaveAttribute("aria-checked", "true");

    const info = within(screen.getByTestId("module-invoice_management")).getByRole("button", { name: "What's included" });
    fireEvent.click(info);
    expect(moduleSwitch("invoice_management")).toHaveAttribute("aria-checked", "true");
    expect(info).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("module-invoice_management-info")).toHaveTextContent("Draft → Sent → Paid");
    fireEvent.click(info);
    expect(screen.queryByTestId("module-invoice_management-info")).toBeNull();
  });

  it("the workspace row is always on, shows 'Included' and cannot be toggled", () => {
    renderPricing();
    const row = screen.getByTestId("module-workspace");
    const sw = within(row).getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(sw).toBeDisabled();
    expect(row).toHaveTextContent("Included");
    expect(row).toHaveTextContent("Always on");
    fireEvent.click(row);
    expect(total()).toBe("50 ₾");
  });

  it("the stepper goes 5 → 10 in steps of 5, presets jump, and the lines show price × n", () => {
    renderPricing();
    expect(screen.getByRole("button", { name: "Fewer employees" })).toBeDisabled();
    fireEvent.click(plus());
    expect(screen.getByTestId("employee-count")).toHaveTextContent("10");
    expect(total()).toBe("100 ₾");
    expect(screen.getByTestId("line-ticket_management")).toHaveTextContent("9 ₾ × 10 = 90 ₾");
    expect(screen.getByTestId("line-workspace")).toHaveTextContent("1 ₾ × 10 = 10 ₾");
    // Pack presets follow the same count.
    expect(within(screen.getByTestId("pack-bookings")).getByTestId("pack-total")).toHaveTextContent(
      "= 440 ₾ / month for 10 employees",
    );

    fireEvent.click(screen.getByRole("button", { name: "25" }));
    expect(screen.getByTestId("employee-count")).toHaveTextContent("25");
    expect(total()).toBe("250 ₾");

    fireEvent.change(screen.getByRole("slider"), { target: { value: "40" } });
    expect(screen.getByTestId("employee-count")).toHaveTextContent("40");
  });

  it("switching AI on also switches the inbox on and says so", () => {
    renderPricing();
    fireEvent.click(moduleSwitch("ai_companion"));
    expect(moduleSwitch("social_integrations")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("status")).toHaveTextContent("we switched Unified inbox on for you");
    expect(total()).toBe("220 ₾"); // (1 + 9 + 19 + 15) × 5
    expect(screen.getByTestId("module-ai_companion")).toHaveTextContent("Requires Unified inbox");
  });

  it("shows 'contact us' from 50 employees", () => {
    renderPricing();
    expect(screen.queryByTestId("contact-us")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "50" }));
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
    expect(screen.getByText(/5 of 8 selected/)).toBeInTheDocument();
  });

  it("'select all' switches every module on and becomes 'clear optional'", () => {
    renderPricing();
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(total()).toBe("500 ₾");
    expect(screen.getByText(/8 of 8 selected/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear optional" }));
    expect(total()).toBe("5 ₾");
    expect(moduleSwitch("ticket_management")).toHaveAttribute("aria-checked", "false");
  });

  it("renders the Georgian calculator copy with the seat word", () => {
    renderPricing("ka");
    expect(screen.getByText("აირჩიეთ მოდულები")).toBeInTheDocument();
    expect(screen.getByText("დაიწყეთ ამ პაკეტით")).toBeInTheDocument();
    expect(screen.getByText("რამდენი თანამშრომელი შევა სისტემაში?")).toBeInTheDocument();
    expect(screen.getByTestId("plan-summary")).toHaveTextContent("10 ₾ თანამშრომელზე");
    expect(screen.getByTestId("plan-summary")).toHaveTextContent("1 მოდული არჩეულია 5 თანამშრომლისთვის");
  });
});
