/**
 * The inbox chips and avatar badges show the channel's own glyph
 * (Messenger / Instagram / WhatsApp / Telegram), not generic lucide shapes.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { ChannelBadge, PLATFORM_ICON } from "@/components/messages-beta/platform-visuals";

describe("platform-visuals", () => {
  it.each([
    ["facebook", "icon-messenger"],
    ["instagram", "icon-instagram"],
    ["whatsapp", "icon-whatsapp"],
    ["telegram", "icon-telegram"],
    ["email", "icon-mail"],
    ["widget", "icon-widget"],
  ] as const)("%s renders its brand glyph", (platform, testId) => {
    const Icon = PLATFORM_ICON[platform];
    const { getByTestId } = render(<Icon className="h-3 w-3" strokeWidth={2} />);
    expect(getByTestId(testId).tagName.toLowerCase()).toBe("svg");
  });

  it("ChannelBadge uses the same glyph", () => {
    const { getByTestId } = render(<ChannelBadge platform="whatsapp" />);
    expect(getByTestId("icon-whatsapp")).toBeTruthy();
  });
});
