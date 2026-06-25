/**
 * Tests for NewWhatsAppMessageDialog — the "start a new WhatsApp conversation"
 * compose flow. Verifies the gate (valid E.164 phone + opt-in), the send
 * payload (including opt_in_confirmed), success navigation to the wa_ chat id,
 * mapped error toasts, and the multi-account selector visibility.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

const mockToast = vi.fn();
const mockMutate = vi.fn();
const mockSelectChat = vi.fn();

let mockAccounts: Array<Record<string, unknown>> = [];

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/hooks/api/useSocial", () => ({
  useWhatsAppStatus: () => ({ data: { connected: true, accounts: mockAccounts } }),
  useSendWhatsAppTemplateMessage: () => ({ mutate: mockMutate, isPending: false }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/components/messages-beta/store/useMessagesBetaStore", () => ({
  useMessagesBetaStore: { getState: () => ({ selectChat: mockSelectChat }) },
}));

// Mock the account selector so the dialog test doesn't depend on radix Select internals.
vi.mock("@/components/social/WhatsAppAccountSelect", () => ({
  WhatsAppAccountSelect: () => <div data-testid="account-select" />,
}));

// Mock TemplateSelector: render the passed trigger + a control to fire onSelect.
vi.mock("@/components/social/TemplateSelector", () => ({
  default: ({
    trigger,
    disabled,
    onSelect,
  }: {
    trigger: React.ReactNode;
    disabled?: boolean;
    onSelect: (t: { id: number; name: string }, p: Record<string, string>) => void;
  }) => (
    <div>
      {trigger}
      <button
        type="button"
        data-testid="force-select"
        disabled={disabled}
        onClick={() => onSelect({ id: 7, name: "order_update" }, { param1: "Ann" })}
      >
        pick
      </button>
    </div>
  ),
}));

import { NewWhatsAppMessageDialog } from "@/components/messages-beta/sidebar/NewWhatsAppMessageDialog";

function account(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    waba_id: "waba1",
    business_name: "Amanati",
    phone_number: "+995322111111",
    display_phone_number: "+995 322 111 111",
    quality_rating: "GREEN",
    is_active: true,
    ...overrides,
  };
}

describe("NewWhatsAppMessageDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccounts = [account()];
  });

  async function fillValid(user: ReturnType<typeof userEvent.setup>) {
    await user.type(
      screen.getByPlaceholderText("+995555123456"),
      "+15551234567"
    );
    await user.click(screen.getByRole("checkbox"));
  }

  it("keeps the template trigger disabled until phone is valid and opt-in is checked", async () => {
    const user = userEvent.setup();
    render(<NewWhatsAppMessageDialog open onOpenChange={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "chooseTemplate" });
    expect(trigger).toBeDisabled();

    // Invalid phone keeps it disabled.
    await user.type(screen.getByPlaceholderText("+995555123456"), "12345");
    expect(trigger).toBeDisabled();
    await user.clear(screen.getByPlaceholderText("+995555123456"));

    await fillValid(user);
    expect(trigger).not.toBeDisabled();
  });

  it("sends the template with opt_in_confirmed and navigates to the new chat on success", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<NewWhatsAppMessageDialog open onOpenChange={onOpenChange} />);

    await fillValid(user);
    await user.click(screen.getByTestId("force-select"));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    const [payload, handlers] = mockMutate.mock.calls[0];
    expect(payload).toMatchObject({
      waba_id: "waba1",
      template_id: 7,
      to_number: "+15551234567",
      parameters: { param1: "Ann" },
      opt_in_confirmed: true,
    });

    const pushSpy = vi.spyOn(window.history, "pushState").mockImplementation(() => {});
    handlers.onSuccess();

    expect(mockSelectChat).toHaveBeenCalledWith("wa_waba1_15551234567");
    expect(pushSpy).toHaveBeenCalledWith(
      null,
      "",
      expect.stringContaining("/social/messages/wa_waba1_15551234567")
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows a mapped error toast when the send fails", async () => {
    const user = userEvent.setup();
    render(<NewWhatsAppMessageDialog open onOpenChange={vi.fn()} />);

    await fillValid(user);
    await user.click(screen.getByTestId("force-select"));

    const [, handlers] = mockMutate.mock.calls[0];
    handlers.onError({ response: { data: { error_code: "INVALID_WHATSAPP_NUMBER" } } });

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          description: "sendErrors.INVALID_WHATSAPP_NUMBER",
        })
      )
    );
  });

  it("falls back to the generic error for an unknown error code", async () => {
    const user = userEvent.setup();
    render(<NewWhatsAppMessageDialog open onOpenChange={vi.fn()} />);

    await fillValid(user);
    await user.click(screen.getByTestId("force-select"));

    const [, handlers] = mockMutate.mock.calls[0];
    handlers.onError({ response: { data: { error_code: "WAT_IS_THIS" } } });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "sendErrors.SEND_FAILED_GENERIC" })
    );
  });

  it("only shows the account selector when there is more than one active account", () => {
    const { rerender } = render(<NewWhatsAppMessageDialog open onOpenChange={vi.fn()} />);
    expect(screen.queryByTestId("account-select")).not.toBeInTheDocument();

    mockAccounts = [account(), account({ id: 2, waba_id: "waba2" })];
    rerender(<NewWhatsAppMessageDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByTestId("account-select")).toBeInTheDocument();
  });
});
