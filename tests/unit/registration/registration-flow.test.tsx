/**
 * Signup flow: 1 plan → 2 registration form, submitted through
 * `registerTenant` (POST /api/register/, the 30-day no-card trial). There is
 * no payment step and no "payment" wording anywhere on the path.
 */
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";
import { LIVE_LIKE } from "../landing/pricing-fixtures";

// `useSearchParams` must return the same instance across renders (as Next
// does): the flow's catalogue effect depends on it.
const nav = vi.hoisted(() => ({
  params: new URLSearchParams(""),
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => nav.params,
  useRouter: () => ({ push: nav.push, prefetch: vi.fn(), replace: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/landing/Footer", () => ({ Footer: () => null }));
const api = vi.hoisted(() => ({
  featuresList: vi.fn(),
  registerTenant: vi.fn(),
  registerTenantWithPayment: vi.fn(),
}));
vi.mock("@/api/generated/api", () => api);

import { RegistrationFlow } from "@/components/registration/RegistrationFlow";
import { expandSelection, keysToIds } from "@/lib/pricing";
import { REGISTRATION_RESULT_KEY } from "@/lib/registration-result";

function renderFlow(locale: "ka" | "en" = "en") {
  const messages = (locale === "ka" ? ka : en) as Record<string, unknown>;
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <RegistrationFlow />
    </NextIntlClientProvider>,
  );
}

// Signup-path payment wording that must be gone (module bullets may still
// describe product features such as "Bank of Georgia payment links").
const PAYMENT_STEP = /continue to payment|payment method|payment provider|choose how you'd like to pay|pay first|today's charge/i;

function fill(id: string, value: string) {
  fireEvent.change(document.querySelector(`#${id}`) as HTMLInputElement, { target: { name: id, value } });
}

beforeEach(() => {
  nav.params = new URLSearchParams("");
  nav.push.mockReset();
  api.featuresList.mockReset().mockResolvedValue({ results: LIVE_LIKE });
  api.registerTenant.mockReset();
  api.registerTenantWithPayment.mockReset();
  window.sessionStorage.clear();
});

describe("registration flow", () => {
  it("has two steps: plan, then the form — no payment-provider step", async () => {
    renderFlow();
    expect(await screen.findByRole("heading", { level: 1, name: "Build your plan" })).toBeInTheDocument();
    expect(screen.getByTestId("trial-note")).toHaveTextContent("30 days free, no card needed");
    expect(document.body.textContent).not.toMatch(PAYMENT_STEP);

    fireEvent.click(screen.getByTestId("plan-cta"));
    expect(screen.getByRole("heading", { level: 1, name: "Complete Your Registration" })).toBeInTheDocument();
    expect(screen.queryByText("Payment Method")).not.toBeInTheDocument();
    expect(screen.queryByText(/Paddle|USD\/EUR|Bank of Georgia/)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(PAYMENT_STEP);
    expect(screen.getByRole("button", { name: "Start free trial" })).toBeInTheDocument();
    expect(screen.getByTestId("trial-note")).toHaveTextContent("30 days free, no card needed");
  });

  it("submits through registerTenant with the plan's feature ids and agent count", async () => {
    nav.params = new URLSearchParams("pack=bookings&employees=10");
    api.registerTenant.mockResolvedValue({
      message: "ok",
      frontend_url: "https://acme.echodesk.ge",
      subscription: { trial_expires: "2026-12-11T12:00:00Z" },
    });
    renderFlow();

    // A pre-built plan lands on the form straight away.
    expect(await screen.findByRole("heading", { level: 1, name: "Complete Your Registration" })).toBeInTheDocument();
    expect(screen.getByTestId("plan-line")).toHaveTextContent("Bookings pack · 10 employees · 440 ₾ / month");

    fill("company_name", "Acme Inc");
    fill("admin_first_name", "Nino");
    fill("admin_last_name", "K");
    fill("admin_email", "nino@acme.ge");
    fill("admin_password", "correct-horse-battery");
    fireEvent.click(screen.getByRole("button", { name: "Start free trial" }));

    await waitFor(() => expect(api.registerTenant).toHaveBeenCalledTimes(1));
    const payload = api.registerTenant.mock.calls[0][0];
    const expectedIds = keysToIds(
      expandSelection(["booking_management", "social_integrations", "invoice_management"], LIVE_LIKE),
      LIVE_LIKE,
    );
    expect(expectedIds.length).toBeGreaterThanOrEqual(5);
    expect(payload).toMatchObject({
      company_name: "Acme Inc",
      domain: "acme-inc",
      agent_count: 10,
      admin_email: "nino@acme.ge",
      admin_password: "correct-horse-battery",
      admin_first_name: "Nino",
      admin_last_name: "K",
      is_custom: true,
      pricing_model: "agent",
    });
    expect([...payload.feature_ids].sort()).toEqual([...expectedIds].sort());
    expect(payload).not.toHaveProperty("payment_provider");
    expect(api.registerTenantWithPayment).not.toHaveBeenCalled();

    // Hand-off to the success page: tenant URL + trial end, never the password.
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/registration/success"));
    const stored = JSON.parse(window.sessionStorage.getItem(REGISTRATION_RESULT_KEY) ?? "{}");
    expect(stored).toMatchObject({
      company_name: "Acme Inc",
      admin_email: "nino@acme.ge",
      frontend_url: "https://acme.echodesk.ge",
      trial_ends_at: "2026-12-11T12:00:00.000Z",
    });
    expect(JSON.stringify(stored)).not.toContain("correct-horse-battery");
  });

  it("shows the API error and stays on the form when registration fails", async () => {
    nav.params = new URLSearchParams("pack=shop&employees=5");
    api.registerTenant.mockRejectedValue({ response: { data: { error: "Domain already taken" } } });
    renderFlow();
    await screen.findByRole("heading", { level: 1, name: "Complete Your Registration" });
    fill("company_name", "Acme");
    fill("admin_first_name", "A");
    fill("admin_last_name", "B");
    fill("admin_email", "a@b.ge");
    fill("admin_password", "12345678");
    fireEvent.click(screen.getByRole("button", { name: "Start free trial" }));
    expect(await screen.findByText("Domain already taken")).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("uses the Georgian trial wording", async () => {
    nav.params = new URLSearchParams("pack=callcentre&employees=5");
    renderFlow("ka");
    await screen.findByRole("heading", { level: 1, name: "დაასრულეთ თქვენი რეგისტრაცია" });
    expect(screen.getByRole("button", { name: "უფასო პერიოდის დაწყება" })).toBeInTheDocument();
    expect(screen.getByTestId("trial-note")).toHaveTextContent("30 დღე უფასოდ, ბარათის გარეშე");
    expect(document.body.textContent).not.toMatch(/გადასვლა გადახდაზე|გადახდის მეთოდი/);
    expect(document.body.textContent).not.toMatch(PAYMENT_STEP);
  });
});
