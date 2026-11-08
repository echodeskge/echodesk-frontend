/**
 * TemplateSelector `initialTemplateName`: opening the picker preselects the
 * approved template with that name, so "Use Template" is enabled at once.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

vi.mock("@/hooks/api/useSocial", () => ({
  useWhatsAppStatus: () => ({ data: { accounts: [{ waba_id: "waba1" }] } }),
  useWhatsAppTemplates: () => ({
    data: [
      { id: 1, name: "welcome", status: "APPROVED", language: "en", category: "UTILITY", components: [{ type: "BODY", text: "Hi there" }] },
      { id: 2, name: "order_update", status: "APPROVED", language: "en", category: "UTILITY", components: [{ type: "BODY", text: "Your order shipped" }] },
    ],
    isLoading: false,
  }),
}));

import TemplateSelector from "@/components/social/TemplateSelector";

function renderSelector(initialTemplateName?: string) {
  const onSelect = vi.fn();
  render(
    <TemplateSelector
      onSelect={onSelect}
      initialTemplateName={initialTemplateName}
      trigger={<button type="button">open</button>}
    />
  );
  return onSelect;
}

describe("TemplateSelector initialTemplateName", () => {
  it("preselects the named template when opened", async () => {
    const user = userEvent.setup();
    const onSelect = renderSelector("order_update");
    await user.click(screen.getByRole("button", { name: "open" }));
    const use = await screen.findByRole("button", { name: /Use Template/ });
    expect(use).toBeEnabled();
    await user.click(use);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 2, name: "order_update" }), {});
  });

  it("selects nothing without it", async () => {
    const user = userEvent.setup();
    renderSelector();
    await user.click(screen.getByRole("button", { name: "open" }));
    expect(await screen.findByRole("button", { name: /Use Template/ })).toBeDisabled();
  });
});
