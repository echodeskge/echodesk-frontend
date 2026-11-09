/** FE-13 rail Time row: "Mine 1h 20m · Total 3h" (ICU), live while running. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";

vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

import axios from "@/api/axios";
import { TimeRow } from "@/app/(tenant)/tickets/_components/timer/time-row";
import type { TimerState } from "@/app/(tenant)/tickets/_lib/types";
import { ME, entry, renderTimer, routeAxios, snapshot } from "./helpers";

function setup(state: TimerState) {
  routeAxios(axios, { get: { "/api/tickets/10/timer/": () => state } });
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

describe("TimeRow", () => {
  it("reads 'Mine 1h 20m · Total 3h' inside a fixed rail row labelled Time", async () => {
    setup(snapshot({ my_total_seconds: 4800, total_seconds: 10800 }));
    renderTimer(<TimeRow ticketId={10} />);
    const value = await screen.findByTestId("time-row");
    await waitFor(() => expect(value).toHaveTextContent("Mine 1h 20m · Total 3h"));
    const row = value.closest("[data-slot=property-row]") as HTMLElement;
    expect(row).toBeTruthy();
    expect(row).toHaveTextContent(/^Time/);
    expect(row.className).toMatch(/grid-cols-\[92px_minmax\(0,1fr\)\]/);
    expect(row.className).toMatch(/py-\[9px\]/);
  });

  it("grows while my timer runs", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    const run = entry({ id: 2, user: ME, started_at: "2026-11-09T09:59:00Z", ended_at: null, duration_seconds: 0, is_running: true });
    setup(snapshot({ running: run, entries: [run], my_total_seconds: 60, total_seconds: 60 }));
    renderTimer(<TimeRow ticketId={10} />);
    const value = await screen.findByTestId("time-row");
    await waitFor(() => expect(value).toHaveTextContent("Mine 1m · Total 1m"));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(value).toHaveTextContent("Mine 2m · Total 2m");
  });

  it("is translated in Georgian", async () => {
    setup(snapshot({ my_total_seconds: 4800, total_seconds: 10800 }));
    renderTimer(<TimeRow ticketId={10} />, { locale: "ka" });
    const value = await screen.findByTestId("time-row");
    await waitFor(() => expect(value).toHaveTextContent("ჩემი 1 სთ 20 წთ · სულ 3 სთ"));
    expect(value.closest("[data-slot=property-row]")).toHaveTextContent(/^დრო/);
  });
});
