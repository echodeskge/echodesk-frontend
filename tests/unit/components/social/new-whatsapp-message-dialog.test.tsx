/**
 * Tests for NewWhatsAppMessageDialog — the "start a new WhatsApp conversation"
 * compose flow. WhatsApp only delivers free-form inside the 24h window, so the
 * dialog branches on the window:
 *  - window closed/new  → template + opt-in confirmation
 *  - window open        → free-form composer
 * Verifies both branches, payloads, success navigation, and mapped errors.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

const mockToast = vi.fn();
const mockSendTemplate = vi.fn();
const mockSendFreeform = vi.fn();
const mockSelectChat = vi.fn();

let mockAccounts: Array<Record<string, unknown>> = [];
let mockWindowOpen = false;

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/hooks/api/useSocial", () => ({
  useWhatsAppStatus: () => ({ data: { connected: true, accounts: mockAccounts } }),
  useSendWhatsAppTemplateMessage: () => ({ mutate: mockSendTemplate, isPending: false }),
  useSendWhatsAppMessage: () => ({ mutate: mockSendFreeform, isPending: false }),
  useMessagingWindow: () => ({
    data: { window_open: mockWindowOpen },
    isSuccess: true,
    isLoading: false,
    isFetching: false,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/components/messages-beta/store/useMessagesBetaStore", () => ({
  useMessagesBetaStore: { getState: () => ({ selectChat: mockSelectChat }) },
}));

vi.mock("@/components/social/WhatsAppAccountSelect", () => ({
  WhatsAppAccountSelect: () => <div data-testid="account-select" />,
}));

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

async function typePhone(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText("+995555123456"), "+15551234567");
}

describe("NewWhatsAppMessageDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccounts = [account()];
    mockWindowOpen = false;
  });

  describe("closed window (new number) → template + opt-in", () => {
    it("keeps the template trigger disabled until opt-in is checked", async () => {
      const user = userEvent.setup();
      render(<NewWhatsAppMessageDialog open onOpenChange={vi.fn()} />);
      await typePhone(user);

      // Branch appears after the debounce + window resolves.
      const trigger = await screen.findByRole("button", { name: "chooseTemplate" });
      expect(trigger).toBeDisabled();

      await user.click(screen.getByRole("checkbox"));
      expect(trigger).not.toBeDisabled();
    });

    it("sends the template with opt_in_confirmed and navigates on success", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<NewWhatsAppMessageDialog open onOpenChange={onOpenChange} />);
      await typePhone(user);

      await screen.findByRole("button", { name: "chooseTemplate" });
      await user.click(screen.getByRole("checkbox"));
      await user.click(screen.getByTestId("force-select"));

      expect(mockSendTemplate).toHaveBeenCalledTimes(1);
      const [payload, handlers] = mockSendTemplate.mock.calls[0];
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

    it("shows a mapped error toast when the template send fails", async () => {
      const user = userEvent.setup();
      render(<NewWhatsAppMessageDialog open onOpenChange={vi.fn()} />);
      await typePhone(user);

      await screen.findByRole("button", { name: "chooseTemplate" });
      await user.click(screen.getByRole("checkbox"));
      await user.click(screen.getByTestId("force-select"));

      const [, handlers] = mockSendTemplate.mock.calls[0];
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
  });

  describe("open window (recent contact) → free-form", () => {
    beforeEach(() => {
      mockWindowOpen = true;
    });

    it("shows a free-form composer and sends free text on success", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<NewWhatsAppMessageDialog open onOpenChange={onOpenChange} />);
      await typePhone(user);

      const textarea = await screen.findByPlaceholderText("messagePlaceholder");
      // No template/opt-in path in the open-window branch.
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

      await user.type(textarea, "Hi there");
      await user.click(screen.getByRole("button", { name: "send" }));

      expect(mockSendFreeform).toHaveBeenCalledTimes(1);
      const [payload, handlers] = mockSendFreeform.mock.calls[0];
      expect(payload).toEqual({
        to_number: "+15551234567",
        message: "Hi there",
        waba_id: "waba1",
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
  });

  it("only shows the account selector when there is more than one active account", () => {
    const { rerender } = render(<NewWhatsAppMessageDialog open onOpenChange={vi.fn()} />);
    expect(screen.queryByTestId("account-select")).not.toBeInTheDocument();

    mockAccounts = [account(), account({ id: 2, waba_id: "waba2" })];
    rerender(<NewWhatsAppMessageDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByTestId("account-select")).toBeInTheDocument();
  });
});
