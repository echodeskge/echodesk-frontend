/**
 * InstagramMessagingHealthAlert — warns when an active Instagram account has
 * "Allow access to messages" turned off (backend messaging_status).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    values ? `${key} ${Object.values(values).join(" ")}` : key,
}));

import { InstagramMessagingHealthAlert } from "@/components/social/InstagramMessagingHealthAlert";

describe("InstagramMessagingHealthAlert", () => {
  it("renders nothing when every account is healthy or unchecked", () => {
    const { container } = render(
      <InstagramMessagingHealthAlert
        accounts={[
          { id: 1, username: "a", is_active: true, messaging_status: "ok" },
          { id: 2, username: "b", is_active: true, messaging_status: "unknown" },
          { id: 3, username: "c", is_active: true },
        ]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("ignores inactive accounts", () => {
    const { container } = render(
      <InstagramMessagingHealthAlert
        accounts={[{ id: 1, username: "old", is_active: false, messaging_status: "messaging_disabled" }]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the enable steps for a disabled account and rechecks", async () => {
    const onRecheck = vi.fn();
    render(
      <InstagramMessagingHealthAlert
        accounts={[{ id: 1, username: "nitchiani.shop", is_active: true, messaging_status: "messaging_disabled" }]}
        onRecheck={onRecheck}
      />,
    );
    const alert = screen.getByTestId("instagram-messaging-disabled");
    expect(alert).toHaveTextContent("disabledTitle @nitchiani.shop");
    for (const step of ["step1", "step2", "step3", "step4", "step5"]) {
      expect(alert).toHaveTextContent(`steps.${step}`);
    }
    await userEvent.click(screen.getByRole("button", { name: /recheck/ }));
    expect(onRecheck).toHaveBeenCalledOnce();
  });

  it("shows a generic error with Meta's message", () => {
    render(
      <InstagramMessagingHealthAlert
        accounts={[{ id: 1, username: "shop", is_active: true, messaging_status: "error", messaging_error: "Token expired" }]}
      />,
    );
    expect(screen.getByTestId("instagram-messaging-error")).toHaveTextContent("@shop: Token expired");
  });

  it("has every string in both en and ka", () => {
    const keys = (o: Record<string, unknown>, prefix = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        typeof v === "object" && v !== null ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
      );
    const enKeys = keys(en.social.instagramHealth).sort();
    expect(enKeys).toEqual(keys(ka.social.instagramHealth).sort());
    expect(enKeys).toContain("steps.step4");
    expect(en.social.instagramHealth.steps.step4).toContain("Allow access to messages");
    expect(ka.social.instagramHealth.steps.step4).toContain("Allow access to messages");
  });
});
