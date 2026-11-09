/**
 * FE-06 header bridge: the board switcher in the breadcrumb, viewer avatars and
 * "New ticket" in the primary slot, rendered by a stand-in for the tenant
 * header that sits OUTSIDE the intl provider (risk 10).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HeaderActionsProvider, useHeaderSlot } from "@/contexts/HeaderActionsContext";

const h = vi.hoisted(() => ({
  profile: null as unknown,
  activeUsers: [] as { user_id: number; user_name: string }[],
  openTicketCreate: vi.fn(),
  admin: {
    openCreateBoard: vi.fn(),
    openEditColumns: vi.fn(),
    openManageUsers: vi.fn(),
    openBoardSettings: vi.fn(),
    gates: { canCreateBoard: true, canEditColumns: true, canManageUsers: true, canOpenSettings: true },
  },
}));

vi.mock("next/navigation", async () => (await import("./helpers")).navigationMock);
vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: () => ({ data: h.profile }) }));
vi.mock("@/contexts/TicketCreateContext", () => ({ useTicketCreate: () => ({ openTicketCreate: h.openTicketCreate }) }));
vi.mock("@/components/tickets-admin/board-admin-host", () => ({ useBoardAdmin: () => h.admin }));
vi.mock("@/app/(tenant)/tickets/_contexts/tickets-realtime-context", () => ({
  useTicketsRealtime: () => ({ activeUsers: h.activeUsers, wsReady: false }),
}));

import { TicketsHeaderBridge } from "@/app/(tenant)/tickets/_components/header/tickets-header-bridge";
import { useTicketFilters, SELECTED_BOARD_STORAGE_KEY } from "@/app/(tenant)/tickets/_hooks/use-ticket-filters";
import type { BoardLite } from "@/app/(tenant)/tickets/_lib/types";
import {
  AGENT_PROFILE,
  BOARDS,
  IntlProvider,
  STAFF_PROFILE,
  clearMatchMedia,
  lastReplace,
  mockMatchMedia,
  resetNav,
} from "./helpers";

/** The tenant header stand-in: renders the slot outside any intl provider. */
function HeaderOutlet() {
  const slot = useHeaderSlot();
  return (
    <header>
      <div data-testid="slot-breadcrumb">{slot?.breadcrumb}</div>
      <div data-testid="slot-primary">{slot?.primary}</div>
      <div data-testid="slot-icons">{slot?.icons}</div>
    </header>
  );
}

function Harness({ boards = BOARDS as BoardLite[], current = 1 }: { boards?: BoardLite[]; current?: number | null }) {
  const { setFilter } = useTicketFilters();
  return (
    <TicketsHeaderBridge
      boards={boards}
      currentBoard={boards.find((b) => b.id === current) ?? null}
      onSelectBoard={(id) => setFilter("board", id)}
    />
  );
}

function renderBridge(props: React.ComponentProps<typeof Harness> = {}, locale: "en" | "ka" = "en") {
  return render(
    <HeaderActionsProvider>
      <HeaderOutlet />
      <IntlProvider locale={locale}>
        <Harness {...props} />
      </IntlProvider>
    </HeaderActionsProvider>,
  );
}

async function openSwitcher() {
  const trigger = screen.getByTestId("board-switcher");
  await userEvent.setup().click(trigger);
  return trigger;
}

beforeEach(() => {
  resetNav("board=1");
  h.profile = STAFF_PROFILE;
  h.activeUsers = [];
  h.admin.gates = { canCreateBoard: true, canEditColumns: true, canManageUsers: true, canOpenSettings: true };
  clearMatchMedia();
});

afterEach(() => clearMatchMedia());

