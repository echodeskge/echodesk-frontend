import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fs from "node:fs";
import path from "node:path";

vi.mock("@/api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("next-intl", async () => {
  const { translate } = await import("./test-utils");
  return { useTranslations: (ns: string) => translate(ns) };
});
const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => nav, usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
const boardCtx = vi.hoisted(() => ({ selectedBoardId: null as number | null, setSelectedBoardId: vi.fn() }));
vi.mock("@/contexts/BoardContext", () => ({ useBoard: () => boardCtx }));

import type { TicketPermissions } from "@/app/(tenant)/tickets/_hooks/use-ticket-permissions";
const perms = vi.hoisted(() => ({ current: {} as TicketPermissions }));
vi.mock("@/app/(tenant)/tickets/_hooks/use-ticket-permissions", () => ({ useTicketPermissions: () => perms.current }));

import axios from "@/api/axios";
import { BoardAdminHost, resolveFallbackBoard, useBoardAdmin, type BoardAdminApi } from "@/components/tickets-admin/board-admin-host";
import { HttpError, renderWithClient, routeAxios, type Routes } from "./test-utils";

/** The dialogs are lazy chunks; their first import can exceed findBy's 1s default under full-suite load (W1 flake). */
const LAZY = { timeout: 4000 };

const ax = axios as unknown as Parameters<typeof routeAxios>[0];
const T = "tickets.boardAdmin";

const STAFF: TicketPermissions = {
  canCreateTicket: true,
  canDeleteTickets: true,
  canCreateBoard: true,
  canEditBoard: true,
  canDeleteBoard: true,
  canSetDefaultBoard: true,
  canManageColumns: true,
  canManageTags: true,
  hasSocialFeature: true,
  isStaff: true,
};
const AGENT: TicketPermissions = {
  ...STAFF,
  canCreateBoard: false,
  canEditBoard: false,
  canDeleteBoard: false,
  canSetDefaultBoard: false,
  canManageColumns: false,
  isStaff: false,
};

const BOARD = { id: 7, name: "Support", color: "#3b82f6", is_default: false, order_users: [], board_users: [], board_groups: [] };

let api: BoardAdminApi;
function Probe() {
  api = useBoardAdmin();
  return null;
}

function setLocation(pathname: string, search = "") {
  window.location.pathname = pathname;
  window.location.search = search;
}

function mount(routes: Routes = {}) {
  routeAxios(ax, {
    "GET /api/boards/7/": BOARD,
    "GET /api/columns/": { count: 0, next: null, results: [] },
    "GET /api/users/": { count: 0, next: null, results: [] },
    "GET /api/tenant-groups/": { count: 0, next: null, results: [] },
    ...routes,
  });
  return renderWithClient(
    <BoardAdminHost>
      <Probe />
    </BoardAdminHost>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  perms.current = STAFF;
  boardCtx.selectedBoardId = null;
  setLocation("/email");
});

describe("BoardAdminHost — opening from outside /tickets", () => {
  it("opens the create sheet", async () => {
    mount();
    act(() => api.openCreateBoard());
    expect(await screen.findByText(`${T}.create.title`, undefined, LAZY)).toBeInTheDocument();
  });

  it("opens board settings, manage users and edit columns", async () => {
    mount();
    act(() => api.openBoardSettings({ id: 7, name: "Support" }));
    expect(await screen.findByText(`${T}.settings.title`, undefined, LAZY)).toBeInTheDocument();

    act(() => api.openManageUsers({ id: 7, name: "Support" }));
    expect(await screen.findByText(`${T}.users.title`, undefined, LAZY)).toBeInTheDocument();
    expect(screen.queryByText(`${T}.settings.title`)).not.toBeInTheDocument();

    act(() => api.openEditColumns({ id: 7, name: "Support" }));
    expect(await screen.findByText(`${T}.columns.title`, undefined, LAZY)).toBeInTheDocument();
  });

  it("switches from settings to the users dialog through its shortcut", async () => {
    const user = userEvent.setup();
    mount();
    act(() => api.openBoardSettings({ id: 7, name: "Support" }));
    await user.click(await screen.findByRole("button", { name: `${T}.menu.manageUsers` }, LAZY));
    expect(await screen.findByText(`${T}.users.title`, undefined, LAZY)).toBeInTheDocument();
  });
});

