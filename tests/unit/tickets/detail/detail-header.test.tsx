/**
 * FE-09 detail header bridge: breadcrumb (back / #id · x of n), prev/next,
 * copy link (inside ⋮ below sm, DC20), the ⋮ menu (transfer gated by
 * can_transfer, DC19; history; delete gated by can_delete), presence chip.
 * The slots render in a header stand-in OUTSIDE the intl provider.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));

vi.mock("next/navigation", async () => (await import("./helpers")).navigationMock);
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock("@/services/auth", () => ({ authService: { isAuthenticated: () => true } }));
vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: () => ({ data: { id: 1, is_staff: true } }) }));
vi.mock("@/app/(tenant)/tickets/_contexts/tickets-realtime-context", async () => (await import("./helpers")).realtimeMock);
vi.mock("sonner", () => ({ toast: toastMock }));

import axios from "@/api/axios";
import { DetailHeaderBridge, type DetailHeaderProps } from "@/app/(tenant)/tickets/[id]/_components/detail-header";
import { DetailScreen } from "@/app/(tenant)/tickets/[id]/_components/detail-screen";
import {
  BOARDS,
  COLUMNS,
  PERMS_AGENT,
  PERMS_ALL,
  clearMatchMedia,
  makeTicket,
  mockMatchMedia,
  nav,
  page,
  renderDetail,
  resetNav,
  resetRealtime,
  routeAxios,
  rt,
} from "./helpers";

function props(over: Partial<DetailHeaderProps> = {}): DetailHeaderProps {
  return {
    ticketId: 10,
    boardName: "Support",
    perms: PERMS_ALL,
    backHref: "/tickets?board=1&priority=high",
    position: 2,
    total: 5,
    prevId: 9,
    nextId: 11,
    onPrev: vi.fn(),
    onNext: vi.fn(),
    transferBoards: [
      { id: 2, name: "Sales", color: "#f59e0b" },
      { id: 3, name: "Internal", color: "#a855f7" },
    ],
    onTransferPick: vi.fn(),
    onOpenHistory: vi.fn(),
    onDelete: vi.fn(),
    editingName: null,
    ...over,
  };
}

const writeText = vi.fn();

beforeEach(() => {
  resetNav("board=1&priority=high");
  resetRealtime();
  clearMatchMedia();
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
});

afterEach(() => clearMatchMedia());

async function openMenu() {
  await userEvent.click(screen.getByTestId("detail-more"));
  return screen.findByTestId("detail-menu");
}

describe("breadcrumb", () => {
  it("back (board name) keeps the filters, then '/' and the mono #id", () => {
    renderDetail(<DetailHeaderBridge {...props()} />);
    const crumb = within(screen.getByTestId("slot-breadcrumb"));
    const back = crumb.getByTestId("detail-back");
    expect(back).toHaveAttribute("href", "/tickets?board=1&priority=high");
    expect(back).toHaveAccessibleName("Back to Support");
    expect(back).toHaveTextContent("Support");

    const id = crumb.getByTestId("detail-id");
    expect(id).toHaveTextContent("#10");
    expect(id.className).toContain("font-mono");
    // DC9: a "/" separator sits between back and #id.
    expect(id.previousElementSibling).toHaveTextContent("/");
  });

  it("'x of n' is translated (ICU) and hidden on mobile", () => {
    renderDetail(<DetailHeaderBridge {...props()} />);
    const pos = screen.getByTestId("detail-position");
    expect(pos).toHaveTextContent("2 of 5");
    expect(pos.className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(pos.className).toContain("sm:inline");
  });

  it("'x of n' in Georgian, and absent when the ticket is outside the filters", () => {
    const { unmount } = renderDetail(<DetailHeaderBridge {...props()} />, { locale: "ka" });
    expect(screen.getByTestId("detail-position")).toHaveTextContent("2 / 5");
    expect(screen.getByTestId("detail-back")).toHaveAccessibleName("უკან: Support");
    unmount();
    renderDetail(<DetailHeaderBridge {...props({ position: null, total: null })} />);
    expect(screen.queryByTestId("detail-position")).toBeNull();
  });

  it("the board name is hidden below sm (icon-only back)", () => {
    renderDetail(<DetailHeaderBridge {...props()} />);
    const name = within(screen.getByTestId("detail-back")).getByText("Support");
    expect(name.className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(name.className).toContain("sm:inline");
  });
});

describe("prev / next", () => {
  it("are disabled at the ends", () => {
    renderDetail(<DetailHeaderBridge {...props({ prevId: null, nextId: 11 })} />);
    expect(screen.getByTestId("detail-prev")).toBeDisabled();
    expect(screen.getByTestId("detail-next")).toBeEnabled();
  });

  it("call the handlers", async () => {
    const p = props();
    renderDetail(<DetailHeaderBridge {...p} />);
    await userEvent.click(screen.getByTestId("detail-prev"));
    await userEvent.click(screen.getByTestId("detail-next"));
    expect(p.onPrev).toHaveBeenCalledTimes(1);
    expect(p.onNext).toHaveBeenCalledTimes(1);
  });
});

describe("copy link", () => {
  it("copies the ticket URL and shows the translated toast", async () => {
    renderDetail(<DetailHeaderBridge {...props()} />);
    await userEvent.click(screen.getByTestId("detail-copy-link"));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("http://tenant.test.com/tickets/10"));
    expect(toastMock.success).toHaveBeenCalledWith("Link copied");
  });

  it("moves into the ⋮ menu below sm (DC20)", async () => {
    mockMatchMedia((q) => q === "(max-width: 639px)");
    renderDetail(<DetailHeaderBridge {...props()} />);
    expect(screen.queryByTestId("detail-copy-link")).toBeNull();
    const menu = await openMenu();
    await userEvent.click(within(menu).getByTestId("detail-menu-copy-link"));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("http://tenant.test.com/tickets/10"));
  });

  it("is not in the menu on desktop", async () => {
    renderDetail(<DetailHeaderBridge {...props()} />);
    const menu = await openMenu();
    expect(within(menu).queryByTestId("detail-menu-copy-link")).toBeNull();
  });
});

describe("⋮ menu", () => {
  it("lists the other boards under 'Transfer to board' and reports the pick", async () => {
    const p = props();
    renderDetail(<DetailHeaderBridge {...p} />);
    const menu = await openMenu();
    expect(within(menu).getByText("Transfer to board")).toBeInTheDocument();
    expect(within(menu).getByTestId("transfer-board-2")).toHaveTextContent("Sales");
    expect(within(menu).getByTestId("transfer-board-3")).toHaveTextContent("Internal");
    await userEvent.click(within(menu).getByTestId("transfer-board-2"));
    expect(p.onTransferPick).toHaveBeenCalledWith({ id: 2, name: "Sales", color: "#f59e0b" });
  });

  it("hides Transfer when !can_transfer (DC19) and Delete when !can_delete", async () => {
    renderDetail(<DetailHeaderBridge {...props({ perms: PERMS_AGENT })} />);
    const menu = await openMenu();
    expect(within(menu).queryByText("Transfer to board")).toBeNull();
    expect(within(menu).queryByTestId("transfer-board-2")).toBeNull();
    expect(within(menu).queryByTestId("detail-menu-delete")).toBeNull();
    expect(within(menu).getByTestId("detail-menu-history")).toHaveTextContent("History & transfers");
  });

  it("History & transfers and Delete call their handlers", async () => {
    const p = props();
    renderDetail(<DetailHeaderBridge {...p} />);
    await userEvent.click(within(await openMenu()).getByTestId("detail-menu-history"));
    expect(p.onOpenHistory).toHaveBeenCalled();
    await userEvent.click(within(await openMenu()).getByTestId("detail-menu-delete"));
    expect(p.onDelete).toHaveBeenCalled();
  });

  it("is translated in Georgian", async () => {
    renderDetail(<DetailHeaderBridge {...props()} />, { locale: "ka" });
    const menu = await openMenu();
    expect(within(menu).getByText("სხვა დაფაზე გადატანა")).toBeInTheDocument();
    expect(within(menu).getByText("ისტორია და გადატანები")).toBeInTheDocument();
    expect(within(menu).getByText("ბილეთის წაშლა")).toBeInTheDocument();
  });
});

describe("presence", () => {
  it("shows 'X is editing'", () => {
    renderDetail(<DetailHeaderBridge {...props({ editingName: "Nino" })} />);
    const chip = within(screen.getByTestId("slot-meta")).getByTestId("detail-editing");
    expect(chip).toHaveTextContent("Nino is editing");
  });

  it("the screen shows another user's edit, not my own", async () => {
    routeScreen();
    rt.beingEdited = new Map([[10, { userId: 7, userName: "Nino" }]]);
    const { unmount } = renderDetail(<DetailScreen ticketId={10} />);
    expect(await screen.findByTestId("detail-editing")).toHaveTextContent("Nino is editing");
    unmount();
    rt.beingEdited = new Map([[10, { userId: 1, userName: "Me" }]]);
    renderDetail(<DetailScreen ticketId={10} />);
    await screen.findByTestId("detail-id");
    expect(screen.queryByTestId("detail-editing")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Through the screen: navigation, transfer, history, delete
// ---------------------------------------------------------------------------

const BOARD_COLUMNS: Record<string, unknown[]> = {
  "1": COLUMNS,
  "2": [
    { id: 22, name: "Qualified", color: "#000", position: 1, is_closed_status: false, board: 2 },
    { id: 21, name: "New lead", color: "#000", position: 0, is_closed_status: false, board: 2 },
  ],
  "3": [],
};

function routeScreen(ticket = makeTicket()) {
  routeAxios(axios, {
    get: {
      "/api/tickets/10/navigation/": () => ({ index: 2, total: 5, prev_id: 9, next_id: 11 }),
      "/api/tickets/10/history/": () => [],
      "/api/tickets/10/": () => ticket,
      "/api/columns/": (_u, config) =>
        page(BOARD_COLUMNS[String((config as { params?: { board?: number } })?.params?.board)] ?? []),
      "/api/boards/": () => page(BOARDS),
    },
    patch: {
      "/api/tickets/10/move_to_column/": (_u, body) =>
        makeTicket({ board: { id: 2, name: "Sales", color: "#f59e0b" }, column: { id: (body as { column_id: number }).column_id } as never }),
    },
    delete: { "/api/tickets/10/": () => "" },
  });
}

describe("through the screen", () => {
  it("next / prev keep the query string", async () => {
    routeScreen();
    renderDetail(<DetailScreen ticketId={10} />);
    await waitFor(() => expect(screen.getByTestId("detail-next")).toBeEnabled());
    await userEvent.click(screen.getByTestId("detail-next"));
    expect(nav.replace).toHaveBeenCalledWith("/tickets/11?board=1&priority=high", { scroll: false });
    await userEvent.click(screen.getByTestId("detail-prev"));
    expect(nav.replace).toHaveBeenLastCalledWith("/tickets/9?board=1&priority=high", { scroll: false });
  });

  it("navigation requests carry the filters and the view", async () => {
    resetNav("board=1&view=list&priority=high&sort=due");
    routeScreen();
    renderDetail(<DetailScreen ticketId={10} />);
    await waitFor(() =>
      expect(vi.mocked(axios.get)).toHaveBeenCalledWith("/api/tickets/10/navigation/", {
        params: { view: "list", priority__in: "high", ordering: "due_date" },
      }),
    );
  });

  it("transfer: other boards → confirm → move to the target's first column", async () => {
    routeScreen();
    renderDetail(<DetailScreen ticketId={10} />);
    await screen.findByTestId("detail-id");
    const menu = await openMenu();
    await waitFor(() => expect(within(menu).getByTestId("transfer-board-2")).toBeInTheDocument());
    expect(within(menu).queryByTestId("transfer-board-1")).toBeNull();
    await userEvent.click(within(menu).getByTestId("transfer-board-2"));

    const dialog = await screen.findByTestId("transfer-dialog");
    expect(dialog).toHaveTextContent("Move this ticket to Sales?");
    await userEvent.click(within(dialog).getByRole("button", { name: "Transfer" }));

    await waitFor(() =>
      expect(vi.mocked(axios.patch)).toHaveBeenCalledWith(
        "/api/tickets/10/move_to_column/",
        { column_id: 21 },
        expect.objectContaining({ headers: expect.objectContaining({ "X-Client-Mutation": expect.any(String) }) }),
      ),
    );
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Ticket moved"));
  });

  it("transfer to a board without columns: translated toast, no request", async () => {
    routeScreen();
    renderDetail(<DetailScreen ticketId={10} />);
    await screen.findByTestId("detail-id");
    const menu = await openMenu();
    await waitFor(() => expect(within(menu).getByTestId("transfer-board-3")).toBeInTheDocument());
    await userEvent.click(within(menu).getByTestId("transfer-board-3"));
    await userEvent.click(within(await screen.findByTestId("transfer-dialog")).getByRole("button", { name: "Transfer" }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Internal has no columns"));
    expect(vi.mocked(axios.patch)).not.toHaveBeenCalled();
  });

  it("no transfer rows without can_transfer", async () => {
    routeScreen(makeTicket({ viewer_permissions: PERMS_AGENT }));
    renderDetail(<DetailScreen ticketId={10} />);
    await screen.findByTestId("detail-id");
    const menu = await openMenu();
    expect(within(menu).queryByText("Transfer to board")).toBeNull();
    expect(vi.mocked(axios.get).mock.calls.some(([u]) => u === "/api/boards/")).toBe(false);
  });

  it("History & transfers opens the dialog", async () => {
    routeScreen();
    renderDetail(<DetailScreen ticketId={10} />);
    await screen.findByTestId("detail-id");
    await userEvent.click(within(await openMenu()).getByTestId("detail-menu-history"));
    const dialog = await screen.findByTestId("history-dialog");
    expect(within(dialog).getByRole("heading", { name: "History & transfers" })).toBeInTheDocument();
  });

  it("delete: AlertDialog → DELETE → back to the board", async () => {
    routeScreen();
    renderDetail(<DetailScreen ticketId={10} />);
    await screen.findByTestId("detail-id");
    await userEvent.click(within(await openMenu()).getByTestId("detail-menu-delete"));
    const dialog = await screen.findByTestId("delete-ticket-dialog");
    expect(dialog).toHaveTextContent("Delete ticket #10?");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(vi.mocked(axios.delete)).toHaveBeenCalledWith("/api/tickets/10/", expect.anything()));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/tickets?board=1&priority=high"));
  });
});
