/**
 * IncomingCallSidebar: the caller's recent tickets are fetched with named
 * query params (WS2), not the generated client's positional ticketsList.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/contexts/IncomingCallSidebarContext", () => ({
  useIncomingCallSidebar: () => ({
    isOpen: true,
    callLogId: 77,
    phoneNumber: "597147515",
    clientName: "Nino",
    closeSidebar: vi.fn(),
  }),
}));
vi.mock("@/contexts/CallContext", () => ({
  useCall: () => ({
    activeCall: null,
    callDuration: 0,
    handleEndCall: vi.fn(),
    handleToggleMute: vi.fn(),
    handleToggleHold: vi.fn(),
    startAttendedTransfer: vi.fn(),
    completeTransfer: vi.fn(),
    cancelTransfer: vi.fn(),
    mergeConference: vi.fn(),
  }),
}));
vi.mock("@/contexts/TicketCreateContext", () => ({
  useTicketCreate: () => ({ openTicketCreate: vi.fn() }),
}));
const generated = vi.hoisted(() => ({ callLogsPartialUpdate: vi.fn(), ticketsList: vi.fn() }));
vi.mock("@/api/generated/api", () => generated);
vi.mock("@/api/axios", () => ({ default: { get: vi.fn() } }));

import axios from "@/api/axios";
import { IncomingCallSidebar } from "@/components/calls/IncomingCallSidebar";

const get = vi.mocked(axios.get);

beforeEach(() => {
  vi.clearAllMocks();
  get.mockImplementation(async (url: string) => {
    if (url.startsWith("/api/clients/lookup-by-phone/")) {
      return {
        data: {
          count: 1,
          results: [{ id: 3, name: "Nino Beridze", email: "n@x.ge", phone: "+995597147515", company: "", source: "crm" }],
        },
      };
    }
    if (url === "/api/tickets/") {
      return { data: { count: 1, next: null, previous: null, results: [{ id: 41, title: "Router broken", status: "open" }] } };
    }
    if (url === "/api/call-logs/") return { data: { count: 0, next: null, previous: null, results: [] } };
    throw new Error(`unexpected ${url}`);
  });
});

describe("IncomingCallSidebar recent tickets", () => {
  it("queries tickets with named params {search, page_size:5, ordering:'-created_at'}", async () => {
    render(<IncomingCallSidebar />);
    await waitFor(() => expect(get).toHaveBeenCalledWith("/api/tickets/", expect.anything()));
    expect(get).toHaveBeenCalledWith("/api/tickets/", {
      params: { search: "Nino Beridze", page_size: 5, ordering: "-created_at" },
    });
    expect(generated.ticketsList).not.toHaveBeenCalled();
    expect(await screen.findByText("Router broken")).toBeInTheDocument();
  });

  it("skips the ticket query when no client matches the number", async () => {
    get.mockImplementation(async (url: string) => {
      if (url.startsWith("/api/clients/lookup-by-phone/")) return { data: { count: 0, results: [] } };
      return { data: { count: 0, next: null, previous: null, results: [] } };
    });
    render(<IncomingCallSidebar />);
    await waitFor(() => expect(get).toHaveBeenCalledWith("/api/call-logs/", expect.anything()));
    expect(get).not.toHaveBeenCalledWith("/api/tickets/", expect.anything());
  });
});