describe("BoardAdminHost — permission gates", () => {
  it("exposes open gates for staff", () => {
    mount();
    expect(api.gates).toEqual({ canCreateBoard: true, canEditColumns: true, canManageUsers: true, canOpenSettings: true });
  });

  it("closes every gate for a plain agent and ignores open calls", async () => {
    perms.current = AGENT;
    mount();
    expect(api.gates).toEqual({ canCreateBoard: false, canEditColumns: false, canManageUsers: false, canOpenSettings: false });
    act(() => {
      api.openCreateBoard();
      api.openBoardSettings({ id: 7 });
      api.openManageUsers({ id: 7 });
      api.openEditColumns({ id: 7 });
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("maps each permission to its own gate", () => {
    perms.current = { ...AGENT, canCreateBoard: true, canManageColumns: true };
    mount();
    expect(api.gates).toEqual({ canCreateBoard: true, canEditColumns: true, canManageUsers: false, canOpenSettings: false });
  });

  it("is a no-op with closed gates outside the host", () => {
    render(<Probe />);
    expect(api.gates.canCreateBoard).toBe(false);
    expect(() => api.openCreateBoard()).not.toThrow();
  });
});

describe("BoardAdminHost — after create and delete", () => {
  it("selects the new board and, on /tickets, navigates to it", async () => {
    const user = userEvent.setup();
    setLocation("/tickets", "?board=7");
    mount({ "POST /api/boards/": { id: 12, name: "Ops" } });
    act(() => api.openCreateBoard());
    await user.type(await screen.findByLabelText(`${T}.create.name`, undefined, LAZY), "Ops");
    await user.click(screen.getByRole("button", { name: `${T}.create.submit` }));
    await waitFor(() => expect(boardCtx.setSelectedBoardId).toHaveBeenCalledWith(12));
    expect(nav.push).toHaveBeenCalledWith("/tickets?board=12");
  });

  it("does not navigate away from other pages after create", async () => {
    const user = userEvent.setup();
    mount({ "POST /api/boards/": { id: 12, name: "Ops" } });
    act(() => api.openCreateBoard());
    await user.type(await screen.findByLabelText(`${T}.create.name`, undefined, LAZY), "Ops");
    await user.click(screen.getByRole("button", { name: `${T}.create.submit` }));
    await waitFor(() => expect(boardCtx.setSelectedBoardId).toHaveBeenCalledWith(12));
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("falls back to the default board after deleting the selected board", async () => {
    const user = userEvent.setup();
    setLocation("/tickets", "?board=7&view=board");
    boardCtx.selectedBoardId = 7;
    mount({ "DELETE /api/boards/7/": null, "GET /api/boards/default/": { id: 2, name: "General" } });
    act(() => api.openBoardSettings({ id: 7, name: "Support" }));
    await user.click(await screen.findByRole("button", { name: `${T}.settings.delete` }, LAZY));
    const alert = await screen.findByRole("alertdialog");
    await user.click(within(alert).getByRole("button", { name: `${T}.settings.delete` }));

    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/tickets?board=2"));
    expect(boardCtx.setSelectedBoardId).toHaveBeenCalledWith(2);
  });

  it("leaves the route alone when another board was deleted", async () => {
    const user = userEvent.setup();
    setLocation("/tickets", "?board=3");
    boardCtx.selectedBoardId = 3;
    mount({ "DELETE /api/boards/7/": null, "GET /api/boards/default/": { id: 2 } });
    act(() => api.openBoardSettings({ id: 7, name: "Support" }));
    await user.click(await screen.findByRole("button", { name: `${T}.settings.delete` }, LAZY));
    const alert = await screen.findByRole("alertdialog");
    await user.click(within(alert).getByRole("button", { name: `${T}.settings.delete` }));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith(`${T}.settings.deleted`));
    expect(nav.replace).not.toHaveBeenCalled();
    expect(boardCtx.setSelectedBoardId).not.toHaveBeenCalled();
  });
});

describe("resolveFallbackBoard", () => {
  it("uses the first other accessible board when there is no default", async () => {
    routeAxios(ax, {
      "GET /api/boards/default/": () => new HttpError(404),
      "GET /api/boards/": { count: 2, next: null, results: [{ id: 7 }, { id: 4 }] },
    });
    await expect(resolveFallbackBoard(7)).resolves.toBe(4);
  });

  it("skips a default that is the deleted board and returns null when nothing is left", async () => {
    routeAxios(ax, {
      "GET /api/boards/default/": { id: 7 },
      "GET /api/boards/": { count: 1, next: null, results: [{ id: 7 }] },
    });
    await expect(resolveFallbackBoard(7)).resolves.toBeNull();
  });
});

describe("tickets-admin imports", () => {
  const dir = path.resolve(__dirname, "../../../../src/components/tickets-admin");
  const files = fs.readdirSync(dir).filter((f) => /\.tsx?$/.test(f));

  it.each(files)("%s does not import legacy board hooks, ticketService or raw axios", (file) => {
    const src = fs.readFileSync(path.join(dir, file), "utf8");
    expect(src).not.toMatch(/@\/hooks\/useBoards\b/);
    expect(src).not.toMatch(/\buseKanbanBoard\b/);
    expect(src).not.toMatch(/\buseTickets\b/);
    expect(src).not.toMatch(/\buseTicketColumns\b/);
    expect(src).not.toMatch(/ticketService/);
    expect(src).not.toMatch(/from ["']@\/api\/axios["']/);
  });

  it("has no hard-coded user-facing English in JSX text", () => {
    for (const file of files.filter((f) => f.endsWith(".tsx"))) {
      const src = fs.readFileSync(path.join(dir, file), "utf8");
      // Text nodes between tags that contain letters and are not {expressions}.
      const text = [...src.matchAll(/>\s*([A-Za-z][^<>{}]*?)\s*</g)].map((m) => m[1].trim())
        // Skip TypeScript generics such as `as Promise<T>` / `useState<X>(…)`.
        .filter((t) => t && !/[()=;]/.test(t));
      expect({ file, text }).toEqual({ file, text: [] });
    }
  });
});
