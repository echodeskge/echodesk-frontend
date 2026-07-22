/**
 * Tests for StaleAssignmentReminder — the app-wide popup about assigned
 * chats with no recent activity, gated by the admin social setting.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import type {
  UnifiedConversation,
  PaginatedUnifiedConversation,
} from "@/api/generated/interfaces";

const mockPush = vi.fn();
const mockRetrieve = vi.fn();
const mockEndSession = vi.fn();
const mockUnassign = vi.fn();
const mockEndWidget = vi.fn();

let mockSettings: Record<string, unknown> | undefined;

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: 5, email: "agent@test.com" } }),
}));

vi.mock("@/hooks/api/useSocial", () => ({
  socialKeys: {
    all: ["social"],
    staleReminder: () => ["social", "stale-reminder"],
  },
  useSocialSettings: () => ({ data: mockSettings }),
  useEndSession: () => ({ mutateAsync: mockEndSession }),
  useUnassignChat: () => ({ mutateAsync: mockUnassign }),
  useEndWidgetSession: () => ({ mutateAsync: mockEndWidget }),
}));

vi.mock("@/api/generated", () => ({
  socialConversationsRetrieve: (...args: unknown[]) => mockRetrieve(...args),
}));

import { StaleAssignmentReminder } from "@/components/social/StaleAssignmentReminder";

const STALE_TIME = new Date(Date.now() - 90 * 60_000).toISOString();

function makeConversation(
  overrides: Partial<UnifiedConversation> = {}
): UnifiedConversation {
  return {
    conversation_id: "fb_page_1_cust_1",
    platform: "facebook",
    sender_id: "cust_1",
    sender_name: "Alice",
    last_message: {
      id: "1",
      text: "hello",
      timestamp: STALE_TIME,
      is_from_business: false,
      platform_message_id: "mid_1",
    },
    message_count: 1,
    unread_count: 0,
    account_name: "Test Page",
    account_id: "page_1",
    assignment_status: "in_session",
    session_started_at: STALE_TIME,
    ...overrides,
  };
}

function mockList(rows: UnifiedConversation[]) {
  const page: PaginatedUnifiedConversation = {
    count: rows.length,
    next: null as unknown as string,
    previous: null as unknown as string,
    results: rows,
  };
  mockRetrieve.mockResolvedValue(page);
}

function renderReminder() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <StaleAssignmentReminder />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  mockSettings = {
    stale_assignment_reminder_enabled: true,
    stale_assignment_reminder_minutes: 60,
    session_management_enabled: true,
  };
});

describe("StaleAssignmentReminder", () => {
  it("renders nothing and never polls when the setting is disabled", async () => {
    mockSettings = { stale_assignment_reminder_enabled: false };
    renderReminder();

    await new Promise((r) => setTimeout(r, 50));
    expect(mockRetrieve).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the dialog when a stale assigned chat appears", async () => {
    mockList([makeConversation()]);
    renderReminder();

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(mockRetrieve).toHaveBeenCalledWith(
      undefined, true, undefined, undefined, 1, 50
    );
  });

  it("does not include fresh chats", async () => {
    const fresh = makeConversation({
      conversation_id: "fb_page_1_fresh",
      sender_name: "Fresh Bob",
      last_message: {
        ...makeConversation().last_message,
        timestamp: new Date().toISOString(),
      },
      session_started_at: new Date().toISOString(),
    });
    mockList([makeConversation(), fresh]);
    renderReminder();

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.queryByText("Fresh Bob")).not.toBeInTheDocument();
  });

  it("Open chat navigates to the conversation and closes", async () => {
    mockList([makeConversation()]);
    const user = userEvent.setup();
    renderReminder();

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /openChat/ }));

    expect(mockPush).toHaveBeenCalledWith("/social/messages/fb_page_1_cust_1");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });

  it("ends the session with the assignment key and auto-closes when empty", async () => {
    mockEndSession.mockResolvedValue({});
    mockList([makeConversation()]);
    const user = userEvent.setup();
    renderReminder();

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "endSession" }));

    expect(mockEndSession).toHaveBeenCalledWith({
      platform: "facebook",
      conversation_id: "cust_1",
      account_id: "page_1",
    });
    // The only stale chat was handled → popup auto-closes.
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });

  it("falls back to unassign when session management is disabled", async () => {
    mockSettings = {
      stale_assignment_reminder_enabled: true,
      stale_assignment_reminder_minutes: 60,
      session_management_enabled: false,
    };
    mockUnassign.mockResolvedValue({});
    mockList([makeConversation()]);
    const user = userEvent.setup();
    renderReminder();

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "unassign" }));

    expect(mockUnassign).toHaveBeenCalledWith({
      platform: "facebook",
      conversation_id: "cust_1",
      account_id: "page_1",
    });
    expect(mockEndSession).not.toHaveBeenCalled();
  });

  it("routes widget rows to the widget end-session endpoint", async () => {
    mockEndWidget.mockResolvedValue({ status: "ok" });
    mockList([
      makeConversation({
        platform: "widget",
        conversation_id: "widget_3_abc_def",
        sender_id: "visitor_9",
        account_id: "3",
        session_ended_at: undefined,
      }),
    ]);
    const user = userEvent.setup();
    renderReminder();

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "endSession" }));

    expect(mockEndWidget).toHaveBeenCalledWith({
      connection_id: 3,
      session_id: "abc_def",
    });
  });

  it("snooze persists to localStorage and suppresses re-open on remount", async () => {
    mockList([makeConversation()]);
    const user = userEvent.setup();
    const { unmount } = renderReminder();

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "snooze" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    const stored = window.localStorage.getItem("stale_reminder_snoozed_until_5");
    expect(Number(stored)).toBeGreaterThan(Date.now());

    unmount();
    renderReminder();
    await waitFor(() => expect(mockRetrieve).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("dismiss closes and does not immediately re-open for the same stale set", async () => {
    mockList([makeConversation()]);
    const user = userEvent.setup();
    renderReminder();

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "dismiss" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
