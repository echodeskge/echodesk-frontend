/**
 * Messages screen redesign: header bridge (Live pill + New WhatsApp), the
 * conversation-list toolbar (tabs, channel chips, History banner), the
 * profile rail sections (linked tickets, tags) and the small helpers.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import React from "react";

import en from "@/i18n/messages/en.json";
import { HeaderActionsProvider, useHeaderSlot } from "@/contexts/HeaderActionsContext";

const mockWaStatus = vi.fn();
const mockTickets = vi.fn();
const mockCreateTicket = vi.fn();
const mockPatchClient = vi.fn();
const mockProfile = vi.fn();
const mockToast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn(), error: vi.fn() }));

vi.mock("sonner", () => ({ toast: mockToast }));
vi.mock("@/hooks/api/useSocial", () => ({
  useWhatsAppStatus: () => ({ data: mockWaStatus() }),
  useMarkAllAsRead: () => ({ mutate: vi.fn(), isPending: false }),
  useArchiveAllConversations: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: () => ({ data: mockProfile() }) }));
vi.mock("@/hooks/api/useSocialClients", () => ({
  usePatchSocialClient: () => ({ mutate: mockPatchClient }),
}));
vi.mock("@/hooks/api/useConversationTickets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/api/useConversationTickets")>();
  return {
    ...actual,
    useConversationTickets: () => ({ data: mockTickets(), isLoading: false }),
    useCreateConversationTicket: () => ({ mutate: mockCreateTicket, isPending: false }),
  };
});
vi.mock("@/components/messages-beta/sidebar/NewWhatsAppMessageDialog", () => ({
  NewWhatsAppMessageDialog: ({ open }: { open: boolean }) => (open ? <div data-testid="wa-dialog" /> : null),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { MessagesHeaderBridge, liveState } from "@/components/messages-beta/MessagesHeaderBridge";
import { MessagesBetaSidebarHeader } from "@/components/messages-beta/sidebar/MessagesBetaSidebarHeader";
import { LinkedTicketsSection } from "@/components/messages-beta/client-rail/MessagesBetaClientRail";
import { ClientTagsEditor } from "@/components/chat/client-rail-sections";
import { bubbleTime } from "@/components/chat/message-bubble";
import { useMessagesBetaStore } from "@/components/messages-beta/store/useMessagesBetaStore";
import type { ConversationRow } from "@/components/messages-beta/store/types";
import { canCreateTickets } from "@/hooks/api/useConversationTickets";
import { dayLabel } from "@/components/messages-beta/thread-dates";

const conversation: ConversationRow = {
  id: "wa_waba1_995555",
  platform: "whatsapp",
  accountId: "waba1",
  conversationKey: "995555",
  name: "Nino",
  lastMessage: null,
  unreadCount: 0,
};

function withIntl(node: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {node}
    </NextIntlClientProvider>
  );
}

function Header() {
  const slot = useHeaderSlot();
  return (
    <header>
      <div data-testid="crumb">{slot?.breadcrumb}</div>
      <div data-testid="primary">{slot?.primary}</div>
    </header>
  );
}

const ticketPerms = {
  is_staff: false,
  feature_keys: ["ticket_management"],
  permissions_list: ["create_tickets"],
};

beforeEach(() => {
  useMessagesBetaStore.getState().reset();
  mockWaStatus.mockReset().mockReturnValue(undefined);
  mockTickets.mockReset().mockReturnValue([]);
  mockCreateTicket.mockReset();
  mockPatchClient.mockReset();
  mockProfile.mockReset().mockReturnValue(ticketPerms);
  Object.values(mockToast).forEach((fn) => fn.mockReset());
});

describe("liveState", () => {
  it("maps socket states to the pill", () => {
    expect(liveState("open")).toBe("live");
    expect(liveState("connecting")).toBe("reconnecting");
    expect(liveState("reconnecting")).toBe("reconnecting");
    expect(liveState("down")).toBe("offline");
    expect(liveState("idle")).toBe("offline");
  });
});

describe("MessagesHeaderBridge", () => {
  it("puts the Live pill in the header and follows the socket", () => {
    render(
      withIntl(
        <HeaderActionsProvider>
          <Header />
          <MessagesHeaderBridge platforms={["whatsapp", "facebook"]} />
        </HeaderActionsProvider>
      )
    );
    expect(screen.getByTestId("messages-live-pill")).toHaveAttribute("data-state", "offline");
    act(() => useMessagesBetaStore.getState().setWsState("open"));
    expect(screen.getByTestId("messages-live-pill")).toHaveAttribute("data-state", "live");
    expect(screen.getByTestId("messages-live-pill")).toHaveTextContent(en.messagesBeta.page.live);
    // No active WhatsApp account → no compose CTA.
    expect(screen.queryByTestId("messages-new-whatsapp")).toBeNull();
  });

  it("shows New WhatsApp when an account is active and opens the dialog", () => {
    mockWaStatus.mockReturnValue({ accounts: [{ is_active: true }] });
    render(
      withIntl(
        <HeaderActionsProvider>
          <Header />
          <MessagesHeaderBridge platforms={["whatsapp"]} />
        </HeaderActionsProvider>
      )
    );
    fireEvent.click(screen.getByTestId("messages-new-whatsapp"));
    expect(screen.getByTestId("wa-dialog")).toBeInTheDocument();
  });
});

describe("MessagesBetaSidebarHeader", () => {
  it("channel chips filter by platform and toggle off again", () => {
    render(withIntl(<MessagesBetaSidebarHeader platforms={["facebook", "whatsapp"]} showTabs assignedCount={2} />));
    const wa = screen.getByRole("button", { name: "Show only WhatsApp" });
    fireEvent.click(wa);
    expect(useMessagesBetaStore.getState().platformFilter).toBe("whatsapp");
    expect(wa).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(wa);
    expect(useMessagesBetaStore.getState().platformFilter).toBeNull();
  });

  it("tabs switch the assignment tab and show the assigned count", () => {
    render(withIntl(<MessagesBetaSidebarHeader platforms={["facebook"]} showTabs assignedCount={3} />));
    const assigned = screen.getByRole("tab", { name: /Assigned to Me/ });
    expect(assigned).toHaveTextContent("3");
    fireEvent.click(assigned);
    expect(useMessagesBetaStore.getState().assignmentTab).toBe("assigned");
  });

  it("History toggles the archived view with the amber banner", () => {
    render(withIntl(<MessagesBetaSidebarHeader platforms={["facebook"]} showTabs={false} assignedCount={0} />));
    fireEvent.click(screen.getByRole("button", { name: en.messagesBeta.sidebar.viewHistory }));
    expect(useMessagesBetaStore.getState().showArchived).toBe(true);
    expect(screen.getByText(en.messagesBeta.sidebar.viewingHistory)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: en.messagesBeta.sidebar.back }));
    expect(useMessagesBetaStore.getState().showArchived).toBe(false);
  });
});

describe("LinkedTicketsSection", () => {
  it("lists linked tickets with links", () => {
    mockTickets.mockReturnValue([{ id: 41, title: "Refund request" }]);
    render(withIntl(<LinkedTicketsSection conversation={conversation} />));
    expect(screen.getByRole("link", { name: /#41.*Refund request/ })).toHaveAttribute("href", "/tickets/41");
  });

  it("creates a ticket for the conversation", () => {
    render(withIntl(<LinkedTicketsSection conversation={conversation} />));
    fireEvent.click(screen.getByTestId("rail-create-ticket"));
    expect(mockCreateTicket).toHaveBeenCalledWith(
      { platform: "whatsapp", conversation_id: "995555", account_id: "waba1" },
      expect.any(Object)
    );
    const { onSuccess } = mockCreateTicket.mock.calls[0][1];
    onSuccess({ ticket: { id: 7, title: "x" }, created: false });
    expect(mockToast.info).toHaveBeenCalledWith("This conversation is already linked to ticket #7");
  });

  it("hides Create ticket without the permission", () => {
    mockProfile.mockReturnValue({ ...ticketPerms, permissions_list: [] });
    render(withIntl(<LinkedTicketsSection conversation={conversation} />));
    expect(screen.queryByTestId("rail-create-ticket")).toBeNull();
  });
});

describe("ClientTagsEditor", () => {
  it("adds and removes tags through PATCH", async () => {
    render(withIntl(<ClientTagsEditor clientId={5} tags={["vip"]} />));
    fireEvent.click(screen.getByRole("button", { name: /Add/ }));
    const input = screen.getByLabelText(en.messagesBeta.rail.tagPlaceholder);
    fireEvent.change(input, { target: { value: "wholesale" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockPatchClient).toHaveBeenCalledWith({ id: 5, data: { tags: ["vip", "wholesale"] } }, expect.any(Object));
    await waitFor(() => expect(screen.getByText("wholesale")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Remove tag vip" }));
    expect(mockPatchClient).toHaveBeenLastCalledWith({ id: 5, data: { tags: ["wholesale"] } }, expect.any(Object));
  });
});

describe("helpers", () => {
  it("canCreateTickets needs the feature and the permission (staff bypass)", () => {
    expect(canCreateTickets(ticketPerms)).toBe(true);
    expect(canCreateTickets({ ...ticketPerms, feature_keys: [] })).toBe(false);
    expect(canCreateTickets({ ...ticketPerms, permissions_list: [] })).toBe(false);
    expect(canCreateTickets({ is_staff: true, feature_keys: '["ticket_management"]' })).toBe(true);
    expect(canCreateTickets(null)).toBe(false);
  });

  it("dayLabel: today / yesterday / Georgian month names", () => {
    const now = new Date(2026, 10, 8, 12);
    const labels = { today: "Today", yesterday: "Yesterday" };
    expect(dayLabel(new Date(2026, 10, 8, 9), "en", labels, now)).toBe("Today");
    expect(dayLabel(new Date(2026, 10, 7, 23), "en", labels, now)).toBe("Yesterday");
    expect(dayLabel(new Date(2026, 2, 12), "ka", labels, now)).toBe("12 მარტი");
    expect(dayLabel(new Date(2025, 2, 12), "ka", labels, now)).toBe("12 მარტი 2025");
  });

  it("bubbleTime: numeric, no English relative text", () => {
    const now = new Date(2026, 10, 8, 12);
    expect(bubbleTime(new Date(2026, 10, 8, 9, 5), now)).toBe("09:05");
    expect(bubbleTime(new Date(2026, 10, 7, 14, 4), now)).toBe("07.11 14:04");
    expect(bubbleTime(new Date(2025, 0, 2, 8, 0), now)).toBe("02.01.2025 08:00");
  });
});
