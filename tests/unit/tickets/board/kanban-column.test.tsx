/**
 * Kanban column (plan FE-07: F20, DC11, DC12, DC15).
 */
import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanColumn, type KanbanColumnProps } from "@/app/(tenant)/tickets/_components/board/kanban-column";
import { renderIntl } from "../primitives/render";
import { makeCard, makeColumn } from "./fixtures";
import type { DndState } from "./dnd-mock";

const dnd = vi.hoisted(() => ({ ctx: null, over: null }) as DndState);
vi.mock("@hello-pangea/dnd", async () => (await import("./dnd-mock")).createDndMock(dnd));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function renderColumn(props: Partial<KanbanColumnProps> = {}) {
  const column = makeColumn(10, 0, { name: "New", color: "#3b82f6", tickets_count: 99 });
  const handlers = {
    onAddTicket: vi.fn(),
    onEditColumn: vi.fn(),
    onEditAllColumns: vi.fn(),
    onDeleteColumn: vi.fn(),
  };
  const utils = renderIntl(
    <KanbanColumn
      column={column}
      index={0}
      cards={[makeCard(1, 10, 0), makeCard(2, 10, 1)]}
      canCreateTicket
      canManageColumns
      canDeleteTickets={false}
      {...handlers}
      {...props}
    />,
  );
  return { ...utils, column, handlers };
}

describe("KanbanColumn header", () => {
  it("the count is the number of rendered cards, not tickets_count (F20)", () => {
    renderColumn();
    expect(screen.getByTestId("kanban-column-count")).toHaveTextContent("2");
    expect(screen.getAllByTestId("ticket-card")).toHaveLength(2);
  });

  it("+ calls openTicketCreate for this column and is hidden without canCreateTicket (DC12)", async () => {
    const user = userEvent.setup();
    const { handlers, column, unmount } = renderColumn();
    await user.click(screen.getByTestId("kanban-column-add"));
    expect(handlers.onAddTicket).toHaveBeenCalledWith(column);
    unmount();
    renderColumn({ canCreateTicket: false });
    expect(screen.queryByTestId("kanban-column-add")).toBeNull();
    expect(screen.queryByTestId("kanban-column-add-ghost")).toBeNull();
  });

  it("the … menu has Edit column, Add ticket, Edit all columns… and Delete column", async () => {
    const user = userEvent.setup();
    const { handlers, column } = renderColumn();
    await user.click(screen.getByRole("button", { name: "Column actions for New" }));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "Edit column",
      "Add ticket",
      "Edit all columns…",
      "Delete column",
    ]);
    // No fake ⌘⌫ shortcut hint.
    expect(menu).not.toHaveTextContent("⌘");
    await user.click(within(menu).getByText("Edit column"));
    expect(handlers.onEditColumn).toHaveBeenCalledWith(column);
  });

  it("Delete column and Edit all columns call their handlers", async () => {
    const user = userEvent.setup();
    const { handlers, column } = renderColumn();
    await user.click(screen.getByTestId("kanban-column-menu"));
    await user.click(await screen.findByText("Delete column"));
    expect(handlers.onDeleteColumn).toHaveBeenCalledWith(column);
    await user.click(screen.getByTestId("kanban-column-menu"));
    await user.click(await screen.findByText("Edit all columns…"));
    expect(handlers.onEditAllColumns).toHaveBeenCalled();
  });

  it("the menu is hidden without manage_columns, and the header isn't draggable", () => {
    renderColumn({ canManageColumns: false });
    expect(screen.queryByTestId("kanban-column-menu")).toBeNull();
    expect(screen.getByTestId("kanban-column")).toHaveAttribute("data-drag-disabled", "true");
  });
});

describe("KanbanColumn list", () => {
  it("shows the empty text when the column has no cards", () => {
    renderColumn({ cards: [] });
    expect(screen.getByTestId("kanban-column-empty")).toHaveTextContent("No tickets");
    expect(screen.getByTestId("kanban-column-count")).toHaveTextContent("0");
  });

  it("the ghost Add ticket calls onAddTicket", async () => {
    const user = userEvent.setup();
    const { handlers, column } = renderColumn();
    await user.click(screen.getByTestId("kanban-column-add-ghost"));
    expect(handlers.onAddTicket).toHaveBeenCalledWith(column);
  });

  it("the card list has min-h-[60px] (DC15)", () => {
    renderColumn({ cards: [] });
    expect(screen.getByTestId("kanban-column-list").className).toContain("min-h-[60px]");
  });

  it("tints and outlines the drop target while a card is over it (DC11)", () => {
    dnd.over = "col-10";
    renderColumn();
    const list = screen.getByTestId("kanban-column-list");
    expect(list).toHaveAttribute("data-drag-over", "true");
    expect(list.className).toContain("outline-dashed");
    expect(list.className).toContain("duration-150");
    expect(list.style.backgroundColor).not.toBe("");
    dnd.over = null;
  });

  it("passes dropDisabled to the droppable", () => {
    renderColumn({ dropDisabled: true });
    expect(screen.getByTestId("kanban-column-list")).toHaveAttribute("data-drop-disabled", "true");
  });

  it("renders cards with the column width classes and presence", () => {
    renderColumn({ presenceFor: (id) => (id === 2 ? { kind: "moving", userName: "Ana" } : null) });
    expect(screen.getByTestId("kanban-column").className).toContain("md:w-[272px]");
    const cards = screen.getAllByTestId("ticket-card");
    expect(cards[1]).toHaveAttribute("data-presence", "moving");
    expect(cards[0]).not.toHaveAttribute("data-presence");
  });
});
