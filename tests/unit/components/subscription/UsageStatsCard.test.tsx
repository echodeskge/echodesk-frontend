/**
 * UsageStatsCard reads the backend's usage_limits entries
 * (tenants/permissions.py check_subscription_limit):
 *   { within_limit, current, limit (null = unlimited), usage_percentage }
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UsageStatsCard, getLimitStatus } from "@/components/subscription/UsageStatsCard";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const check = (
  current: number,
  limit: number | null,
  within_limit: boolean,
  usage_percentage: number
) => ({ current, limit, within_limit, usage_percentage });

describe("getLimitStatus", () => {
  it("is calm well under the limit", () => {
    expect(getLimitStatus(check(2, 10, true, 20))).toEqual({
      isExceeded: false,
      isNearLimit: false,
      percentUsed: 20,
    });
  });

  it("is near the limit at >= 80%", () => {
    expect(getLimitStatus(check(8, 10, true, 80))).toMatchObject({
      isExceeded: false,
      isNearLimit: true,
    });
  });

  it("treats exactly reaching the limit (no seat left) as near, not exceeded", () => {
    // users: within_limit = current < agent_count, so it is false when full.
    expect(getLimitStatus(check(10, 10, false, 100))).toMatchObject({
      isExceeded: false,
      isNearLimit: true,
      percentUsed: 100,
    });
  });

  it("is exceeded when over the limit and not within it", () => {
    expect(getLimitStatus(check(12, 10, false, 120))).toEqual({
      isExceeded: true,
      isNearLimit: false,
      percentUsed: 100,
    });
  });

  it("trusts within_limit=true even over the nominal limit (WhatsApp limits are off)", () => {
    expect(getLimitStatus(check(12000, 10000, true, 120)).isExceeded).toBe(false);
  });

  it("never flags an unlimited (null) limit", () => {
    expect(getLimitStatus(check(50, null, false, 0))).toEqual({
      isExceeded: false,
      isNearLimit: false,
      percentUsed: 0,
    });
  });

  it("handles a missing entry", () => {
    expect(getLimitStatus(undefined)).toEqual({
      isExceeded: false,
      isNearLimit: false,
      percentUsed: 0,
    });
  });
});

describe("UsageStatsCard", () => {
  const subscription = (users: ReturnType<typeof check>) => ({
    has_subscription: true,
    limits: { max_users: users.limit, max_whatsapp_messages: 10000, max_storage_gb: 100 },
    usage: { current_users: users.current, whatsapp_messages_used: 10, storage_used_gb: 1 },
    usage_limits: {
      users,
      whatsapp: check(10, 10000, true, 0.1),
      storage: check(1, 100, true, 1),
    },
  });

  it("shows the exceeded badge from the backend fields", () => {
    render(<UsageStatsCard subscription={subscription(check(6, 5, false, 120))} />);
    expect(screen.getByText("badges.limitExceeded")).toBeInTheDocument();
    expect(screen.queryByText("badges.nearLimit")).not.toBeInTheDocument();
    expect(screen.getByText("6 / 5")).toHaveClass("text-red-600");
  });

  it("shows the near-limit badge at a high usage_percentage", () => {
    render(<UsageStatsCard subscription={subscription(check(9, 10, true, 90))} />);
    expect(screen.getByText("badges.nearLimit")).toBeInTheDocument();
    expect(screen.queryByText("badges.limitExceeded")).not.toBeInTheDocument();
    expect(screen.getByText("9 / 10")).toHaveClass("text-amber-600");
  });

  it("shows no badge when usage is low", () => {
    render(<UsageStatsCard subscription={subscription(check(2, 10, true, 20))} />);
    expect(screen.queryByText("badges.nearLimit")).not.toBeInTheDocument();
    expect(screen.queryByText("badges.limitExceeded")).not.toBeInTheDocument();
    expect(screen.getByText("2 / 10")).toHaveClass("text-green-600");
  });
});
