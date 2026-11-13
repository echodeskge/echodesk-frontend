/**
 * Landing calculator (design: module list + sticky "Your plan"): switches,
 * the employee-count control (any whole number from 1, chips as shortcuts,
 * no cap, no "contact us"), live total, AI → inbox rule, pack → calculator
 * hand-off, select all / clear, info panels.
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
const minus = () => screen.getByRole("button", { name: "Fewer employees" });
const countInput = () => screen.getByTestId("employee-count") as HTMLInputElement;

describe("calculator", () => {
  it("starts with tickets + workspace for 1 employee = 10 ₾ and follows the switches", () => {
    renderPricing();
    expect(moduleSwitch("ticket_management")).toHaveAttribute("aria-checked", "true");
    expect(countInput()).toHaveValue(1);
    expect(total()).toBe("10 ₾");

    fireEvent.click(moduleSwitch("social_integrations"));
    expect(total()).toBe("29 ₾");

    fireEvent.click(moduleSwitch("ticket_management"));
    expect(total()).toBe("20 ₾");
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
    expect(total()).toBe("10 ₾");
  });

  it("the stepper goes 1 → 2 → 3 by one, chips jump, and the lines show price × n", () => {
    renderPricing();
    expect(minus()).toBeDisabled();
    fireEvent.click(plus());
    expect(countInput()).toHaveValue(2);
    expect(total()).toBe("20 ₾");
    fireEvent.click(plus());
    expect(countInput()).toHaveValue(3);
    expect(total()).toBe("30 ₾");
    expect(screen.getByTestId("line-ticket_management")).toHaveTextContent("9 ₾ × 3 = 27 ₾");
    expect(screen.getByTestId("line-workspace")).toHaveTextContent("1 ₾ × 3 = 3 ₾");
    // Pack presets follow the same count.
    expect(within(screen.getByTestId("pack-bookings")).getByTestId("pack-total")).toHaveTextContent(
      "= 132 ₾ / month for 3 employees",
    );
    expect(screen.getByTestId("plan-cta").getAttribute("href")).toContain("employees=3");

    fireEvent.click(minus());
    expect(countInput()).toHaveValue(2);
    fireEvent.click(minus());
    expect(countInput()).toHaveValue(1);
    expect(minus()).toBeDisabled();

    // Chips are shortcuts, not limits.
    fireEvent.click(screen.getByTestId("employee-chip-10"));
    expect(countInput()).toHaveValue(10);
    expect(screen.getByTestId("employee-chip-10")).toHaveAttribute("aria-pressed", "true");
    expect(total()).toBe("100 ₾");
    fireEvent.click(screen.getByTestId("employee-chip-20"));
    expect(total()).toBe("200 ₾");
    fireEvent.click(plus());
    expect(countInput()).toHaveValue(21);
    expect(plus()).not.toBeDisabled();
    expect(screen.queryByRole("slider")).toBeNull();
  });

  it("the count is typed directly: any whole number, no upper limit, junk floors to 1", () => {
    renderPricing();
    fireEvent.change(countInput(), { target: { value: "7" } });
    expect(total()).toBe("70 ₾");
    fireEvent.change(countInput(), { target: { value: "350" } });
    expect(countInput()).toHaveValue(350);
    expect(total()).toBe("3 500 ₾");
    expect(screen.queryByTestId("contact-us")).toBeNull();

    // Emptying the field keeps the last total; blur restores a valid value.
    fireEvent.change(countInput(), { target: { value: "" } });
    expect(total()).toBe("3 500 ₾");
    fireEvent.blur(countInput());
    expect(countInput()).toHaveValue(1);
    expect(total()).toBe("10 ₾");

    fireEvent.change(countInput(), { target: { value: "0" } });
    fireEvent.keyDown(countInput(), { key: "Enter" });
    expect(countInput()).toHaveValue(1);
    expect(screen.getByTestId("employee-count-hint")).toHaveTextContent("From 1 employee. Change it any time.");
  });

  it("switching AI on also switches the inbox on and says so", () => {
    renderPricing();
    fireEvent.click(moduleSwitch("ai_companion"));
    expect(moduleSwitch("social_integrations")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("status")).toHaveTextContent("we switched Unified inbox on for you");
    expect(total()).toBe("44 ₾"); // (1 + 9 + 19 + 15) × 1
    expect(screen.getByTestId("module-ai_companion")).toHaveTextContent("Requires Unified inbox");
  });

  it("never shows a 'contact us' line or a 50+ limit, at any team size", () => {
    const { container } = renderPricing();
    fireEvent.click(screen.getByTestId("employee-chip-20"));
    for (let i = 0; i < 35; i++) fireEvent.click(plus());
    expect(countInput()).toHaveValue(55);
    expect(screen.queryByTestId("contact-us")).toBeNull();
    expect(container.textContent).not.toMatch(/50\+|contact us|Minimum/i);
    expect(screen.queryByRole("link", { name: /info@echodesk\.ge/ })).toBeNull();
  });

  it("the CTA carries the selected module keys and employee count", () => {
    renderPricing();
    fireEvent.click(moduleSwitch("invoice_management"));
    fireEvent.click(plus());
    const href = decodeURIComponent(screen.getByTestId("plan-cta").getAttribute("href") ?? "");
    expect(href).toBe("/registration?modules=ticket_management,invoice_management&employees=2");
  });

  it("'load into calculator' copies a pack into the builder", () => {
    renderPricing();
    const load = within(screen.getByTestId("pack-callcentre")).getByRole("button", { name: "Load into calculator" });
    fireEvent.click(load);
    expect(total()).toBe("47 ₾");
    expect(moduleSwitch("ip_calling")).toHaveAttribute("aria-checked", "true");
    expect(moduleSwitch("booking_management")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(/5 of 8 selected/)).toBeInTheDocument();
  });

  it("'select all' switches every module on and becomes 'clear optional'", () => {
    renderPricing();
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(total()).toBe("100 ₾");
    expect(screen.getByText(/8 of 8 selected/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear optional" }));
    expect(total()).toBe("1 ₾");
    expect(moduleSwitch("ticket_management")).toHaveAttribute("aria-checked", "false");
  });

  it("renders the Georgian calculator copy with the seat word", () => {
    renderPricing("ka");
    expect(screen.getByText("აირჩიეთ მოდულები")).toBeInTheDocument();
    expect(screen.getByText("დაიწყეთ ამ პაკეტით")).toBeInTheDocument();
    expect(screen.getByText("რამდენი თანამშრომელი შევა სისტემაში?")).toBeInTheDocument();
    expect(screen.getByTestId("plan-summary")).toHaveTextContent("10 ₾ თანამშრომელზე");
    expect(screen.getByTestId("plan-summary")).toHaveTextContent("1 მოდული არჩეულია 1 თანამშრომლისთვის");
    expect(screen.getByTestId("employee-count-hint")).toHaveTextContent("1 თანამშრომლიდან. შეცვლა ნებისმიერ დროს.");
    expect(document.body.textContent).not.toMatch(/მინიმუმ 5|50\+|50-ზე მეტი/);
  });
});
