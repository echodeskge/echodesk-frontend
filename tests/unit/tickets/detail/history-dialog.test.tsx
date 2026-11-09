/** FE-09 History & transfers dialog. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, within } from "@testing-library/react";

vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

import axios from "@/api/axios";
import { HistoryDialog, historySentence } from "@/app/(tenant)/tickets/[id]/_components/history-dialog";
import type { HistoryEntry } from "@/app/(tenant)/tickets/_lib/types";
import { page, renderDetail, routeAxios } from "./helpers";

const nino = { id: 4, email: "nino@x.ge", first_name: "Nino", last_name: "Beridze" } as unknown as HistoryEntry["user"];

function row(over: Partial<HistoryEntry>): HistoryEntry {
  return {
    id: 1,
    ticket: 10,
    action: "updated",
    field_name: "",
    old_value: "",
    new_value: "",
    description: "",
    user: nino,
    created_at: "2026-11-05T10:00:00Z",
    ...over,
  };
}

const ROWS: HistoryEntry[] = [
  row({ id: 1, action: "created", new_value: "Calls dropping", created_at: "2026-11-01T08:00:00Z" }),
  row({ id: 2, action: "priority_changed", field_name: "priority", old_value: "low", new_value: "high", created_at: "2026-11-02T09:30:00Z" }),
  row({ id: 3, action: "transferred", field_name: "board", old_value: "Support", new_value: "Sales", created_at: "2026-11-03T10:00:00Z" }),
  row({ id: 4, action: "due_date_changed", field_name: "due_date", old_value: "", new_value: "2026-11-12", user: null, created_at: "2026-11-04T10:00:00Z" }),
  row({ id: 5, action: "tag_added", field_name: "tags", new_value: "VIP", created_at: "2026-11-04T11:00:00Z" }),
];

beforeEach(() => {
  vi.clearAllMocks();
  routeAxios(axios, { get: { "/api/tickets/10/history/": () => ROWS } });
});

describe("HistoryDialog", () => {
  it("lists the /history/ rows newest first, with transfers, names and dates", async () => {
    renderDetail(<HistoryDialog ticketId={10} open onOpenChange={() => {}} />);
    const dialog = await screen.findByTestId("history-dialog");
    expect(within(dialog).getByRole("heading", { name: "History & transfers" })).toBeInTheDocument();
    const items = await within(dialog).findAllByRole("listitem");
    expect(items.map((li) => li.getAttribute("data-action"))).toEqual([
      "tag_added",
      "due_date_changed",
      "transferred",
      "priority_changed",
      "created",
    ]);
    expect(items[2]).toHaveTextContent("Nino Beridze transferred the ticket from Support to Sales");
    expect(items[3]).toHaveTextContent("Nino Beridze changed the priority from Low to High");
    expect(items[1]).toHaveTextContent("System changed the due date from — to Nov 12");
    expect(items[4].querySelector("time")).toHaveAttribute("dateTime", "2026-11-01T08:00:00Z");
    expect(items[4].querySelector("time")?.textContent).toMatch(/^Nov 1, \d\d:\d\d$/);
    expect(vi.mocked(axios.get)).toHaveBeenCalledWith("/api/tickets/10/history/");
  });

  it("Georgian dates and sentences", async () => {
    renderDetail(<HistoryDialog ticketId={10} open onOpenChange={() => {}} />, { locale: "ka" });
    const dialog = await screen.findByTestId("history-dialog");
    expect(within(dialog).getByRole("heading", { name: "ისტორია და გადატანები" })).toBeInTheDocument();
    const items = await within(dialog).findAllByRole("listitem");
    expect(items[2].textContent).toMatch(/Support/);
    expect(items[2].textContent).toMatch(/3 ნოე/);
    expect(items[2].textContent).not.toMatch(/transferred/);
  });

  it("empty state", async () => {
    routeAxios(axios, { get: { "/api/tickets/10/history/": () => [] } });
    renderDetail(<HistoryDialog ticketId={10} open onOpenChange={() => {}} />);
    expect(await screen.findByText("No history yet")).toBeInTheDocument();
  });

  it("names the column ids of status changes from the board's columns (W3 FE-INT)", async () => {
    routeAxios(axios, {
      get: {
        "/api/tickets/10/history/": () => [
          row({ id: 9, action: "status_changed", field_name: "column_id", old_value: "11", new_value: "12" }),
        ],
        "/api/columns/": () => page([{ id: 11, name: "To Do", position: 1 }, { id: 12, name: "In Progress", position: 2 }]),
        "/api/users/": () => page([]),
        "/api/boards/": () => ({ id: 1, order_users: [], board_users: [], board_groups: [] }),
        "/api/tags/": () => page([]),
        "/api/tenant-groups/": () => page([]),
        "/api/departments/": () => page([]),
      },
    });
    renderDetail(<HistoryDialog ticketId={10} boardId={1} open onOpenChange={() => {}} />);
    const dialog = await screen.findByTestId("history-dialog");
    const item = await within(dialog).findByText(/In Progress/);
    expect(item).toHaveTextContent(/To Do/);
    expect(item.textContent).not.toMatch(/\b11\b|\b12\b/);
  });

  it("does not fetch while closed", () => {
    renderDetail(<HistoryDialog ticketId={10} open={false} onOpenChange={() => {}} />);
    expect(vi.mocked(axios.get)).not.toHaveBeenCalled();
  });
});

describe("historySentence", () => {
  const t = (key: string, v?: Record<string, string | number>) => `${key}:${JSON.stringify(v ?? {})}`;
  const l = { t, tTickets: (k: string) => k, locale: "en" };

  it("uses the field label for generic updates", () => {
    expect(historySentence(row({ action: "updated", field_name: "title", old_value: "a", new_value: "b" }), l)).toBe(
      'events.updated:{"name":"Nino Beridze","field":"fields.title:{}","old":"a","new":"b"}',
    );
    expect(historySentence(row({ action: "updated", field_name: "weird" }), l)).toContain("events.updatedNoValue");
  });

  it("customer rows and unknown actions", () => {
    expect(historySentence(row({ action: "updated", field_name: "customer", new_value: "Acme" }), l)).toContain("events.customer");
    expect(historySentence(row({ action: "subticket_added" }), l)).toContain("events.other");
  });
});
