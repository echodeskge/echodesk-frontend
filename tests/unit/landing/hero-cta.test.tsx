/**
 * Hero (chips + static app mock), closing CTA band and FAQ: copy rules
 * (30-day trial, no card, Germany/Hetzner hosting, never "14-day"), the
 * product's real sidebar labels, the Georgian message bubble.
 */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: React.ComponentProps<"img">) => <img {...props} />,
}));

import { Hero } from "@/components/landing/Hero";
import { CTA } from "@/components/landing/CTA";
import { FAQ } from "@/components/landing/FAQ";

function renderAll(locale: "ka" | "en" = "en") {
  const messages = (locale === "ka" ? ka : en) as Record<string, unknown>;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Hero />
      <FAQ />
      <CTA />
    </NextIntlClientProvider>,
  );
}

describe("hero", () => {
  it("shows the three module chips and the registration CTA", () => {
    renderAll();
    const chips = within(screen.getByTestId("hero-chips")).getAllByRole("listitem");
    expect(chips.map((c) => c.textContent)).toEqual(["Tickets & boards", "Unified inbox", "Calls & PBX"]);
    expect(screen.getByRole("link", { name: /Get Started Free/ })).toHaveAttribute("href", "/registration");
    expect(screen.getByRole("link", { name: "Explore Features" })).toHaveAttribute("href", "#features");
  });

  it("the app mock is static JSX with the product's sidebar labels and a Georgian bubble", () => {
    renderAll();
    const mock = screen.getByTestId("app-mock");
    expect(mock.querySelector("img[src*='dashboard-preview']")).toBeNull();
    for (const label of ["Boards", "Calls", "Messages", "Email", "Users", "Bookings", "Invoices", "Settings"]) {
      expect(mock).toHaveTextContent(label);
    }
    expect(mock).toHaveTextContent("გამარჯობა, შემიძლია ხვალ 11:00-ზე ჩავიწერო?");
    expect(mock).toHaveTextContent("Incoming call · 02:14");
    expect(mock).toHaveTextContent("Mariam Gelashvili");
    expect(mock).toHaveTextContent("demo.echodesk.ge/messages");
  });

  it("the Georgian mock uses the product's Georgian sidebar labels and names", () => {
    renderAll("ka");
    const mock = screen.getByTestId("app-mock");
    for (const label of ["დაფები", "ზარები", "შეტყობინებები", "ელ. ფოსტა", "თანამშრომლები", "ჯავშნები", "ინვოისები", "პარამეტრები"]) {
      expect(mock).toHaveTextContent(label);
    }
    expect(mock).toHaveTextContent("მარიამ გელაშვილი");
    expect(mock).toHaveTextContent("შემომავალი ზარი · 02:14");
    const chips = within(screen.getByTestId("hero-chips")).getAllByRole("listitem");
    expect(chips.map((c) => c.textContent)).toEqual(["დავალებები", "ერთიანი ინბოქსი", "ზარები"]);
  });
});

describe("CTA + FAQ copy", () => {
  it.each(["en", "ka"] as const)("%s: 30-day trial without a card, never 14-day, EU/Hetzner hosting", (locale) => {
    const { container } = renderAll(locale);
    // Open the "Where is my data stored?" answer (the accordion shows one answer at a time).
    fireEvent.click(within(screen.getByTestId("faq-list")).getAllByRole("button")[6]);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/14[- ]?day/i);
    expect(text).not.toMatch(/14[- ]?დღ/);
    expect(text).not.toMatch(/hundreds of businesses/i);
    expect(text).not.toMatch(/Frankfurt|DigitalOcean/);
    expect(text).toContain("30");
    expect(text).toContain("Hetzner");
    if (locale === "en") {
      expect(screen.getByTestId("cta")).toHaveTextContent("30 days free • no card needed");
      expect(screen.getByTestId("cta")).toHaveTextContent("Start 30 days free");
    } else {
      expect(screen.getByTestId("cta")).toHaveTextContent("30 დღე უფასოდ • ბარათის გარეშე");
      expect(text).toContain("გერმანიაში");
    }
  });

  it("the FAQ accordion opens the first item and toggles", () => {
    renderAll();
    const list = screen.getByTestId("faq-list");
    const buttons = within(list).getAllByRole("button");
    expect(buttons).toHaveLength(7);
    expect(buttons[0]).toHaveAttribute("aria-expanded", "true");
    expect(list).toHaveTextContent("EchoDesk is an all-in-one business platform");
    fireEvent.click(buttons[4]);
    expect(buttons[0]).toHaveAttribute("aria-expanded", "false");
    expect(buttons[4]).toHaveAttribute("aria-expanded", "true");
    expect(list).toHaveTextContent("30 days free, no card needed");
  });
});
