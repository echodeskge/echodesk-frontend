/**
 * FE-13 header timer button: idle total via formatTimer (DC21), running tick
 * from server_now + local offset (RM1), start / stop, the 409 switch dialog,
 * the ticket_closed toast, the 8-hour warning and the timerCurrent
 * invalidation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/tickets/10",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock("sonner", () => ({ toast: toastMock }));

import axios from "@/api/axios";
import { TimerButton } from "@/app/(tenant)/tickets/_components/timer/timer-button";
import { tk } from "@/app/(tenant)/tickets/_lib/query-keys";
import { _resetMutations } from "@/app/(tenant)/tickets/_lib/mutation-id";
import type { TicketDetail, TimerState } from "@/app/(tenant)/tickets/_lib/types";
import { ME, SERVER_NOW, entry, httpError, newClient, renderTimer, routeAxios, snapshot } from "./helpers";

const post = axios.post as unknown as ReturnType<typeof vi.fn>;
const get = axios.get as unknown as ReturnType<typeof vi.fn>;

const TICKET = { id: 10, column: { id: 12, name: "In progress", is_closed_status: false, track_time: true } } as unknown as TicketDetail;

let timerState: TimerState;

function setup(state: TimerState, post: Record<string, (url: string, body?: unknown) => unknown> = {}) {
  timerState = state;
  routeAxios(axios, {
    get: {
      "/api/tickets/10/timer/": () => timerState,
      "/api/tickets/10/": () => TICKET,
    },
    post,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  _resetMutations();
});

afterEach(() => {
  vi.useRealTimers();
});

async function button() {
  const b = await screen.findByTestId("timer-button");
  await waitFor(() => expect(b).not.toBeDisabled());
  return b;
}

describe("TimerButton: idle", () => {
  it("shows Play and 00:00:00 when I have no time on the ticket (DC21)", async () => {
    setup(snapshot());
    renderTimer(<TimerButton ticketId={10} />);
    const b = await button();
    expect(b).toHaveAttribute("aria-label", "Start timer");
    expect(b).toHaveAttribute("aria-pressed", "false");
    expect(b).toHaveAttribute("data-running", "false");
    expect(screen.getByTestId("timer-text")).toHaveTextContent("00:00:00");
    expect(screen.getByTestId("timer-text").className).toMatch(/font-mono/);
    expect(screen.getByTestId("timer-text").className).toMatch(/tabular-nums/);
  });

  it("phones: idle with nothing logged is a Play square; any logged time shows the clock (W3 FE-INT)", async () => {
    setup(snapshot());
    const { unmount } = renderTimer(<TimerButton ticketId={10} />);
    const b = await button();
    expect(b.className).toMatch(/max-sm:w-7/);
    expect(screen.getByTestId("timer-text").className).toMatch(/max-sm:hidden/);
    unmount();
    setup(snapshot({ my_total_seconds: 60 }));
    renderTimer(<TimerButton ticketId={10} />);
    const b2 = await button();
    expect(b2.className).not.toMatch(/max-sm:w-7/);
    expect(screen.getByTestId("timer-text").className).not.toMatch(/max-sm:hidden/);
  });

  it("shows my total through formatTimer, not the ticket total", async () => {
    setup(snapshot({ my_total_seconds: 3725, total_seconds: 99999 }));
    renderTimer(<TimerButton ticketId={10} />);
    await button();
    expect(screen.getByTestId("timer-text")).toHaveTextContent("01:02:05");
  });

  it("is 28px high with the design paddings (D104)", async () => {
    setup(snapshot());
    renderTimer(<TimerButton ticketId={10} />);
    const b = await button();
    for (const cls of ["h-7", "px-2.5", "gap-1.5", "rounded-md", "border", "text-xs", "font-medium"]) {
      expect(b.className.split(/\s+/)).toContain(cls);
    }
  });

  it("is disabled until the timer has loaded", async () => {
    setup(snapshot());
    get.mockImplementation(() => new Promise(() => {}));
    renderTimer(<TimerButton ticketId={10} />);
    expect(screen.getByTestId("timer-button")).toBeDisabled();
    expect(screen.getByTestId("timer-text")).toHaveTextContent("00:00:00");
  });
});

describe("TimerButton: robustness", () => {
  it("survives a malformed timer payload (shows 00:00:00)", async () => {
    routeAxios(axios, { get: { "/api/tickets/10/timer/": () => ({ detail: "x" }), "/api/tickets/10/": () => TICKET } });
    renderTimer(<TimerButton ticketId={10} />);
    await button();
    expect(screen.getByTestId("timer-text")).toHaveTextContent("00:00:00");
  });
});

describe("TimerButton: running (RM1)", () => {
  it("ticks every second from server_now + the local offset, whatever the client clock says", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    // The client clock is three hours and a bit ahead of the server.
    vi.setSystemTime(new Date("2026-11-09T13:17:42Z"));
    const run = entry({ id: 5, started_at: "2026-11-09T09:59:50Z", ended_at: null, duration_seconds: 0, is_running: true });
    // my_total already includes the 10s of the running entry at server_now.
    setup(snapshot({ running: run, entries: [run], my_total_seconds: 70, total_seconds: 70, by_user: [{ user: ME, seconds: 70 }] }));
    renderTimer(<TimerButton ticketId={10} />);
    const b = await button();
    expect(b).toHaveAttribute("data-running", "true");
    expect(b).toHaveAttribute("aria-label", "Stop timer");
    expect(b).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("timer-text")).toHaveTextContent("00:01:10");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("timer-text")).toHaveTextContent("00:01:11");
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByTestId("timer-text")).toHaveTextContent("00:01:15");
  });

  it("uses the running background and foreground colours", async () => {
    const run = entry({ id: 5, started_at: SERVER_NOW, ended_at: null, duration_seconds: 0, is_running: true });
    setup(snapshot({ running: run, entries: [run] }));
    renderTimer(<TimerButton ticketId={10} />);
    const b = await button();
    expect(b.className).toMatch(/\bbg-primary\b/);
    expect(b.className).toMatch(/\btext-primary-foreground\b/);
  });

  it("warns after an 8-hour run and suggests stopping", async () => {
    const run = entry({ id: 5, started_at: "2026-11-09T01:59:00Z", ended_at: null, duration_seconds: 0, is_running: true });
    setup(snapshot({ running: run, entries: [run], my_total_seconds: 8 * 3600 + 60 }));
    renderTimer(<TimerButton ticketId={10} />);
    const b = await button();
    expect(b).toHaveAttribute("data-long-running", "true");
    expect(b).toHaveTextContent("Running for more than 8 hours. Stop it if you're done.");
    expect(b.className).toMatch(/bg-amber-500/);
  });

  it("does not warn before 8 hours", async () => {
    const run = entry({ id: 5, started_at: "2026-11-09T02:01:00Z", ended_at: null, duration_seconds: 0, is_running: true });
    setup(snapshot({ running: run, entries: [run] }));
    renderTimer(<TimerButton ticketId={10} />);
    const b = await button();
    expect(b).not.toHaveAttribute("data-long-running");
  });
});

describe("TimerButton: start and stop", () => {
  it("start calls timerStart and invalidates tk.timer and tk.timerCurrent", async () => {
    const started = entry({ id: 9, started_at: SERVER_NOW, ended_at: null, duration_seconds: 0, is_running: true });
    setup(snapshot(), {
      "/api/tickets/10/timer/start/": () => {
        timerState = snapshot({ running: started, entries: [started] });
        return started;
      },
    });
    const client = newClient();
    const spy = vi.spyOn(client, "invalidateQueries");
    renderTimer(<TimerButton ticketId={10} />, { client });
    await userEvent.click(await button());
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/tickets/10/timer/start/", {}, expect.anything()));
    const [, , config] = post.mock.calls[0];
    expect((config as { headers: Record<string, string> }).headers["X-Client-Mutation"]).toBeTruthy();
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: tk.timerCurrent() }));
    expect(spy).toHaveBeenCalledWith({ queryKey: tk.timer(10) });
    // Running once the write lands (optimistic set, then the refetch).
    await waitFor(() => expect(screen.getByTestId("timer-button")).toHaveAttribute("data-running", "true"));
  });

  it("stop calls timerStop and invalidates tk.timerCurrent", async () => {
    const run = entry({ id: 5, started_at: SERVER_NOW, ended_at: null, duration_seconds: 0, is_running: true });
    setup(snapshot({ running: run, entries: [run], my_total_seconds: 30 }), {
      "/api/tickets/10/timer/stop/": () => ({ ...run, ended_at: SERVER_NOW, is_running: false, duration_seconds: 30 }),
    });
    const client = newClient();
    const spy = vi.spyOn(client, "invalidateQueries");
    renderTimer(<TimerButton ticketId={10} />, { client });
    await userEvent.click(await button());
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/tickets/10/timer/stop/", {}, expect.anything()));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: tk.timerCurrent() }));
  });

  it("a 409 ticket_closed shows a translated toast and opens no dialog", async () => {
    setup(snapshot(), {
      "/api/tickets/10/timer/start/": () => {
        throw httpError(409, { code: "ticket_closed" });
      },
    });
    renderTimer(<TimerButton ticketId={10} />);
    await userEvent.click(await button());
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("The timer can't run on a closed ticket"));
    expect(screen.queryByTestId("timer-switch-dialog")).not.toBeInTheDocument();
  });

  it("another failure shows the generic error toast", async () => {
    setup(snapshot(), {
      "/api/tickets/10/timer/start/": () => {
        throw httpError(500);
      },
    });
    renderTimer(<TimerButton ticketId={10} />);
    await userEvent.click(await button());
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Couldn't update the timer"));
  });

  it("refetches the timer when the ticket moves to another column (server stops timers in closed columns)", async () => {
    setup(snapshot());
    const { client } = renderTimer(<TimerButton ticketId={10} />);
    await button();
    const timerGets = () => get.mock.calls.filter(([u]) => u === "/api/tickets/10/timer/").length;
    await waitFor(() => expect(client.getQueryData(tk.ticket(10))).toBeTruthy());
    const before = timerGets();
    act(() => {
      client.setQueryData(tk.ticket(10), {
        ...TICKET,
        column: { id: 13, name: "Done", is_closed_status: true, track_time: false },
      });
    });
    await waitFor(() => expect(timerGets()).toBeGreaterThan(before));
  });
});

describe("TimerButton: optimistic moves", () => {
  it("refetches again when the server saves the ticket in a closed column (after an optimistic move)", async () => {
    setup(snapshot());
    const { client } = renderTimer(<TimerButton ticketId={10} />);
    await button();
    const timerGets = () => get.mock.calls.filter(([u]) => u === "/api/tickets/10/timer/").length;
    await waitFor(() => expect(client.getQueryData(tk.ticket(10))).toBeTruthy());
    const closed = { id: 13, name: "Done", is_closed_status: true, track_time: false };
    act(() => {
      client.setQueryData(tk.ticket(10), { ...TICKET, column: closed, updated_at: "2026-11-09T10:00:00Z" });
    });
    await waitFor(() => expect(timerGets()).toBe(2));
    // The move_to_column response lands: same column, new updated_at.
    act(() => {
      client.setQueryData(tk.ticket(10), { ...TICKET, column: closed, updated_at: "2026-11-09T10:00:01Z" });
    });
    await waitFor(() => expect(timerGets()).toBe(3));
  });

  it("does not refetch on saves while the ticket stays in an open column", async () => {
    setup(snapshot());
    const { client } = renderTimer(<TimerButton ticketId={10} />);
    await button();
    const timerGets = () => get.mock.calls.filter(([u]) => u === "/api/tickets/10/timer/").length;
    await waitFor(() => expect(client.getQueryData(tk.ticket(10))).toBeTruthy());
    act(() => {
      client.setQueryData(tk.ticket(10), { ...TICKET, updated_at: "2026-11-09T10:00:01Z" });
    });
    act(() => {
      client.setQueryData(tk.ticket(10), { ...TICKET, updated_at: "2026-11-09T10:00:02Z" });
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(timerGets()).toBe(1);
  });
});

describe("TimerButton: switch dialog (409 timer_running)", () => {
  function conflict(title: string | null) {
    return () => {
      throw httpError(409, {
        code: "timer_running",
        running: { id: 5, ticket_id: 88, ticket_title: title, started_at: "2026-11-09T09:00:00Z" },
      });
    };
  }

  it("names the other ticket and switches with {switch:true}", async () => {
    const started = entry({ id: 9, started_at: SERVER_NOW, ended_at: null, duration_seconds: 0, is_running: true });
    let calls = 0;
    setup(snapshot(), {
      "/api/tickets/10/timer/start/": (_url, body) => {
        calls += 1;
        if (calls === 1) return conflict("Fix the VPN")();
        expect(body).toEqual({ switch: true });
        return started;
      },
    });
    const client = newClient();
    const spy = vi.spyOn(client, "invalidateQueries");
    renderTimer(<TimerButton ticketId={10} />, { client });
    await userEvent.click(await button());
    const dialog = await screen.findByTestId("timer-switch-dialog");
    expect(dialog).toHaveTextContent("Your timer is running on #88 Fix the VPN");
    expect(dialog).toHaveTextContent("Stop it and start the timer here?");
    await userEvent.click(within(dialog).getByTestId("timer-switch-here"));
    await waitFor(() => expect(post).toHaveBeenLastCalledWith("/api/tickets/10/timer/start/", { switch: true }, expect.anything()));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: tk.timer(88) }));
    expect(spy).toHaveBeenCalledWith({ queryKey: tk.timerCurrent() });
    await waitFor(() => expect(screen.queryByTestId("timer-switch-dialog")).not.toBeInTheDocument());
  });

  it("shows only #88 when the other ticket's title is hidden (null)", async () => {
    setup(snapshot(), { "/api/tickets/10/timer/start/": conflict(null) });
    renderTimer(<TimerButton ticketId={10} />);
    await userEvent.click(await button());
    const dialog = await screen.findByTestId("timer-switch-dialog");
    expect(dialog).toHaveTextContent("Your timer is running on ticket #88");
    expect(dialog).not.toHaveTextContent("null");
  });

  it("Cancel closes the dialog without another request", async () => {
    setup(snapshot(), { "/api/tickets/10/timer/start/": conflict("Fix the VPN") });
    renderTimer(<TimerButton ticketId={10} />);
    await userEvent.click(await button());
    const dialog = await screen.findByTestId("timer-switch-dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByTestId("timer-switch-dialog")).not.toBeInTheDocument());
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("Open that ticket goes to /tickets/88", async () => {
    setup(snapshot(), { "/api/tickets/10/timer/start/": conflict("Fix the VPN") });
    renderTimer(<TimerButton ticketId={10} />);
    await userEvent.click(await button());
    const dialog = await screen.findByTestId("timer-switch-dialog");
    await userEvent.click(within(dialog).getByTestId("timer-open-other"));
    expect(push).toHaveBeenCalledWith("/tickets/88");
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("is translated in Georgian", async () => {
    setup(snapshot(), { "/api/tickets/10/timer/start/": conflict(null) });
    renderTimer(<TimerButton ticketId={10} />, { locale: "ka" });
    const b = await button();
    expect(b).toHaveAttribute("aria-label", "ტაიმერის ჩართვა");
    await userEvent.click(b);
    const dialog = await screen.findByTestId("timer-switch-dialog");
    expect(dialog).toHaveTextContent("თქვენი ტაიმერი ჩართულია ბილეთზე #88");
    expect(within(dialog).getByTestId("timer-switch-here")).toHaveTextContent("გააჩერე და ჩართე აქ");
  });
});
