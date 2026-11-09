/**
 * FE-03: the tenant layout after the tickets shell clean-up.
 *
 * - no board switcher, header search or collaboration indicators on /tickets;
 * - the layout no longer opens the ticket board socket (FE-02's wrapper does);
 * - the global "+" still opens the create sheet with no board;
 * - TicketCreateSheet, BoardAdminHost and IncomingCallSidebar stay mounted;
 * - notifications still route ticket_id -> /tickets/{id};
 * - BoardContext follows /tickets?board= and falls back to an accessible board;
 * - the layout imports useBoardsLite, not @/hooks/useBoards (F16).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import fs from "node:fs";
import path from "node:path";

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }),
});

const pass = vi.hoisted(() => ({ children }: { children: unknown }) => children as never);
const h = vi.hoisted(() => ({
  pathname: "/tickets",
  search: "",
  push: vi.fn(),
  replace: vi.fn(),
  openTicketCreate: vi.fn(),
  boardSocket: vi.fn(),
  boards: [
    { id: 1, name: "Support", color: "#3b82f6", position: 0, is_default: false, open_count: 1, columns_count: 1 },
    { id: 7, name: "Sales", color: "#f59e0b", position: 1, is_default: true, open_count: 2, columns_count: 1 },
  ] as Array<Record<string, unknown>> | undefined,
  boardsLiteOpts: [] as unknown[],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.push, replace: h.replace, prefetch: vi.fn() }),
  usePathname: () => h.pathname,
  useSearchParams: () => new URLSearchParams(h.search),
}));
vi.mock("next/dynamic", async () => {
  const R = await import("react");
  return {
    default: (loader: () => Promise<unknown>) => {
      const Lazy = R.lazy(async () => {
        const mod = (await loader()) as { default?: React.ComponentType } | React.ComponentType;
        return { default: ((mod as { default?: React.ComponentType }).default ?? mod) as React.ComponentType };
      });
      return (props: Record<string, unknown>) =>
        R.createElement(R.Suspense, { fallback: null }, R.createElement(Lazy, props));
    },
  };
});
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/hooks/useTicketBoardWebSocket", () => ({
  useTicketBoardWebSocket: (...args: unknown[]) => {
    h.boardSocket(...args);
    return { isConnected: false, activeUsers: [] };
  },
}));
vi.mock("@/hooks/useBoards", () => ({
  useBoards: () => {
    throw new Error("layout must not use @/hooks/useBoards");
  },
}));
vi.mock("@/app/(tenant)/tickets/_hooks/use-boards-lite", () => ({
  useBoardsLite: (opts: unknown) => {
    h.boardsLiteOpts.push(opts);
    return { data: h.boards };
  },
  useViewCounts: () => ({ data: undefined }),
}));

vi.mock("@/contexts/SubscriptionContext", () => ({
  SubscriptionProvider: pass,
  useSubscription: () => ({ hasFeature: () => true, subscription: null, loading: false }),
}));
vi.mock("@/contexts/CallContext", () => ({ CallProvider: pass }));
vi.mock("@/contexts/IncomingCallSidebarContext", () => ({ IncomingCallSidebarProvider: pass }));
vi.mock("@/contexts/TicketCreateContext", () => ({
  TicketCreateProvider: pass,
  useTicketCreate: () => ({ openTicketCreate: h.openTicketCreate }),
}));
vi.mock("@/contexts/BugReportContext", () => ({
  BugReportProvider: pass,
  useBugReport: () => ({ openBugReport: vi.fn() }),
}));
vi.mock("@/components/tickets-admin/board-admin-host", () => ({
  BoardAdminHost: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="board-admin-host">{children}</div>
  ),
  useBoardAdmin: () => ({
    openCreateBoard: vi.fn(),
    openEditColumns: vi.fn(),
    openManageUsers: vi.fn(),
    openBoardSettings: vi.fn(),
    gates: { canCreateBoard: false, canEditColumns: false, canManageUsers: false, canOpenSettings: false },
  }),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1, is_staff: true, is_superuser: false }, logout: vi.fn() }),
}));
vi.mock("@/contexts/TenantContext", () => ({
  useTenant: () => ({
    tenant: { schema_name: "demo", tenant_name: "Demo", api_url: "http://demo.api.lvh.me:8010", theme: {} },
    loading: false,
  }),
}));
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ setAppearance: vi.fn(), resolvedMode: "light", setMode: vi.fn(), mode: "light" }),
}));
vi.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: () => ({
    data: { id: 1, first_name: "A", last_name: "B", email: "a@b.c", is_staff: true, feature_keys: ["ticket_management"] },
    isLoading: false,
  }),
}));
vi.mock("@/hooks/api", () => ({
  useReactivateSubscription: () => ({ mutateAsync: vi.fn() }),
  useDashboardAppearance: () => ({ data: undefined, isLoading: false }),
}));
vi.mock("@/hooks/api/useSocial", () => ({
  useSocialSettings: () => ({ data: undefined }),
  useUnreadMessagesCount: () => ({ data: undefined }),
}));
vi.mock("@/hooks/useMessagesWebSocket", () => ({ useMessagesWebSocket: vi.fn() }));
vi.mock("@/utils/notificationSound", () => ({
  getNotificationSound: () => ({ isEnabled: () => true, updateSettings: vi.fn(), toggle: () => true, playForPlatform: vi.fn() }),
}));
vi.mock("@/services/permissionService", () => ({
  getSidebarMenuItems: (_u: unknown, items: unknown[]) => items,
}));
vi.mock("@/components/AppSidebar", () => ({ AppSidebar: () => <nav data-testid="app-sidebar" /> }));
vi.mock("@/components/MessengerBell", () => ({ MessengerBell: () => null }));
vi.mock("@/components/NotificationBell", () => ({
  NotificationBell: ({ onNotificationClick }: { onNotificationClick: (n: unknown) => void }) => (
    <button data-testid="notif" onClick={() => onNotificationClick({ ticket_id: 42 })} />
  ),
}));
vi.mock("@/components/TicketCreateSheet", () => ({ TicketCreateSheet: () => <div data-testid="ticket-create-sheet" /> }));
vi.mock("@/components/BugReportDialog", () => ({ BugReportDialog: () => null }));
vi.mock("@/components/TeamChat", () => ({ TeamChatWidget: () => null }));
vi.mock("@/components/calls/DialpadWidget", () => ({ default: () => null }));
vi.mock("@/components/calls/IncomingCallSidebar", () => ({
  IncomingCallSidebar: () => <div data-testid="incoming-call-sidebar" />,
}));
vi.mock("@/components/PushNotificationPrompt", () => ({ PushNotificationPrompt: () => null }));
vi.mock("@/components/social/StaleAssignmentReminder", () => ({ default: () => null }));
vi.mock("@/components/BoardSwitcher", () => ({ default: () => <div data-testid="legacy-board-switcher" /> }));
vi.mock("@/components/BoardStatusEditor", () => ({ default: () => <div data-testid="legacy-modal" /> }));
vi.mock("@/components/BoardUserManager", () => ({ default: () => <div data-testid="legacy-modal" /> }));
vi.mock("@/components/BoardCreateSheet", () => ({ BoardCreateSheet: () => <div data-testid="legacy-modal" /> }));
vi.mock("@/api/axios", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  default: { get: vi.fn().mockResolvedValue({ data: { connected: false } }) },
}));

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TenantLayout from "@/app/(tenant)/layout";
import { useBoard } from "@/contexts/BoardContext";

function BoardProbe() {
  const { selectedBoardId } = useBoard();
  return <div data-testid="board-probe">{String(selectedBoardId)}</div>;
}

function renderLayout() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TenantLayout>
        <BoardProbe />
      </TenantLayout>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  h.pathname = "/tickets";
  h.search = "";
  h.push.mockClear();
  h.openTicketCreate.mockClear();
  h.boardSocket.mockClear();
  h.boardsLiteOpts.length = 0;
  h.boards = [
    { id: 1, name: "Support", color: "#3b82f6", position: 0, is_default: false, open_count: 1, columns_count: 1 },
    { id: 7, name: "Sales", color: "#f59e0b", position: 1, is_default: true, open_count: 2, columns_count: 1 },
  ];
});

describe("tenant layout (FE-03 shell)", () => {
  it("renders no board switcher, header search or collaboration indicators on /tickets", async () => {
    renderLayout();
    await screen.findByTestId("board-probe");
    expect(screen.queryByTestId("legacy-board-switcher")).toBeNull();
    expect(screen.queryByPlaceholderText("searchTickets")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(document.querySelector("header")?.textContent ?? "").not.toMatch(/active|viewing/i);
  });

  it("no longer opens the ticket board socket", async () => {
    renderLayout();
    await screen.findByTestId("board-probe");
    expect(h.boardSocket).not.toHaveBeenCalled();
  });

  it("the global + still calls openTicketCreate() with no board", async () => {
    renderLayout();
    fireEvent.click(await screen.findByLabelText("createTask"));
    expect(h.openTicketCreate).toHaveBeenCalledTimes(1);
    expect(h.openTicketCreate).toHaveBeenCalledWith();
  });

  it("keeps TicketCreateSheet, BoardAdminHost and IncomingCallSidebar mounted, without the old modals", async () => {
    renderLayout();
    expect(await screen.findByTestId("ticket-create-sheet")).toBeInTheDocument();
    expect(await screen.findByTestId("incoming-call-sidebar")).toBeInTheDocument();
    // The host wraps the whole shell, so the sidebar can reach useBoardAdmin().
    const host = screen.getByTestId("board-admin-host");
    expect(host).toContainElement(screen.getByTestId("app-sidebar"));
    expect(screen.queryByTestId("legacy-modal")).toBeNull();
  });

  it("still routes a notification's ticket_id to /tickets/{id}", async () => {
    renderLayout();
    fireEvent.click(await screen.findByTestId("notif"));
    expect(h.push).toHaveBeenCalledWith("/tickets/42");
  });

  it("syncs BoardContext from /tickets?board=", async () => {
    h.search = "board=1";
    renderLayout();
    await waitFor(() => expect(screen.getByTestId("board-probe")).toHaveTextContent("1"));
    expect(localStorage.getItem("echodesk_selected_board_id")).toBe("1");
  });

  it("ignores ?board outside /tickets", async () => {
    h.pathname = "/email";
    h.search = "board=1";
    renderLayout();
    // No stored board: falls back to the default accessible board, not the param.
    await waitFor(() => expect(screen.getByTestId("board-probe")).toHaveTextContent("7"));
  });

  it("replaces a stored board that is no longer accessible with the default board", async () => {
    localStorage.setItem("echodesk_selected_board_id", "99");
    renderLayout();
    await waitFor(() => expect(screen.getByTestId("board-probe")).toHaveTextContent("7"));
  });

  it("keeps an accessible stored board", async () => {
    localStorage.setItem("echodesk_selected_board_id", "1");
    renderLayout();
    await screen.findByTestId("board-probe");
    expect(screen.getByTestId("board-probe")).toHaveTextContent("1");
  });

  it("loads lite boards only when the Boards item is visible", async () => {
    renderLayout();
    await screen.findByTestId("board-probe");
    expect(h.boardsLiteOpts.at(-1)).toEqual({ enabled: true });
  });

  it("imports useBoardsLite, not @/hooks/useBoards (F16), and no legacy board pieces", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../../../../src/app/(tenant)/layout.tsx"), "utf8");
    expect(src).toMatch(/useBoardsLite/);
    expect(src).not.toMatch(/@\/hooks\/useBoards["']/);
    expect(src).not.toMatch(/BoardSwitcher|BoardCollaborationIndicators|BoardCollaborationProvider|useTicketBoardWebSocket/);
    expect(src).not.toMatch(/ticketSearchQuery/);
    expect(src).toMatch(/BoardAdminHost/);
  });

  it("BoardCollaborationIndicators is deleted", () => {
    expect(fs.existsSync(path.resolve(__dirname, "../../../../src/components/BoardCollaborationIndicators.tsx"))).toBe(false);
  });
});
