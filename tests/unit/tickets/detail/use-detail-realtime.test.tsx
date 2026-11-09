/** FE-09 board events → detail caches. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("next/navigation", async () => (await import("./helpers")).navigationMock);
vi.mock("@/app/(tenant)/tickets/_contexts/tickets-realtime-context", async () => (await import("./helpers")).realtimeMock);
vi.mock("sonner", () => ({ toast: toastMock }));

import { useDetailRealtime, needsRefetch, patchFromCard } from "@/app/(tenant)/tickets/[id]/_hooks/use-detail-realtime";
import { rememberMutation, _resetMutations } from "@/app/(tenant)/tickets/_lib/mutation-id";
import { tk } from "@/app/(tenant)/tickets/_lib/query-keys";
import type { BoardEvent, TicketCard, TicketDetail } from "@/app/(tenant)/tickets/_lib/types";
import { IntlProvider, makeTicket, nav, newClient, resetNav, resetRealtime, rt } from "./helpers";

const BACK = "/tickets?board=1";

const CARD: TicketCard = {
  id: 10,
  title: "New title",
  priority: "critical",
  column_id: 12,
  position_in_column: 0,
  is_order: false,
  is_closed: false,
  tags: [{ id: 3, name: "VIP", color: "#f00" }],
  assignees: [],
  comments_count: 4,
  attachments_count: 1,
  price: null,
  currency: null,
  is_paid: false,
  payment_due_date: null,
  created_at: "2026-11-05T10:00:00Z",
  updated_at: "2026-11-09T10:00:00Z",
  due_date: "2026-11-12",
  is_overdue_task: false,
  checklist_items_count: 2,
  completed_checklist_items_count: 1,
  description_preview: "",
};

function setup(locale: "en" | "ka" = "en") {
  const client = newClient();
  client.setQueryData(tk.ticket(10), makeTicket());
  const spy = vi.spyOn(client, "invalidateQueries");
  renderHook(() => useDetailRealtime({ ticketId: 10, backHref: BACK }), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>
        <IntlProvider locale={locale}>{children}</IntlProvider>
      </QueryClientProvider>
    ),
  });
  const emit = (e: BoardEvent) => rt.handler!(e);
  const invalidated = () => spy.mock.calls.map(([arg]) => JSON.stringify((arg as { queryKey: unknown }).queryKey));
  return { client, emit, spy, invalidated };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetNav();
  resetRealtime();
  _resetMutations();
});

describe("ticket_updated", () => {
  it("patches tk.ticket from the card at once (no refetch for card-only changes)", () => {
    const { client, emit, invalidated } = setup();
    emit({ type: "ticket_updated", ticket_id: 10, changes: { title: { old: "a", new: "New title" } }, card: CARD });
    const t = client.getQueryData<TicketDetail>(tk.ticket(10))!;
    expect(t.title).toBe("New title");
    expect(t.priority).toBe("critical");
    expect(t.tags).toEqual(CARD.tags);
    expect(t.due_date).toBe("2026-11-12");
    expect(invalidated()).not.toContain(JSON.stringify(tk.ticket(10)));
    expect(invalidated()).toContain(JSON.stringify(tk.activity(10)));
    expect(invalidated()).toContain(JSON.stringify(tk.history(10)));
  });

  it("patches from the changes without a card, and refetches what a card can't express", () => {
    const { client, emit, invalidated } = setup();
    emit({
      type: "ticket_updated",
      ticket_id: 10,
      changes: { title: { old: "a", new: "From changes" }, assignees: { old: [], new: [{ id: 4, name: "G" }] } },
    });
    expect(client.getQueryData<TicketDetail>(tk.ticket(10))!.title).toBe("From changes");
    expect(invalidated()).toContain(JSON.stringify(tk.ticket(10)));
  });

  it("ignores other tickets", () => {
    const { client, emit } = setup();
    emit({ type: "ticket_updated", ticket_id: 99, changes: { title: { old: "a", new: "x" } }, card: { ...CARD, id: 99 } });
    expect(client.getQueryData<TicketDetail>(tk.ticket(10))!.title).toBe("Calls dropping after 30 seconds");
  });

  it("ignores this tab's own mutation echo", () => {
    const { client, emit } = setup();
    rememberMutation("mine");
    emit({ type: "ticket_updated", ticket_id: 10, changes: { title: { old: "a", new: "x" } }, card: CARD, client_mutation_id: "mine" });
    expect(client.getQueryData<TicketDetail>(tk.ticket(10))!.title).toBe("Calls dropping after 30 seconds");
  });
});

describe("ticket_activity", () => {
  it("invalidates the activity; timer also invalidates the timer caches", () => {
    const { emit, invalidated } = setup();
    emit({ type: "ticket_activity", ticket_id: 10, kind: "timer" });
    expect(invalidated()).toEqual(
      expect.arrayContaining([JSON.stringify(tk.activity(10)), JSON.stringify(tk.timer(10)), JSON.stringify(tk.timerCurrent())]),
    );
    expect(invalidated()).not.toContain(JSON.stringify(tk.ticket(10)));
  });

  it("checklist / attachment changes refetch the ticket too", () => {
    const { emit, invalidated } = setup();
    emit({ type: "ticket_activity", ticket_id: 10, kind: "checklist" });
    expect(invalidated()).toContain(JSON.stringify(tk.ticket(10)));
    expect(invalidated()).not.toContain(JSON.stringify(tk.timer(10)));
  });

  it("comments refetch the activity", () => {
    const { emit, invalidated } = setup();
    emit({ type: "ticket_commented", ticket_id: 10, comment: null });
    expect(invalidated()).toContain(JSON.stringify(tk.activity(10)));
  });
});

describe("ticket_deleted / moved", () => {
  it("deleted: a translated toast and back to the board", () => {
    const { emit } = setup();
    emit({ type: "ticket_deleted", ticket_id: 10, reason: "deleted", deleted_by_name: "Nino" });
    expect(toastMock.info).toHaveBeenCalledWith("Nino deleted this ticket");
    expect(nav.push).toHaveBeenCalledWith(BACK);
  });

  it("deleted without a name (ka)", () => {
    const { emit } = setup("ka");
    emit({ type: "ticket_deleted", ticket_id: 10 });
    expect(toastMock.info).toHaveBeenCalledWith("ეს ბილეთი წაიშალა");
  });

  it("transferred: refetch and follow the ticket to the new board, no redirect", () => {
    const { emit, invalidated } = setup();
    emit({ type: "ticket_deleted", ticket_id: 10, reason: "transferred", to_board_id: 2 });
    expect(invalidated()).toContain(JSON.stringify(tk.ticket(10)));
    expect(rt.setBoardId).toHaveBeenCalledWith(2);
    expect(nav.push).not.toHaveBeenCalled();
    expect(toastMock.info).not.toHaveBeenCalled();
  });

  it("moved: refetch the ticket; any board change refetches the navigation", () => {
    const { emit, invalidated } = setup();
    emit({ type: "ticket_moved", ticket_id: 10, from_column_id: 11, to_column_id: 12 });
    expect(invalidated()).toContain(JSON.stringify(tk.ticket(10)));
    expect(invalidated()).toContain(JSON.stringify(["ticketNav"]));
  });

  it("another ticket created on the board refetches the navigation only", () => {
    const { emit, invalidated } = setup();
    emit({ type: "ticket_created", ticket: { ...CARD, id: 55 } });
    expect(invalidated()).toEqual([JSON.stringify(["ticketNav"])]);
  });
});

describe("helpers", () => {
  it("needsRefetch", () => {
    expect(needsRefetch({ type: "ticket_updated", ticket_id: 1, changes: { title: { old: 1, new: 2 } } })).toBe(false);
    expect(needsRefetch({ type: "ticket_updated", ticket_id: 1, changes: { description: { old: 1, new: 2 } } })).toBe(true);
    expect(needsRefetch({ type: "ticket_updated", ticket_id: 1, changes: {} })).toBe(true);
  });

  it("patchFromCard keeps fields the card doesn't carry", () => {
    const prev = makeTicket({ description: "<p>x</p>" });
    const next = patchFromCard(prev, CARD, { type: "ticket_updated", ticket_id: 10, changes: {} });
    expect(next.description).toBe("<p>x</p>");
    expect(next.comments_count).toBe(4);
  });
});
