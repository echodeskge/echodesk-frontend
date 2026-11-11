/**
 * In-app trial banner: shown while `is_trial` and `has_saved_card === false`,
 * hidden once a card exists or the trial is over, dismissible per session.
 */
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";

const state = vi.hoisted(() => ({ subscription: null as unknown }));
vi.mock("@/contexts/SubscriptionContext", () => ({ useSubscription: () => ({ subscription: state.subscription }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { TRIAL_BANNER_DISMISSED_KEY, TrialBanner } from "@/components/subscription/TrialBanner";
import { needsCardPrompt, readTrialStatus } from "@/lib/subscription-trial";

function renderBanner(locale: "ka" | "en" = "en") {
  const messages = (locale === "ka" ? ka : en) as Record<string, unknown>;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <TrialBanner />
    </NextIntlClientProvider>,
  );
}

const TRIAL_NO_CARD = {
  has_subscription: true,
  is_trial: true,
  trial_ends_at: "2026-11-23T10:00:00Z",
  trial_days_remaining: 12,
  has_saved_card: false,
  subscription: { is_active: true, expires_at: "2026-11-23T10:00:00Z" },
  features: {},
};

beforeEach(() => {
  window.sessionStorage.clear();
  state.subscription = TRIAL_NO_CARD;
});

describe("trial banner", () => {
  it("shows days left and the add-card link while on trial without a card", async () => {
    renderBanner();
    const banner = await screen.findByTestId("trial-banner");
    expect(banner).toHaveTextContent("Free trial — 12 days left");
    expect(screen.getByTestId("trial-banner-add-card")).toHaveTextContent("Add a card");
    expect(screen.getByTestId("trial-banner-add-card").getAttribute("href")).toMatch(/^\/settings\/subscription/);
  });

  it("hides once a card is saved", () => {
    state.subscription = { ...TRIAL_NO_CARD, has_saved_card: true };
    renderBanner();
    expect(screen.queryByTestId("trial-banner")).not.toBeInTheDocument();
  });

  it("hides when the tenant is not on trial, and when the API has no trial fields", () => {
    state.subscription = { ...TRIAL_NO_CARD, is_trial: false };
    const { unmount } = renderBanner();
    expect(screen.queryByTestId("trial-banner")).not.toBeInTheDocument();
    unmount();
    state.subscription = { has_subscription: true, features: {}, subscription: { is_active: true } };
    renderBanner();
    expect(screen.queryByTestId("trial-banner")).not.toBeInTheDocument();
  });

  it("is dismissible for the rest of the session", async () => {
    renderBanner();
    await screen.findByTestId("trial-banner");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByTestId("trial-banner")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(TRIAL_BANNER_DISMISSED_KEY)).toBe("1");

    // A fresh mount in the same session stays hidden.
    renderBanner();
    await waitFor(() => expect(screen.queryByTestId("trial-banner")).not.toBeInTheDocument());
  });

  it("speaks Georgian", async () => {
    renderBanner("ka");
    expect(await screen.findByTestId("trial-banner")).toHaveTextContent("უფასო პერიოდი — დარჩა 12 დღე");
    expect(screen.getByTestId("trial-banner-add-card")).toHaveTextContent("ბარათის დამატება");
  });

  it("reads the last day as 'ends today'", async () => {
    state.subscription = { ...TRIAL_NO_CARD, trial_days_remaining: 0 };
    renderBanner();
    expect(await screen.findByTestId("trial-banner")).toHaveTextContent("Free trial — ends today");
  });
});

describe("readTrialStatus", () => {
  const now = new Date("2026-11-11T09:00:00Z");

  it("reads the flat fields", () => {
    expect(readTrialStatus(TRIAL_NO_CARD, now)).toEqual({
      isTrial: true,
      trialEndsAt: "2026-11-23T10:00:00Z",
      daysRemaining: 12,
      hasSavedCard: false,
    });
  });

  it("falls back to the nested subscription object and computes the days", () => {
    const nested = {
      has_subscription: true,
      has_saved_card: false,
      subscription: { is_trial: true, trial_ends_at: "2026-11-21T08:00:00Z" },
    };
    const status = readTrialStatus(nested, now);
    expect(status).toEqual({ isTrial: true, trialEndsAt: "2026-11-21T08:00:00Z", daysRemaining: 10, hasSavedCard: false });
    expect(needsCardPrompt(status)).toBe(true);
  });

  it("never prompts without an explicit has_saved_card=false", () => {
    expect(needsCardPrompt(readTrialStatus({ is_trial: true }, now))).toBe(false);
    expect(needsCardPrompt(readTrialStatus({ is_trial: true, has_saved_card: true }, now))).toBe(false);
    expect(needsCardPrompt(readTrialStatus(null, now))).toBe(false);
    expect(needsCardPrompt(readTrialStatus("nope", now))).toBe(false);
  });

  it("clamps negative and fractional days", () => {
    expect(readTrialStatus({ is_trial: true, trial_days_remaining: -3 }, now).daysRemaining).toBe(0);
    expect(readTrialStatus({ is_trial: true, trial_days_remaining: 4.9 }, now).daysRemaining).toBe(4);
    expect(readTrialStatus({ is_trial: true, trial_ends_at: "2026-11-01T00:00:00Z" }, now).daysRemaining).toBe(0);
  });
});
