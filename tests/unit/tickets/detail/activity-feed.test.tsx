/** FE-11 activity feed. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";

const h = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock("next/navigation", async () => (await import("./helpers")).navigationMock);
vi.mock("@/app/(tenant)/tickets/_contexts/tickets-realtime-context", async () => (await import("./helpers")).realtimeMock);
vi.mock("@/hooks/useUserProfile", async () => (await import("./fe11-helpers")).profileMock);
vi.mock("sonner", () => ({ toast: h.toast }));

import axios from "@/api/axios";
import { ActivityFeed } from "@/app/(tenant)/tickets/[id]/_components/activity/activity-feed";
import { useDetailRealtime } from "@/app/(tenant)/tickets/[id]/_hooks/use-detail-realtime";
import { tk } from "@/app/(tenant)/tickets/_lib/query-keys";
import type { ActivityItem } from "@/app/(tenant)/tickets/_lib/types";
import { COLUMNS, PERMS_ALL, makeTicket, page, renderDetail, resetRealtime, routeAxios, rt, type Route } from "./helpers";
import { AGENT, STAFF, USERS, comment, event, setProfile } from "./fe11-helpers";

const ticket = makeTicket({ updated_at: "2026-11-09T11:58:00Z" });

const FEED: ActivityItem[] = [
  event({ id: "event-1", action: "created", created_at: "2026-11-05T09:12:00Z" }),
  event({
    id: "event-2",
    action: "status_changed",
    field_name: "column_id",
    old_value: "11",
    new_value: "12",
    created_at: "2026-11-06T09:13:00Z",
  }),
  comment({ id: "comment-1", comment_id: 1, text: "Internal one @giorgi@demo.ge.", is_internal: true, created_at: "2026-11-08T08:00:00Z" }),
  event({
    id: "event-3",
    action: "updated",
    field_name: "title",
    old_value: "<b>Old</b> &amp; title",
    new_value: "New title",
    created_at: "2026-11-08T09:00:00Z",
    user: { id: null, name: "System", email: "", initials: "" },
  }),
  comment({
    id: "comment-2",
    comment_id: 2,
    text: "Customer confirms.",
    is_internal: false,
    edited: true,
    created_at: "2026-11-09T11:00:00Z",
    user: { id: 1, name: "Nino Beridze", email: "admin@demo.ge", initials: "NB" },
  }),
];

let feed: ActivityItem[];
let activityCalls = 0;
const patchRoute = vi.fn<Route>();
const deleteRoute = vi.fn<Route>();

function routes(extra: { timerEntries?: number } = {}) {
  routeAxios(axios, {
    get: {
      "/api/tickets/10/activity/": () => {
        activityCalls += 1;
        return feed;
      },
      "/api/tickets/10/timer/": () => ({
        running: null,
        my_total_seconds: 0,
        total_seconds: 0,
        server_now: "2026-11-09T12:00:00Z",
        by_user: [],
        entries: Array.from({ length: extra.timerEntries ?? 2 }, (_, i) => ({ id: i + 1 })),
      }),
      "/api/tickets/10/": () => ticket,
      "/api/columns/": () => page(COLUMNS),
      "/api/users/": () => page(USERS),
      "/api/boards/1/": () => ({ id: 1, board_users: [], board_groups: [], order_users: [] }),
      "/api/tags/": () => page([]),
      "/api/tenant-groups/": () => page([]),
      "/api/departments/": () => page([]),
    },
    patch: { "/api/comments/": patchRoute },
    delete: { "/api/comments/": deleteRoute },
  });
}

function renderFeed(locale: "en" | "ka" = "en") {
  const utils = renderDetail(<ActivityFeed ticketId={10} perms={PERMS_ALL} />, { locale });
  utils.client.setQueryData(tk.ticket(10), ticket);
  return utils;
}

beforeEach(() => {
  vi.clearAllMocks();
  feed = [...FEED];
  activityCalls = 0;
  setProfile(STAFF);
  resetRealtime();
  routes();
  patchRoute.mockImplementation((url, body) => ({ id: 2, comment: (body as { comment: string }).comment }));
  deleteRoute.mockImplementation((url) => {
    const id = Number(String(url).match(/(\d+)\/$/)?.[1]);
    feed = feed.filter((i) => !(i.type === "comment" && i.comment_id === id));
    return null;
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ActivityFeed", () => {
  it("shows the tabs with counts; Time counts the time entries", async () => {
    renderFeed();
    const tabs = await screen.findByRole("tablist");
    await waitFor(() => expect(within(tabs).getByRole("tab", { name: /All/ })).toHaveTextContent("All5"));
    expect(within(tabs).getByRole("tab", { name: /Comments/ })).toHaveTextContent("Comments2");
    expect(within(tabs).getByRole("tab", { name: /History/ })).toHaveTextContent("History3");
    await waitFor(() => expect(within(tabs).getByRole("tab", { name: /Time/ })).toHaveTextContent("Time2"));
    expect(within(tabs).getByRole("tab", { name: /All/ })).toHaveAttribute("aria-selected", "true");
  });

  it("filters per tab and renders the Time tab from FE-13", async () => {
    renderFeed();
    await screen.findByText("Customer confirms.");
    fireEvent.click(screen.getByRole("tab", { name: /Comments/ }));
    expect(document.querySelectorAll('[data-slot="feed-event"]').length).toBe(0);
    expect(document.querySelectorAll('[data-slot="feed-comment"]').length).toBe(2);
    fireEvent.click(screen.getByRole("tab", { name: /History/ }));
    expect(document.querySelectorAll('[data-slot="feed-comment"]').length).toBe(0);
    expect(document.querySelectorAll('[data-slot="feed-event"]').length).toBe(3);
    fireEvent.click(screen.getByRole("tab", { name: /Time/ }));
    expect(document.querySelector('[data-slot="time-tab"]')).toHaveAttribute("data-ticket-id", "10");
  });

  it("'Updated {relative}' uses ticket.updated_at and re-renders every 60s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date("2026-11-09T12:00:00Z") });
    renderFeed();
    const label = await screen.findByText(/^Updated /);
    expect(label).toHaveTextContent("Updated 2m");
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText(/^Updated /)).toHaveTextContent("Updated 3m");
  });

  it("renders event rows as '**who** action' with column names, stripped HTML and System", async () => {
    renderFeed();
    await screen.findByText("Customer confirms.");
    const events = Array.from(document.querySelectorAll('[data-slot="feed-event"]'));
    expect(events.map((e) => e.getAttribute("data-action"))).toEqual(["created", "status_changed", "updated"]);
    expect(events[0]).toHaveTextContent("Nino Beridze created the ticket");
    expect(events[0].querySelector(".font-medium")).toHaveTextContent("Nino Beridze");
    await waitFor(() => expect(events[1]).toHaveTextContent("Nino Beridze moved the ticket from To do to In progress"));
    expect(events[2]).toHaveTextContent("System changed the title from Old & title to New title");
    expect(events[2].innerHTML).not.toContain("<b>");
    const avatar = events[0].querySelector('[data-slot="feed-event-avatar"]')!;
    expect(avatar).toHaveTextContent("NB");
    expect(avatar.className).toMatch(/size-4/);
    expect(avatar.className).toMatch(/bg-primary\/10/);
  });

  it("renders comment rows: primary/0.1 avatar, Internal badge, amber vs muted bubble, (edited)", async () => {
    renderFeed();
    await screen.findByText("Customer confirms.");
    const [internal, pub] = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="feed-comment"]'));
    const avatar = internal.querySelector('[data-slot="feed-comment-avatar"]')!;
    expect(avatar.className).toMatch(/size-7/);
    expect(avatar.className).toMatch(/bg-primary\/10/);
    expect(avatar.className).toMatch(/text-primary/);
    expect(within(internal).getByText("Levan Maisuradze")).toBeInTheDocument();
    const badge = internal.querySelector('[data-slot="internal-badge"]')!;
    expect(badge).toHaveTextContent("Internal");
    expect(badge.className).toMatch(/dark:text-amber-400/);
    expect(internal.querySelector('[data-slot="comment-bubble"]')!.className).toMatch(/bg-\[#f59e0b0f\]/);
    expect(pub.querySelector('[data-slot="internal-badge"]')).toBeNull();
    expect(pub.querySelector('[data-slot="comment-bubble"]')!.className).toMatch(/bg-muted/);
    expect(pub).toHaveTextContent("(edited)");
    expect(internal).not.toHaveTextContent("(edited)");
  });

  it("highlights @email mentions as chips with the user's name", async () => {
    renderFeed();
    const chip = await waitFor(() => {
      const el = document.querySelector('[data-slot="mention"]');
      expect(el).toHaveTextContent("@Giorgi Kapanadze");
      return el!;
    });
    expect(chip).toHaveAttribute("title", "giorgi@demo.ge");
    expect(chip.parentElement).toHaveTextContent("Internal one @Giorgi Kapanadze.");
  });

  it("lets the author edit their own comment (staff may change any)", async () => {
    setProfile(AGENT);
    renderFeed();
    await screen.findByText("Customer confirms.");
    const [own, other] = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="feed-comment"]'));
    expect(within(own).getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(within(other).queryByRole("button", { name: "Edit" })).toBeNull();

    fireEvent.click(within(own).getByRole("button", { name: "Edit" }));
    const box = within(own).getByRole("textbox", { name: "Edit" });
    fireEvent.change(box, { target: { value: "Edited text" } });
    fireEvent.click(within(own).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(patchRoute).toHaveBeenCalled());
    const [url, body, config] = patchRoute.mock.calls[0];
    expect(url).toBe("/api/comments/1/");
    expect(body).toEqual({ comment: "Edited text" });
    expect((config as { headers: Record<string, string> }).headers["X-Client-Mutation"]).toBeTruthy();
  });

  it("staff can delete any comment after confirming", async () => {
    renderFeed();
    await screen.findByText("Customer confirms.");
    const [first] = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="feed-comment"]'));
    fireEvent.click(within(first).getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Delete this comment?");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleteRoute).toHaveBeenCalledWith("/api/comments/1/", expect.anything(), undefined));
    await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith("Comment deleted"));
    await waitFor(() => expect(screen.queryByText(/Internal one/)).toBeNull());
  });

  it("shows the empty state", async () => {
    feed = [];
    routes({ timerEntries: 0 });
    renderFeed();
    expect(await screen.findByText("No activity yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Comments/ }));
    expect(screen.getByText("No comments yet")).toBeInTheDocument();
  });

  it("scrolls to a #comment hash on the first load only", async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    window.location.hash = "#comment-2";
    const { client } = renderFeed();
    await screen.findByText("Customer confirms.");
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));
    await act(async () => {
      await client.invalidateQueries({ queryKey: tk.activity(10) });
    });
    await new Promise((r) => setTimeout(r, 30));
    expect(scroll).toHaveBeenCalledTimes(1);
    window.location.hash = "";
  });

  it("a live ticket_activity event refetches the feed", async () => {
    function Live() {
      useDetailRealtime({ ticketId: 10, backHref: "/tickets?board=1" });
      return <ActivityFeed ticketId={10} perms={PERMS_ALL} />;
    }
    renderDetail(<Live />);
    await screen.findByText("Customer confirms.");
    const before = activityCalls;
    feed = [...FEED, comment({ id: "comment-3", comment_id: 3, text: "Live from another tab" })];
    await act(async () => {
      rt.handler!({ type: "ticket_activity", ticket_id: 10, kind: "comment", actor_id: 3, client_mutation_id: null });
    });
    expect(await screen.findByText("Live from another tab")).toBeInTheDocument();
    expect(activityCalls).toBeGreaterThan(before);
  });

  it("renders Georgian labels", async () => {
    renderFeed("ka");
    const tabs = await screen.findByRole("tablist");
    expect(tabs).toHaveTextContent("ყველა");
    await screen.findByText("Customer confirms.");
    expect(document.querySelector('[data-slot="internal-badge"]')!.textContent).not.toMatch(/Internal/);
  });
});
