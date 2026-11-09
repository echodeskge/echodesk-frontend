/** FE-10 checklist card: open by default, n/m + progress bar, toggle + checked-by, remove + undo, inline edit, add, reorder, tokens. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fs from "node:fs";
import path from "node:path";

const toastMock = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }));
const dnd = vi.hoisted(() => ({ onDragEnd: null as null | ((r: unknown) => void) }));
vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd: (r: unknown) => void }) => {
    dnd.onDragEnd = onDragEnd;
    return <>{children}</>;
  },
  Droppable: ({ children }: { children: (p: unknown) => React.ReactNode }) =>
    children({ innerRef: () => {}, droppableProps: {}, placeholder: null }),
  Draggable: ({ children }: { children: (p: unknown, s: unknown) => React.ReactNode }) =>
    children({ innerRef: () => {}, draggableProps: {}, dragHandleProps: {} }, { isDragging: false }),
}));

import axios from "@/api/axios";
import { useQuery } from "@tanstack/react-query";
import { tk } from "@/app/(tenant)/tickets/_lib/query-keys";
import type { TicketChecklistItem, TicketDetail } from "@/app/(tenant)/tickets/_lib/types";
import { ChecklistCard } from "@/app/(tenant)/tickets/[id]/_components/main/checklist-card";
import { reorderTargetPosition } from "@/app/(tenant)/tickets/[id]/_components/main/main-utils";
import { makeTicket, newClient, routeAxios } from "../helpers";
import { renderMain } from "./main-helpers";

function item(id: number, text: string, position: number, over: Partial<TicketChecklistItem> = {}): TicketChecklistItem {
  return {
    id,
    ticket: 10,
    text,
    is_checked: false,
    position,
    created_at: `2026-11-0${id}T10:00:00Z`,
    updated_at: `2026-11-0${id}T10:00:00Z`,
    created_by: null,
    checked_by: null,
    checked_at: null,
    ...over,
  };
}

const ITEMS = [
  item(1, "Collect a SIP trace", 0, { is_checked: true, checked_by: { id: 4, name: "Giorgi G." }, checked_at: "2025-03-05T10:07:00Z" }),
  item(2, "Compare session timers", 1),
  item(3, "Patch pjsip.conf", 2),
  item(4, "Confirm with the customer", 3),
];

let nextId = 100;

function setup(items: TicketChecklistItem[] = ITEMS) {
  const client = newClient();
  const ticket = makeTicket({ checklist_items: items, checklist_items_count: items.length });
  client.setQueryData(tk.ticket(10), ticket);
  routeAxios(axios, {
    get: { "/api/tickets/10/": () => client.getQueryData(tk.ticket(10)) },
    post: {
      "/api/checklist-items/": (_u, body) => {
        const b = body as { text: string; position: number };
        return item(nextId++, b.text, b.position);
      },
    },
    patch: {
      "/api/checklist-items/": (url, body) => {
        const id = Number(url.split("/")[3]);
        const cur = (client.getQueryData<TicketDetail>(tk.ticket(10))?.checklist_items ?? []).find((i) => i.id === id) ?? item(id, "x", 0);
        if (url.endsWith("/toggle_check/")) {
          const checked = !ITEMS.find((i) => i.id === id)?.is_checked;
          return { ...cur, is_checked: checked, checked_by: checked ? { id: 1, name: "Nino B." } : null, checked_at: checked ? "2025-03-05T11:00:00Z" : null };
        }
        if (url.endsWith("/reorder/")) return { ...cur, position: (body as { position: number }).position };
        return { ...cur, ...(body as object) };
      },
    },
    delete: { "/api/checklist-items/": () => undefined },
  });
  function Harness() {
    const { data } = useQuery<TicketDetail>({
      queryKey: tk.ticket(10),
      // A refetch returns what the "server" (the cache) holds now.
      queryFn: () => client.getQueryData<TicketDetail>(tk.ticket(10)) ?? ticket,
      staleTime: Infinity,
    });
    return <ChecklistCard ticketId={10} items={(data ?? ticket).checklist_items} />;
  }
  return renderMain(<Harness />, { client });
}

const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="checklist-row"]'));
const cached = (client: ReturnType<typeof newClient>) => client.getQueryData<TicketDetail>(tk.ticket(10))!;

beforeEach(() => {
  vi.clearAllMocks();
  dnd.onDragEnd = null;
});

describe("ChecklistCard", () => {
  it("is open by default and shows n/m with a progress bar (max-width 160, 4px, .2s)", () => {
    setup();
    expect(screen.getByRole("button", { name: /Checklist/ })).toHaveAttribute("aria-expanded", "true");
    expect(document.querySelector('[data-slot="checklist-summary"]')).toHaveTextContent("1/4");
    const track = document.querySelector('[data-slot="checklist-progress"]')!;
    expect(track).toHaveClass("max-w-[160px]", "h-1", "rounded-full", "bg-muted");
    expect(track).toHaveAttribute("aria-valuenow", "1");
    const bar = document.querySelector<HTMLElement>('[data-slot="checklist-progress-bar"]')!;
    expect(bar.style.width).toBe("25%");
    expect(bar).toHaveClass("bg-green", "transition-[width]", "duration-200");
    expect(rows()).toHaveLength(4);
  });

  it("collapses and expands from the header", async () => {
    setup();
    const header = screen.getByRole("button", { name: /Checklist/ });
    await userEvent.click(header);
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(rows()).toHaveLength(0);
    await userEvent.click(header);
    expect(rows()).toHaveLength(4);
  });

  it("toggling calls toggle_check, updates the bar and shows 'checked by' as a tooltip", async () => {
    const { client } = setup();
    expect(rows()[0]).toHaveAttribute("title", "Checked by Giorgi G. · Mar 5, 2025, 14:07");
    await userEvent.click(within(rows()[1]).getByRole("checkbox"));
    await waitFor(() =>
      expect(vi.mocked(axios.patch)).toHaveBeenCalledWith("/api/checklist-items/2/toggle_check/", {}, expect.objectContaining({ headers: { "X-Client-Mutation": expect.any(String) } })),
    );
    await waitFor(() => expect(document.querySelector<HTMLElement>('[data-slot="checklist-progress-bar"]')!.style.width).toBe("50%"));
    expect(cached(client).completed_checklist_items_count).toBe(2);
    await waitFor(() => expect(rows()[1]).toHaveAttribute("title", expect.stringContaining("Checked by Nino B.")));
    expect(within(rows()[1]).getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
  });

  it("remove has no confirm(): the row goes at once and the toast offers Undo, which re-creates it", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const { client } = setup();
    await userEvent.click(within(rows()[2]).getByRole("button", { name: "Remove item" }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(rows()).toHaveLength(3);
    await waitFor(() => expect(vi.mocked(axios.delete)).toHaveBeenCalledWith("/api/checklist-items/3/", expect.anything()));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith("Item removed", expect.objectContaining({ action: expect.objectContaining({ label: "Undo" }) })));
    const undo = toastMock.mock.calls[0][1].action.onClick as () => void;
    undo();
    await waitFor(() =>
      expect(vi.mocked(axios.post)).toHaveBeenCalledWith("/api/checklist-items/", { ticket: 10, text: "Patch pjsip.conf", position: 2 }, expect.anything()),
    );
    await waitFor(() => expect(rows()).toHaveLength(4));
    expect(rows()[2]).toHaveTextContent("Patch pjsip.conf");
    expect(cached(client).checklist_items_count).toBe(4);
  });

  it("double click edits inline; Enter saves the new text", async () => {
    setup();
    await userEvent.dblClick(within(rows()[1]).getByText("Compare session timers"));
    const input = screen.getByRole("textbox", { name: "Edit item" });
    await userEvent.clear(input);
    await userEvent.type(input, "Compare timers{Enter}");
    await waitFor(() =>
      expect(vi.mocked(axios.patch)).toHaveBeenCalledWith("/api/checklist-items/2/", { text: "Compare timers" }, expect.anything()),
    );
    expect(rows()[1]).toHaveTextContent("Compare timers");
  });

  it("Escape in the inline editor discards", async () => {
    setup();
    await userEvent.dblClick(within(rows()[1]).getByText("Compare session timers"));
    const input = screen.getByRole("textbox", { name: "Edit item" });
    await userEvent.type(input, " nope");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(rows()[1]).toHaveTextContent("Compare session timers");
    expect(vi.mocked(axios.patch)).not.toHaveBeenCalled();
  });

  it("Enter in the add row adds the item at the end and clears the input", async () => {
    setup();
    const add = screen.getByRole("textbox", { name: "Add an item" });
    await userEvent.type(add, "Call the customer back{Enter}");
    expect(add).toHaveValue("");
    await waitFor(() =>
      expect(vi.mocked(axios.post)).toHaveBeenCalledWith("/api/checklist-items/", { ticket: 10, text: "Call the customer back", position: 4 }, expect.anything()),
    );
    await waitFor(() => expect(rows()).toHaveLength(5));
    expect(rows()[4]).toHaveTextContent("Call the customer back");
    // Blank input adds nothing.
    await userEvent.type(add, "   {Enter}");
    expect(vi.mocked(axios.post)).toHaveBeenCalledTimes(1);
  });

  it("a drag reorder calls checklist reorder with the target position and reorders at once", async () => {
    setup();
    expect(dnd.onDragEnd).toBeTypeOf("function");
    dnd.onDragEnd!({ source: { index: 3 }, destination: { index: 0 }, draggableId: "checklist-item-4" });
    await waitFor(() => expect(rows()[0]).toHaveTextContent("Confirm with the customer"));
    await waitFor(() =>
      expect(vi.mocked(axios.patch)).toHaveBeenCalledWith("/api/checklist-items/4/reorder/", { position: 0 }, expect.anything()),
    );
    // A drop outside the list does nothing.
    dnd.onDragEnd!({ source: { index: 0 }, destination: null });
    expect(vi.mocked(axios.patch).mock.calls.filter(([u]) => String(u).endsWith("/reorder/"))).toHaveLength(1);
  });

  it("reorderTargetPosition uses the neighbour's position, or the index when positions collide", () => {
    const gappy = [item(1, "a", 0), item(2, "b", 5), item(3, "c", 10)];
    expect(reorderTargetPosition(gappy, 0, 2)).toBe(10);
    const flat = [item(1, "a", 0), item(2, "b", 0), item(3, "c", 0)];
    expect(reorderTargetPosition(flat, 0, 2)).toBe(2);
  });

  it("an empty list shows only the add row", () => {
    setup([]);
    expect(rows()).toHaveLength(0);
    expect(document.querySelector('[data-slot="checklist-progress"]')).toBeNull();
    expect(screen.getByRole("textbox", { name: "Add an item" })).toBeInTheDocument();
  });

  it("an error refetches the ticket and shows the translated toast", async () => {
    const { client } = setup();
    vi.mocked(axios.patch).mockRejectedValueOnce(Object.assign(new Error("x"), { response: { status: 403, data: {} } }));
    const spy = vi.spyOn(client, "invalidateQueries");
    await userEvent.click(within(rows()[1]).getByRole("checkbox"));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("You don't have permission to do that"));
    expect(spy).toHaveBeenCalledWith({ queryKey: tk.ticket(10) });
  });

  it("uses tokens only (no hard-coded gray/blue/green classes, W73) and has no subTicketId prop (W74)", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../../../../../src/app/(tenant)/tickets/[id]/_components/main/checklist-card.tsx"), "utf8");
    expect(src).not.toMatch(/\b(?:bg|text|border)-(?:gray|blue|green|slate|zinc)-\d{2,3}\b/);
    expect(src).not.toMatch(/subTicketId/);
  });
});
