/**
 * Calls screen redesign: header bridge (SIP pill, New call, SIP settings),
 * tabs with counts → API filters, agent filter, search, day groups, rows
 * (direction badge, sub line, agent, duration, actions), expanded notes /
 * recording / meta, call back rules, toasts, empty / no-config states and
 * Load more. CallContext and the data hooks are mocked.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import React from "react";

import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";
import { HeaderActionsProvider, useHeaderSlot } from "@/contexts/HeaderActionsContext";

const mockUseCallLogs = vi.fn();
const mockCounts = vi.fn();
const mockToday = vi.fn();
const mockAgents = vi.fn();
const mockSaveNotes = vi.fn();
const mockFetchNext = vi.fn();
const mockOpenTicket = vi.fn();
const mockSetDialNumber = vi.fn();
const mockSetIsDialpadOpen = vi.fn();
let mockUser: { is_staff?: boolean; is_superuser?: boolean } = { is_staff: true };
let mockCall: Record<string, unknown> = {};

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/api/axios", () => ({ default: { get: vi.fn() } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock("@/contexts/TicketCreateContext", () => ({ useTicketCreate: () => ({ openTicketCreate: mockOpenTicket }) }));
vi.mock("@/contexts/CallContext", () => ({ useCall: () => mockCall }));
vi.mock("@/app/(tenant)/calls/_components/use-call-logs", () => ({
  useCallLogs: (filters: unknown, refresh: number) => mockUseCallLogs(filters, refresh),
  useCallTabCounts: (...args: unknown[]) => ({ data: mockCounts(...args) }),
  useTodaySummary: () => ({ data: mockToday() }),
  useCallAgents: () => ({ data: mockAgents() }),
  useSaveCallNotes: () => ({ mutateAsync: mockSaveNotes, isPending: false, variables: undefined }),
}));

import { CallsScreen } from "@/app/(tenant)/calls/_components/calls-screen";

const now = new Date();
const at = (daysAgo: number, h: number, m = 0) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, h, m);
  return d.toISOString();
};

const logs = [
  {
    id: 1,
    caller_number: "+995555000111",
    recipient_number: "100",
    direction: "inbound",
    status: "answered",
    started_at: at(0, 9, 5),
    answered_at: at(0, 9, 5),
    duration: "00:03:00",
    handled_by_name: "Mariam Lomidze",
    call_quality_score: 4,
    notes: "Asked about delivery",
    recording_url: "https://rec/1.wav",
    transferred_to: "",
    transferred_to_user_name: null,
    client_name: "Nino Beridze",
  },
  {
    id: 2,
    caller_number: "+995599000222",
    recipient_number: "100",
    direction: "inbound",
    status: "missed",
    started_at: at(0, 8, 0),
    answered_at: null,
    duration: null,
    handled_by_name: null,
    call_quality_score: null,
    notes: "",
    recording_url: "",
    transferred_to: "",
    transferred_to_user_name: null,
    client_name: null,
  },
  {
    id: 3,
    caller_number: "101",
    recipient_number: "+995322000333",
    direction: "outbound",
    status: "ended",
    started_at: at(1, 17, 30),
    answered_at: at(1, 17, 30),
    duration: "00:01:10",
    handled_by_name: "Giorgi Kapanadze",
    call_quality_score: null,
    notes: "",
    recording_url: "",
    transferred_to: "102",
    transferred_to_user_name: "Ana Lomidze",
    client_name: null,
  },
];

function Header() {
  const slot = useHeaderSlot();
  return (
    <div data-testid="header">
      <div data-testid="header-meta">{slot?.meta}</div>
      {slot?.primary}
      {slot?.icons}
    </div>
  );
}

function renderScreen(messages: Record<string, unknown> = en, locale = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HeaderActionsProvider>
        <Header />
        <CallsScreen />
      </HeaderActionsProvider>
    </NextIntlClientProvider>
  );
}

function logsResult(rows = logs, extra: Record<string, unknown> = {}) {
  return {
    data: { pages: [{ results: rows, count: rows.length, next: null }], pageParams: [1] },
    isLoading: false,
    isError: false,
    isPlaceholderData: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: mockFetchNext,
    refetch: vi.fn(),
    ...extra,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUser = { is_staff: true };
  mockCall = {
    activeCall: null,
    sipRegistered: true,
    sipConnecting: false,
    activeSipConfig: { username: "101" },
    loading: false,
    error: "",
    callEndedCounter: 0,
    isDialpadOpen: false,
    setDialNumber: mockSetDialNumber,
    setIsDialpadOpen: mockSetIsDialpadOpen,
  };
  mockUseCallLogs.mockReturnValue(logsResult());
  mockCounts.mockReturnValue({ all: 24, missed: 7, incoming: 16, outgoing: 0 });
  mockToday.mockReturnValue({ total: 4, missed: 1, avgSeconds: 144 });
  mockAgents.mockReturnValue([
    { id: 2, name: "Ana Lomidze" },
    { id: 3, name: "Mariam Lomidze" },
  ]);
  mockSaveNotes.mockResolvedValue({});
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CallsScreen — header bridge", () => {
  it("puts the SIP pill, New call and (admins) SIP settings into the app header", () => {
    renderScreen();
    const header = screen.getByTestId("header");
    const pill = within(screen.getByTestId("header-meta")).getByTestId("sip-status");
    expect(pill).toHaveAttribute("data-sip-state", "registered");
    expect(pill).toHaveTextContent("ext 101");
    expect(within(header).getByTestId("calls-new-call")).toHaveAccessibleName("New call");
    expect(within(header).getByTestId("calls-sip-settings")).toHaveAttribute("href", "/settings/calls");
  });

  it("agents get no SIP settings link", () => {
    mockUser = {};
    renderScreen();
    expect(screen.queryByTestId("calls-sip-settings")).toBeNull();
  });

  it("New call opens the softphone", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByTestId("calls-new-call"));
    expect(mockSetIsDialpadOpen).toHaveBeenCalledWith(true);
  });

  it("without a SIP configuration: no pill, a notice (admins can configure) and New call explains", async () => {
    const user = userEvent.setup();
    mockCall = { ...mockCall, activeSipConfig: null };
    renderScreen();
    expect(within(screen.getByTestId("header-meta")).queryByTestId("sip-status")).toBeNull();
    const notice = screen.getByTestId("calls-no-config");
    expect(within(notice).getByRole("link", { name: /Configure SIP/ })).toHaveAttribute("href", "/settings/calls");
    await user.click(screen.getByTestId("calls-new-call"));
    expect(mockSetIsDialpadOpen).not.toHaveBeenCalled();
    expect(screen.getByTestId("calls-toast")).toHaveTextContent(en.calls.page.noConfig);
  });

  it("shows CallContext errors while the softphone is closed", () => {
    mockCall = { ...mockCall, error: "SIP registration failed" };
    renderScreen();
    expect(screen.getByRole("alert")).toHaveTextContent("SIP registration failed");
  });
});

describe("CallsScreen — toolbar", () => {
  it("tabs show counts (hidden when 0) and drive the list filters", async () => {
    const user = userEvent.setup();
    renderScreen();
    expect(screen.getByTestId("calls-tab-all")).toHaveTextContent("All24");
    expect(screen.getByTestId("calls-tab-missed")).toHaveTextContent("Missed7");
    expect(screen.getByTestId("calls-tab-outgoing")).toHaveTextContent(/^Outgoing$/);
    expect(screen.getByTestId("calls-tab-all")).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByTestId("calls-tab-missed"));
    expect(screen.getByTestId("calls-tab-missed")).toHaveAttribute("aria-selected", "true");
    expect(mockUseCallLogs).toHaveBeenLastCalledWith({ tab: "missed", agentId: null, search: "" }, 0);
  });

  it("shows today's summary", () => {
    renderScreen();
    expect(screen.getByTestId("calls-summary")).toHaveTextContent("Today: 4 calls · 1 missed · avg 02:24");
  });

  it("search is debounced and numbers lose their spaces", () => {
    vi.useFakeTimers();
    renderScreen();
    fireEvent.change(screen.getByTestId("calls-search"), { target: { value: " +995 555 " } });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(mockUseCallLogs).toHaveBeenLastCalledWith({ tab: "all", agentId: null, search: "+995555" }, 0);
    expect(mockCounts).toHaveBeenLastCalledWith(null, "+995555", 0);
  });

  it("agent filter: dashed 'Agent +' until an agent is picked", async () => {
    const user = userEvent.setup();
    renderScreen();
    const trigger = screen.getByTestId("calls-agent-filter");
    expect(trigger).toHaveClass("border-dashed");
    await user.click(trigger);
    await user.click(await screen.findByRole("menuitem", { name: "Mariam Lomidze" }));
    expect(mockUseCallLogs).toHaveBeenLastCalledWith({ tab: "all", agentId: 3, search: "" }, 0);
    expect(screen.getByTestId("calls-agent-filter")).toHaveTextContent("AgentMariam Lomidze");
    expect(screen.getByTestId("calls-agent-filter")).not.toHaveClass("border-dashed");
    await user.click(screen.getByRole("button", { name: "All agents" }));
    expect(mockUseCallLogs).toHaveBeenLastCalledWith({ tab: "all", agentId: null, search: "" }, 0);
  });

  it("hides the agent filter when nobody has a phone", () => {
    mockAgents.mockReturnValue([]);
    renderScreen();
    expect(screen.queryByTestId("calls-agent-filter")).toBeNull();
  });

  it("refetches when a call ends (callEndedCounter)", () => {
    mockCall = { ...mockCall, callEndedCounter: 3 };
    renderScreen();
    expect(mockUseCallLogs).toHaveBeenLastCalledWith(expect.anything(), 3);
  });
});

describe("CallsScreen — list", () => {
  it("groups by day with counts", () => {
    renderScreen();
    const days = screen.getAllByTestId("calls-day");
    expect(days.map((d) => d.textContent)).toEqual(["Today2", "Yesterday1"]);
  });

  it("renders rows per the design", () => {
    renderScreen();
    const [named, missed, outbound] = screen.getAllByTestId("call-row");
    expect(within(named).getByTestId("call-name")).toHaveTextContent("Nino Beridze");
    expect(within(named).getByTestId("call-sub")).toHaveTextContent("+995555000111 · Answered");
    expect(named).toHaveTextContent("MLMariam Lomidze");
    expect(named).toHaveTextContent("03:00");
    expect(named.querySelector('[data-direction="inbound"]')).not.toBeNull();
    expect(within(named).getByTestId("row-play")).toHaveAccessibleName("Play recording");
    expect(within(named).getByTestId("row-notes").className).toContain("text-foreground");

    expect(within(missed).getByTestId("call-name")).toHaveTextContent("+995599000222");
    expect(within(missed).getByTestId("call-sub")).toHaveTextContent(/^Missed$/);
    expect(missed).toHaveTextContent("Unanswered");
    expect(missed).toHaveTextContent("—");
    expect(missed.querySelector('[data-direction="missed"]')).not.toBeNull();
    expect(within(missed).queryByTestId("row-play")).toBeNull();
    expect(within(missed).getByTestId("row-callback").className).toContain("text-ed-green");

    expect(outbound.querySelector('[data-direction="outbound"]')).not.toBeNull();
    expect(within(outbound).getByTestId("call-sub")).toHaveTextContent("Ended");
  });

  it("call back fills the softphone; blocked during a call", async () => {
    const user = userEvent.setup();
    const { unmount } = renderScreen();
    await user.click(within(screen.getAllByTestId("call-row")[1]).getByTestId("row-callback"));
    expect(mockSetDialNumber).toHaveBeenCalledWith("+995599000222");
    expect(mockSetIsDialpadOpen).toHaveBeenCalledWith(true);
    unmount();

    vi.clearAllMocks();
    mockUseCallLogs.mockReturnValue(logsResult());
    mockCall = { ...mockCall, activeCall: { id: "x" } };
    renderScreen();
    await user.click(within(screen.getAllByTestId("call-row")[1]).getByTestId("row-callback"));
    expect(mockSetDialNumber).not.toHaveBeenCalled();
    expect(screen.getByTestId("calls-toast")).toHaveTextContent("Finish the current call first");
  });

  it("expands a row: notes save, create ticket, recording player and meta", async () => {
    const user = userEvent.setup();
    renderScreen();
    const row = screen.getAllByTestId("call-row")[0];
    const toggle = within(row).getByRole("button", { expanded: false });
    await user.click(toggle);
    expect(within(row).getByRole("button", { expanded: true })).toBeInTheDocument();
    const details = within(row).getByTestId("call-details");
    const notes = within(details).getByLabelText("Notes");
    expect(notes).toHaveValue("Asked about delivery");
    expect(within(details).getByTestId("save-note")).toBeDisabled();
    await user.clear(notes);
    await user.type(notes, "Call back Friday");
    await user.click(within(details).getByTestId("save-note"));
    expect(mockSaveNotes).toHaveBeenCalledWith({ id: 1, notes: "Call back Friday" });
    expect(await screen.findByTestId("calls-toast")).toHaveTextContent("Note saved");

    await user.click(within(details).getByTestId("create-ticket"));
    expect(mockOpenTicket).toHaveBeenCalledTimes(1);

    expect(within(details).getByTestId("recording-player")).toHaveTextContent("00:00 / 03:00");
    expect(within(details).getByTestId("call-meta")).toHaveTextContent(/^Inbound · .* · Mariam Lomidze$/);
    expect(within(details).getByTestId("call-rating")).toHaveTextContent("Rated 4/5");
  });

  it("expanded row without recording says so and shows the transfer target", async () => {
    const user = userEvent.setup();
    renderScreen();
    const row = screen.getAllByTestId("call-row")[2];
    await user.click(within(row).getByRole("button", { expanded: false }));
    expect(within(row).getByText("No recording for this call.")).toBeInTheDocument();
    expect(within(row).getByText("Transferred to Ana Lomidze")).toBeInTheDocument();
  });

  it("failed note saves are reported", async () => {
    const user = userEvent.setup();
    mockSaveNotes.mockRejectedValue(new Error("x"));
    renderScreen();
    const row = screen.getAllByTestId("call-row")[1];
    await user.click(within(row).getByRole("button", { expanded: false }));
    await user.type(within(within(row).getByTestId("call-details")).getByLabelText("Notes"), "hi");
    await user.click(within(row).getByTestId("save-note"));
    expect(await screen.findByTestId("calls-toast")).toHaveTextContent("Couldn't save the note");
  });

  it("empty states: filtered vs no calls at all", async () => {
    const user = userEvent.setup();
    mockUseCallLogs.mockReturnValue(logsResult([]));
    renderScreen();
    expect(screen.getByTestId("calls-empty")).toHaveTextContent("No calls found");
    expect(screen.getByTestId("calls-empty")).toHaveTextContent(en.calls.page.emptyNone);
    await user.click(screen.getByTestId("calls-tab-missed"));
    expect(screen.getByTestId("calls-empty")).toHaveTextContent("Try another search or clear the filters.");
  });

  it("Load more fetches the next page", async () => {
    const user = userEvent.setup();
    mockUseCallLogs.mockReturnValue(logsResult(logs, { hasNextPage: true }));
    renderScreen();
    await user.click(screen.getByTestId("calls-load-more"));
    expect(mockFetchNext).toHaveBeenCalledTimes(1);
  });

  it("marks calls that appear after the first load as New", () => {
    const { rerender } = renderScreen();
    expect(screen.queryByText("New")).toBeNull();
    const fresh = { ...logs[1], id: 9, started_at: at(0, 10, 0) };
    mockUseCallLogs.mockReturnValue(logsResult([fresh, ...logs]));
    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <HeaderActionsProvider>
          <Header />
          <CallsScreen />
        </HeaderActionsProvider>
      </NextIntlClientProvider>
    );
    const rows = screen.getAllByTestId("call-row");
    expect(within(rows[0]).getByText("New")).toBeInTheDocument();
    expect(within(rows[1]).queryByText("New")).toBeNull();
  });

  it("renders in Georgian", () => {
    renderScreen(ka, "ka");
    expect(screen.getByTestId("calls-tab-missed")).toHaveTextContent(ka.calls.page.tabMissed);
    expect(screen.getAllByTestId("calls-day")[0]).toHaveTextContent(ka.calls.page.today);
    expect(screen.getByTestId("calls-new-call")).toHaveAccessibleName(ka.calls.page.newCall);
  });
});