describe("TicketsHeaderBridge slots", () => {
  it("puts the switcher in the breadcrumb and New ticket in primary, with no route hooks in slot content", () => {
    renderBridge();
    const bc = screen.getByTestId("slot-breadcrumb");
    expect(within(bc).getByTestId("board-switcher")).toHaveTextContent("Support");
    expect(within(screen.getByTestId("slot-primary")).getByTestId("new-ticket")).toHaveTextContent("New ticket");
    expect(screen.getByTestId("slot-icons")).toBeEmptyDOMElement();
  });

  it("renders translated strings passed as props (ka)", () => {
    renderBridge({}, "ka");
    expect(screen.getByTestId("new-ticket")).toHaveTextContent("ახალი ბილეთი");
    expect(screen.getByTestId("board-switcher")).toHaveAccessibleName("დაფის შეცვლა");
  });

  it("clears the slot on unmount", () => {
    const { unmount } = render(
      <HeaderActionsProvider>
        <HeaderOutlet />
        <IntlProvider>
          <ToggleBridge />
        </IntlProvider>
      </HeaderActionsProvider>,
    );
    expect(screen.getByTestId("board-switcher")).toBeInTheDocument();
    fireEvent.click(screen.getByText("hide"));
    expect(screen.queryByTestId("board-switcher")).not.toBeInTheDocument();
    unmount();
  });

  it("leaves the breadcrumb empty without a current board", () => {
    renderBridge({ current: null });
    expect(screen.getByTestId("slot-breadcrumb")).toBeEmptyDOMElement();
  });
});

function ToggleBridge() {
  const [on, setOn] = React.useState(true);
  return (
    <>
      <button onClick={() => setOn(false)}>hide</button>
      {on && <Harness />}
    </>
  );
}

describe("board switcher", () => {
  it("lists the boards with dots and counts and highlights the current one", async () => {
    renderBridge({ current: 2 });
    const trigger = await openSwitcher();
    expect(trigger).toHaveAttribute("data-state", "open");
    expect(trigger.className).toContain("bg-accent");
    const menu = await screen.findByTestId("board-switcher-menu");
    expect(menu.className).toContain("w-[260px]");
    expect(menu.className).toContain("shadow-popover-lg");
    const rows = within(menu).getAllByRole("menuitem").filter((r) => r.hasAttribute("data-selected"));
    expect(rows.map((r) => r.textContent)).toEqual(["Support7", "Sales4Current board", "Internal12"]);
    expect(rows[1]).toHaveAttribute("aria-current", "true");
    expect(rows[1].className).toContain("bg-accent");
    expect(rows[0]).not.toHaveAttribute("aria-current");
    expect(rows.every((r) => r.querySelector('[data-slot="color-dot"]'))).toBe(true);
  });

  it("shows the four admin actions with their icons when every gate is open", async () => {
    renderBridge();
    await openSwitcher();
    const menu = await screen.findByTestId("board-switcher-menu");
    const icons = { new: "lucide-plus", columns: "lucide-settings", users: "lucide-users", settings: "lucide-sliders-horizontal" };
    for (const [action, icon] of Object.entries(icons)) {
      const item = menu.querySelector(`[data-action="${action}"]`);
      expect(item, action).not.toBeNull();
      expect(item!.querySelector("svg")!.getAttribute("class")).toContain(icon);
    }
    expect(within(menu).getByText("New board")).toBeInTheDocument();
    expect(within(menu).getByText("Board settings…")).toBeInTheDocument();
  });

  it("hides each action whose gate is closed", async () => {
    h.admin.gates = { canCreateBoard: false, canEditColumns: true, canManageUsers: false, canOpenSettings: false };
    renderBridge();
    await openSwitcher();
    const menu = await screen.findByTestId("board-switcher-menu");
    expect(menu.querySelector('[data-action="columns"]')).not.toBeNull();
    expect(menu.querySelectorAll("[data-action]")).toHaveLength(1);
  });

  it("has no actions and no divider when every gate is closed", async () => {
    h.admin.gates = { canCreateBoard: false, canEditColumns: false, canManageUsers: false, canOpenSettings: false };
    renderBridge();
    await openSwitcher();
    const menu = await screen.findByTestId("board-switcher-menu");
    expect(menu.querySelectorAll("[data-action]")).toHaveLength(0);
    expect(within(menu).queryByRole("separator")).toBeNull();
  });

  it("opens the admin dialogs for the current board", async () => {
    const user = userEvent.setup();
    renderBridge();
    for (const [action, fn] of [
      ["columns", h.admin.openEditColumns],
      ["users", h.admin.openManageUsers],
      ["settings", h.admin.openBoardSettings],
    ] as const) {
      await user.click(screen.getByTestId("board-switcher"));
      const menu = await screen.findByTestId("board-switcher-menu");
      await user.click(menu.querySelector(`[data-action="${action}"]`)!);
      expect(fn).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: "Support", color: "#3b82f6" }));
    }
  });

  it("New board switches to the created board", async () => {
    const user = userEvent.setup();
    renderBridge();
    await user.click(screen.getByTestId("board-switcher"));
    await user.click((await screen.findByTestId("board-switcher-menu")).querySelector('[data-action="new"]')!);
    expect(h.admin.openCreateBoard).toHaveBeenCalledTimes(1);
    act(() => h.admin.openCreateBoard.mock.calls[0][0].onCreated({ id: 9, name: "New" }));
    expect(lastReplace()?.get("board")).toBe("9");
  });

  it("selecting a board updates ?board (replace) and the stored board, keeping the filters", async () => {
    resetNav("board=1&priority=high&q=login");
    const user = userEvent.setup();
    renderBridge();
    await user.click(screen.getByTestId("board-switcher"));
    await user.click(within(await screen.findByTestId("board-switcher-menu")).getByText("Sales"));
    const sp = lastReplace()!;
    expect(sp.get("board")).toBe("2");
    expect(sp.get("priority")).toBe("high");
    expect(sp.get("q")).toBe("login");
    expect(localStorage.getItem(SELECTED_BOARD_STORAGE_KEY)).toBe("2");
  });

  it("picking the current board does nothing", async () => {
    const user = userEvent.setup();
    renderBridge();
    await user.click(screen.getByTestId("board-switcher"));
    await user.click(within(await screen.findByTestId("board-switcher-menu")).getByText("Support"));
    expect(screen.getByTestId("board-switcher")).toBeInTheDocument();
    expect(lastReplace()).toBeNull();
  });

  it("renders as a bottom Sheet below sm (DC40)", async () => {
    mockMatchMedia((q) => q === "(max-width: 639px)");
    const user = userEvent.setup();
    renderBridge();
    const trigger = screen.getByTestId("board-switcher");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    await user.click(trigger);
    const sheet = await screen.findByTestId("board-switcher-sheet");
    expect(screen.queryByTestId("board-switcher-menu")).toBeNull();
    expect(within(sheet).getByText("Sales")).toBeInTheDocument();
    expect(within(sheet).getByText("Manage users")).toBeInTheDocument();
    await user.click(within(sheet).getByText("Internal"));
    expect(lastReplace()?.get("board")).toBe("3");
  });
});

