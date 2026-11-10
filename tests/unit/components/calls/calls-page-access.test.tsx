/**
 * /calls gating: one answer from useCallingAccess() instead of the tenant-only
 * FeatureGate. Tenant without the add-on -> upgrade block with the plan link;
 * user without the key -> no-access block; both translated (ka); the screen
 * renders only with canViewCalls; the subscription load shows a spinner.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import React from "react";
import { cl03Messages, lookup } from "../../calls/cl03-i18n";

const state = vi.hoisted(() => ({
  access: { tenantHasCalling: true, userHasCalling: true, canUseSoftphone: true, canViewCalls: true },
  loading: false,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/calling-access", () => ({ useCallingAccess: () => state.access }));
vi.mock("@/contexts/SubscriptionContext", () => ({ useSubscription: () => ({ loading: state.loading, hasFeature: () => true }) }));
vi.mock("@/app/(tenant)/calls/_components/calls-screen", () => ({ CallsScreen: () => <div data-testid="calls-screen">screen</div> }));

import CallsPage from "@/app/(tenant)/calls/page";

function renderPage(locale: "en" | "ka" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={cl03Messages[locale]}>
      <CallsPage />
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  state.access = { tenantHasCalling: true, userHasCalling: true, canUseSoftphone: true, canViewCalls: true };
  state.loading = false;
});

describe("/calls access", () => {
  it("renders the screen when the user may view calls", () => {
    renderPage();
    expect(screen.getByTestId("calls-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("calls-no-access")).toBeNull();
  });

  it("tenant without ip_calling: upgrade block with the subscription link", () => {
    state.access = { tenantHasCalling: false, userHasCalling: true, canUseSoftphone: false, canViewCalls: false };
    renderPage();
    const block = screen.getByTestId("calls-no-access");
    expect(block).toHaveAttribute("data-reason", "tenant");
    expect(block).toHaveTextContent(lookup(cl03Messages.en, "calls.access.upgradeTitle") as string);
    expect(screen.getByTestId("calls-upgrade-link")).toHaveAttribute("href", "/settings/subscription");
    expect(screen.queryByTestId("calls-screen")).toBeNull();
  });

  it("user without the feature key: no-access block without an upgrade link", () => {
    state.access = { tenantHasCalling: true, userHasCalling: false, canUseSoftphone: false, canViewCalls: false };
    renderPage();
    const block = screen.getByTestId("calls-no-access");
    expect(block).toHaveAttribute("data-reason", "user");
    expect(block).toHaveTextContent(lookup(cl03Messages.en, "calls.access.noAccessDescription") as string);
    expect(screen.queryByTestId("calls-upgrade-link")).toBeNull();
  });

  it("waits for the subscription before deciding", () => {
    state.access = { tenantHasCalling: false, userHasCalling: true, canUseSoftphone: false, canViewCalls: false };
    state.loading = true;
    renderPage();
    expect(screen.getByTestId("calls-access-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("calls-no-access")).toBeNull();
  });

  it("is translated (ka, no Latin UI text)", () => {
    state.access = { tenantHasCalling: false, userHasCalling: true, canUseSoftphone: false, canViewCalls: false };
    renderPage("ka");
    const block = screen.getByTestId("calls-no-access");
    expect(block).toHaveTextContent(lookup(cl03Messages.ka, "calls.access.upgradeTitle") as string);
    expect(block.textContent?.replace(/IP/g, "")).not.toMatch(/[A-Za-z]{3,}/);
  });
});
