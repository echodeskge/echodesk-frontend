/**
 * /registration/success after the no-card signup: workspace ready, trial end
 * date, what happens on day 30, link to the tenant URL. Never "Payment".
 */
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
vi.mock("@/components/landing/Footer", () => ({ Footer: () => null }));

import RegistrationSuccessPage from "@/app/registration/success/page";
import {
  REGISTRATION_RESULT_KEY,
  formatTrialDate,
  readRegistrationResult,
  saveRegistrationResult,
  trialEndFromResponse,
} from "@/lib/registration-result";

function renderPage(locale: "ka" | "en" = "en") {
  const messages = (locale === "ka" ? ka : en) as Record<string, unknown>;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <RegistrationSuccessPage />
    </NextIntlClientProvider>,
  );
}

const RESULT = {
  company_name: "Acme Inc",
  admin_email: "nino@acme.ge",
  frontend_url: "https://acme.echodesk.ge",
  trial_ends_at: "2026-12-11T12:00:00.000Z",
};

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("registration success page", () => {
  it("shows the workspace, the trial end date and the day-30 note (en)", async () => {
    window.sessionStorage.setItem(REGISTRATION_RESULT_KEY, JSON.stringify(RESULT));
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Your workspace is being set up" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("success-subtitle")).toHaveTextContent("Acme Inc is being created"));
    expect(screen.getByTestId("trial-ends")).toHaveTextContent("Free trial ends on 11 December 2026");
    expect(screen.getByTestId("workspace-host")).toHaveTextContent("acme.echodesk.ge");
    expect(screen.getByTestId("open-workspace")).toHaveAttribute("href", "https://acme.echodesk.ge");
    expect(screen.getByText("Once it is ready (you will get an email), sign in with nino@acme.ge and the password you chose.")).toBeInTheDocument();
    expect(screen.getByTestId("day30-card")).toHaveTextContent("What happens on day 30");
    expect(screen.getByTestId("day30-card")).toHaveTextContent(
      "add a card in Settings → Subscription before 11 December 2026",
    );
    expect(document.body.textContent).not.toMatch(/payment successful/i);
    expect(document.body.textContent).not.toMatch(/\bpayment\b(?! is taken only after)/i);
  });

  it("renders Georgian copy", async () => {
    window.sessionStorage.setItem(REGISTRATION_RESULT_KEY, JSON.stringify(RESULT));
    renderPage("ka");
    expect(screen.getByRole("heading", { level: 1, name: "თქვენი სამუშაო სივრცე იქმნება" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("success-subtitle")).toHaveTextContent("Acme Inc იქმნება"));
    const date = formatTrialDate(RESULT.trial_ends_at, "ka");
    expect(date).toMatch(/2026/);
    expect(screen.getByTestId("trial-ends")).toHaveTextContent(`უფასო პერიოდი მთავრდება: ${date}`);
    expect(screen.getByTestId("day30-card")).toHaveTextContent("რა ხდება 30-ე დღეს");
    expect(screen.getByText("სამუშაო სივრცის გახსნა", { selector: "a[data-testid=open-workspace]" })).toBeInTheDocument();
  });

  it("falls back to generic copy and a 30-day date when opened without a signup in this tab", () => {
    renderPage();
    expect(screen.getByTestId("success-subtitle")).toHaveTextContent(
      "Your workspace is being created — this takes a minute or two. Your 30-day free trial has started, no card needed.",
    );
    expect(screen.queryByTestId("workspace-card")).not.toBeInTheDocument();
    expect(screen.getByTestId("trial-ends")).toHaveTextContent(/Free trial ends on \d{1,2} \w+ \d{4}/);
    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/");
  });
});

describe("registration-result helpers", () => {
  it("takes the trial end from the register response, else 30 days from now", () => {
    const now = new Date("2026-11-11T10:00:00Z");
    expect(trialEndFromResponse({ subscription: { trial_expires: "2026-12-11T10:00:00Z" } }, now)).toBe(
      "2026-12-11T10:00:00.000Z",
    );
    expect(trialEndFromResponse({ subscription: { trial_expires: "not a date" } }, now)).toBe("2026-12-11T10:00:00.000Z");
    expect(trialEndFromResponse(undefined, now)).toBe("2026-12-11T10:00:00.000Z");
  });

  it("round-trips through sessionStorage and ignores junk", () => {
    saveRegistrationResult(RESULT);
    expect(readRegistrationResult()).toEqual(RESULT);
    window.sessionStorage.setItem(REGISTRATION_RESULT_KEY, "{not json");
    expect(readRegistrationResult()).toBeNull();
    window.sessionStorage.setItem(REGISTRATION_RESULT_KEY, JSON.stringify({ frontend_url: 1 }));
    expect(readRegistrationResult()).toBeNull();
  });

  it("formats the date per locale", () => {
    expect(formatTrialDate("2026-12-11T12:00:00Z", "en")).toBe("11 December 2026");
    expect(formatTrialDate("2026-12-11T12:00:00Z", "ka")).toMatch(/დეკემბ/);
    expect(formatTrialDate("garbage", "en")).toBe("");
  });
});