describe("viewers", () => {
  it("shows one initials avatar per user with an ICU plural tooltip, hidden below md", () => {
    h.activeUsers = [
      { user_id: 1, user_name: "Nino Beridze" },
      { user_id: 4, user_name: "Giorgi Kapanadze" },
      { user_id: 1, user_name: "Nino Beridze" },
    ];
    renderBridge();
    const group = screen.getByTestId("board-viewers");
    expect(group).toHaveAttribute("title", "2 people are viewing");
    expect(group.className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(group.className).toContain("md:flex");
    expect(within(group).getAllByRole("img").map((a) => a.textContent)).toEqual(["NB", "GK"]);
    expect(group.querySelector('[data-slot="avatar-stack"]')!.getAttribute("data-size")).toBe("24");
    // Inside primary, before New ticket (design order).
    const primary = screen.getByTestId("slot-primary");
    expect(primary.firstElementChild).toBe(group);
  });

  it("uses the singular for one viewer, and ka plurals", () => {
    h.activeUsers = [{ user_id: 1, user_name: "Nino Beridze" }];
    renderBridge({}, "ka");
    expect(screen.getByTestId("board-viewers")).toHaveAttribute("title", "1 ადამიანი ათვალიერებს");
  });

  it("renders nothing without viewers", () => {
    renderBridge();
    expect(screen.queryByTestId("board-viewers")).toBeNull();
  });
});

describe("New ticket", () => {
  it("opens the create sheet on the current board, icon-only below sm", async () => {
    renderBridge({ current: 2 });
    const btn = screen.getByTestId("new-ticket");
    expect(btn).toHaveAccessibleName("New ticket");
    expect(btn.querySelector("span")!.className).toContain("hidden sm:inline");
    await userEvent.setup().click(btn);
    expect(h.openTicketCreate).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });

  it("is hidden without create_tickets", () => {
    h.profile = AGENT_PROFILE;
    renderBridge();
    expect(screen.queryByTestId("new-ticket")).toBeNull();
  });

  it("shows for a non-staff user with create_tickets", () => {
    h.profile = { ...AGENT_PROFILE, permissions_list: ["create_tickets"] };
    renderBridge();
    expect(screen.getByTestId("new-ticket")).toBeInTheDocument();
  });
});
