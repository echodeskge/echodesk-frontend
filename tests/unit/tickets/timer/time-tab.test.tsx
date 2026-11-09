/**
 * FE-13 Time tab: logged time (entries with who / "Deleted user", duration,
 * start–end, running flag; per-person totals) and time in status
 * (`ticket_summary` by_column, total, the active column with a live counter
 * when the current column has track_time; W84, critic 13); empty states.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";

vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

import axios from "@/api/axios";
import { TimeTab } from "@/app/(tenant)/tickets/_components/timer/time-tab";
import type { TicketDetail, TimerState, TimeSummary } from "@/app/(tenant)/tickets/_lib/types";
import { ME, NINO, SERVER_NOW, entry, renderTimer, routeAxios, snapshot, summary } from "./helpers";

function ticket(trackTime: boolean, columnId = 12) {
  return {
    id: 10,
    column: { id: columnId, name: "In progress", color: "#f59e0b", is_closed_status: false, track_time: trackTime },
  } as unknown as TicketDetail;
}

function setup(timer: TimerState, sum: TimeSummary, t: TicketDetail = ticket(true)) {
  routeAxios(axios, {
    get: {
      "/api/tickets/10/timer/": () => timer,
      "/api/time-logs/ticket_summary/": () => sum,
      "/api/tickets/10/": () => t,
    },
  });
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

const ACTIVE = {
  log_id: 3,
  column: { id: 12, name: "In progress", color: "#f59e0b" },
  entered_at: "2026-11-09T09:58:00Z",
  elapsed_seconds: 120,
};

describe("TimeTab: logged time", () => {
  it("lists entries with who, start–end and duration, and per-person totals", async () => {
    const e1 = entry({ id: 1, user: ME, started_at: "2026-11-09T08:00:00Z", ended_at: "2026-11-09T09:20:00Z", duration_seconds: 4800 });
    const e2 = entry({ id: 2, user: null, started_at: "2026-11-08T08:00:00Z", ended_at: "2026-11-08T08:45:00Z", duration_seconds: 2700 });
    setup(
      snapshot({
        entries: [e1, e2],
        total_seconds: 7500,
        my_total_seconds: 4800,
        by_user: [
          { user: ME, seconds: 4800 },
          { user: null, seconds: 2700 },
        ],
      }),
      summary(),
    );
    renderTimer(<TimeTab ticketId={10} />);
    const rows = await screen.findAllByTestId("time-entry");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Giorgi G.");
    expect(rows[0]).toHaveTextContent("1h 20m");
    // Times are shown in the browser's zone; the range separator and end time are there.
    expect(rows[0].textContent).toMatch(/Nov 9, \d\d:\d\d – \d\d:\d\d/);
    expect(rows[1]).toHaveTextContent("Deleted user");
    expect(rows[1]).toHaveTextContent("45m");
    const byUser = screen.getByTestId("time-by-user");
    expect(within(byUser).getAllByRole("listitem")).toHaveLength(2);
    expect(byUser).toHaveTextContent("Giorgi G.1h 20m");
    expect(byUser).toHaveTextContent("Deleted user45m");
    expect(screen.getByTestId("time-logged-total")).toHaveTextContent("Total 2h 5m");
  });

  it("flags a running entry and ticks its duration from server_now (RM1)", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    vi.setSystemTime(new Date("2031-01-01T00:00:00Z")); // a wildly wrong client clock
    const run = entry({ id: 3, user: NINO, started_at: "2026-11-09T09:59:00Z", ended_at: null, duration_seconds: 0, is_running: true });
    setup(snapshot({ entries: [run], total_seconds: 60, by_user: [{ user: NINO, seconds: 60 }] }), summary());
    renderTimer(<TimeTab ticketId={10} />);
    const row = await screen.findByTestId("time-entry");
    expect(row).toHaveAttribute("data-running", "true");
    expect(row).toHaveTextContent("Running");
    expect(row).toHaveTextContent("1m");
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(row).toHaveTextContent("1m 30s");
    expect(screen.getByTestId("time-by-user")).toHaveTextContent("Nino Beridze1m 30s");
  });

  it("shows the empty state when nothing is logged", async () => {
    setup(snapshot(), summary());
    renderTimer(<TimeTab ticketId={10} />);
    expect(await screen.findByTestId("time-logged-empty")).toHaveTextContent("No time logged yet");
    expect(screen.queryByTestId("time-logged-total")).not.toBeInTheDocument();
  });
});

describe("TimeTab: time in status", () => {
  it("lists the per-column durations and the total", async () => {
    setup(
      snapshot(),
      summary({
        total_seconds: 5400,
        by_column: [
          { column_id: 11, column_name: "To do", column_color: "#6b7280", total_seconds: 3600, sessions: 2 },
          { column_id: 12, column_name: "In progress", column_color: "#f59e0b", total_seconds: 1800, sessions: 1 },
        ],
      }),
    );
    renderTimer(<TimeTab ticketId={10} />);
    const rows = await screen.findAllByTestId("time-status-row");
    expect(rows[0]).toHaveTextContent("To do");
    expect(rows[0]).toHaveTextContent("2 sessions");
    expect(rows[0]).toHaveTextContent("1h");
    expect(rows[1]).toHaveTextContent("1 session");
    expect(rows[1]).toHaveTextContent("30m");
    expect(screen.getByTestId("time-status-total")).toHaveTextContent("Total 1h 30m");
  });

  it("shows the current column with a live counter when it has track_time", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    setup(snapshot(), summary({ total_seconds: 600, active: ACTIVE }), ticket(true));
    renderTimer(<TimeTab ticketId={10} />);
    const active = await screen.findByTestId("time-status-active");
    await waitFor(() => expect(active).toHaveAttribute("data-live", "true"));
    expect(active).toHaveTextContent("Currently in In progress");
    expect(active).toHaveTextContent("2m");
    expect(screen.getByTestId("time-status-total")).toHaveTextContent("Total 12m");
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(active).toHaveTextContent("2m 15s");
  });

  it("shows no counter when the current column doesn't track time", async () => {
    setup(snapshot(), summary({ active: ACTIVE }), ticket(false));
    renderTimer(<TimeTab ticketId={10} />);
    const active = await screen.findByTestId("time-status-active");
    await waitFor(() => expect(active).toHaveTextContent("Time isn't tracked in this status"));
    expect(active).not.toHaveAttribute("data-live");
  });

  it("shows the empty state with no status history", async () => {
    setup(snapshot(), summary());
    renderTimer(<TimeTab ticketId={10} />);
    expect(await screen.findByTestId("time-status-empty")).toHaveTextContent("No time in status recorded yet");
  });

  it("is translated in Georgian", async () => {
    setup(
      snapshot({ entries: [entry({ user: null })], total_seconds: 3600, by_user: [{ user: null, seconds: 3600 }] }),
      summary({ by_column: [{ column_id: 11, column_name: "To do", column_color: "#6b7280", total_seconds: 60, sessions: 1 }], total_seconds: 60 }),
    );
    renderTimer(<TimeTab ticketId={10} />, { locale: "ka" });
    expect(await screen.findByTestId("time-entry")).toHaveTextContent("წაშლილი მომხმარებელი");
    expect(screen.getByTestId("time-entry")).toHaveTextContent("1 სთ");
    expect(screen.getByText("დაფიქსირებული დრო")).toBeInTheDocument();
    expect(await screen.findByText("დრო სტატუსებში")).toBeInTheDocument();
    expect(screen.getByTestId("time-entry").textContent).toMatch(/9 ნოე/);
  });
});

void SERVER_NOW;
