/**
 * FeatureGate / LimitGate (U9): translated texts (en + ka), a theme-aware
 * `bg-muted` skeleton while the subscription loads, the redesign outline
 * link to the subscription page, fallback / showUpgrade behaviour kept.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import React from "react";
import { cl03Messages, lookup } from "../../calls/cl03-i18n";

const state = vi.hoisted(() => ({
  loading: false,
  features: { ip_calling: true } as Record<string, boolean>,
  within: true,
  usage: { users: { current: 5, limit: 5 } } as Record<string, { current: number; limit: number }>,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/contexts/SubscriptionContext", () => ({
  useSubscription: () => ({
    loading: state.loading,
    hasFeature: (f: string) => !!state.features[f],
    isWithinLimit: () => state.within,
    subscription: { usage_limits: state.usage },
  }),
}));

import { FeatureGate, LimitGate, withFeatureGate } from "@/components/subscription/FeatureGate";

function wrap(ui: React.ReactElement, locale: "en" | "ka" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={cl03Messages[locale]}>
      {ui}
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  state.loading = false;
  state.features = { ip_calling: true };
  state.within = true;
});

describe("FeatureGate", () => {
  it("renders children when the tenant has the feature", () => {
    wrap(
      <FeatureGate feature="ip_calling">
        <span>child</span>
      </FeatureGate>
    );
    expect(screen.getByText("child")).toBeInTheDocument();
    expect(screen.queryByTestId("feature-gate-locked")).toBeNull();
  });

  it("shows a bg-muted skeleton while the subscription loads", () => {
    state.loading = true;
    wrap(
      <FeatureGate feature="ip_calling">
        <span>child</span>
      </FeatureGate>
    );
    const skeleton = screen.getByTestId("feature-gate-loading");
    expect(skeleton.className).toContain("bg-muted");
    expect(skeleton.className).not.toContain("bg-gray");
    expect(skeleton).toHaveAttribute("aria-label", lookup(cl03Messages.en, "featureGate.loading") as string);
    expect(screen.queryByText("child")).toBeNull();
  });

  it("locked: translated title, description and the outline upgrade link", () => {
    state.features = {};
    wrap(
      <FeatureGate feature="ip_calling">
        <span>child</span>
      </FeatureGate>
    );
    const block = screen.getByTestId("feature-gate-locked");
    expect(block).toHaveTextContent(lookup(cl03Messages.en, "featureGate.notAvailableTitle") as string);
    expect(block).toHaveTextContent(lookup(cl03Messages.en, "featureGate.notAvailableDescription") as string);
    const link = screen.getByTestId("feature-gate-locked-upgrade");
    expect(link).toHaveAttribute("href", "/settings/subscription");
    expect(link).toHaveTextContent(lookup(cl03Messages.en, "featureGate.upgradePlan") as string);
    expect(link.className).toContain("border");
    expect(screen.queryByText("child")).toBeNull();
  });

  it("customMessage replaces the description; fallback replaces the block; showUpgrade=false renders nothing", () => {
    state.features = {};
    const { unmount } = wrap(
      <FeatureGate feature="ip_calling" customMessage="Ask sales">
        <span>child</span>
      </FeatureGate>
    );
    expect(screen.getByTestId("feature-gate-locked")).toHaveTextContent("Ask sales");
    unmount();

    const second = wrap(
      <FeatureGate feature="ip_calling" fallback={<em>fallback</em>}>
        <span>child</span>
      </FeatureGate>
    );
    expect(screen.getByText("fallback")).toBeInTheDocument();
    expect(screen.queryByTestId("feature-gate-locked")).toBeNull();
    second.unmount();

    const { container } = wrap(
      <FeatureGate feature="ip_calling" showUpgrade={false}>
        <span>child</span>
      </FeatureGate>
    );
    expect(container.textContent).toBe("");
  });

  it("is translated in Georgian", () => {
    state.features = {};
    wrap(
      <FeatureGate feature="ip_calling">
        <span>child</span>
      </FeatureGate>,
      "ka"
    );
    const block = screen.getByTestId("feature-gate-locked");
    expect(block).toHaveTextContent(lookup(cl03Messages.ka, "featureGate.notAvailableTitle") as string);
    expect(block.textContent).not.toMatch(/Feature Not Available|Upgrade Plan/);
  });

  it("withFeatureGate wraps a component", () => {
    state.features = {};
    const Gated = withFeatureGate(() => <span>inner</span>, "ip_calling");
    wrap(<Gated />);
    expect(screen.getByTestId("feature-gate-locked")).toBeInTheDocument();
    expect(screen.queryByText("inner")).toBeNull();
  });
});

describe("LimitGate", () => {
  it("renders children within the limit and a translated block with usage beyond it", () => {
    const { unmount } = wrap(
      <LimitGate limitType="users">
        <span>child</span>
      </LimitGate>
    );
    expect(screen.getByText("child")).toBeInTheDocument();
    unmount();

    state.within = false;
    wrap(
      <LimitGate limitType="users">
        <span>child</span>
      </LimitGate>
    );
    const block = screen.getByTestId("limit-gate-reached");
    expect(block).toHaveTextContent(lookup(cl03Messages.en, "featureGate.limitTitle") as string);
    expect(block).toHaveTextContent("You have reached your users limit (5 / 5).");
    expect(screen.getByTestId("limit-gate-reached-upgrade")).toHaveAttribute("href", "/settings/subscription");
  });
});
