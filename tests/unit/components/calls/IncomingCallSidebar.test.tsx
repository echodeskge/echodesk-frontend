/**
 * IncomingCallSidebar: the caller's recent tickets are fetched with named
 * query params (WS2), not the generated client's positional ticketsList;
 * they open /tickets/{id}; "Create ticket" pre-fills the caller (FE-14).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
const h = vi.hoisted(() => ({
  push: vi.fn(),
  openTicketCreate: vi.fn(),
  closeSidebar: vi.fn(),
  clientName: "Nino" as string | null,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.push, replace: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/contexts/IncomingCallSidebarContext", () => ({
  useIncomingCallSidebar: () => ({
    isOpen: true,
    callLogId: 77,
    phoneNumber: "597147515",
    clientName: h.clientName,
    closeSidebar: h.closeSidebar,
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
  useTicketCreate: () => ({ openTicketCreate: h.openTicketCreate }),
}));
const generated = vi.hoisted(() => ({ callLogsPartialUpdate: vi.fn(), ticketsList: vi.fn() }));
vi.mock("@/api/generated/api", () => generated);
vi.mock("@/api/axios", () => ({ default: { get: vi.fn() } }));

import axios from "@/api/axios";
import { IncomingCallSidebar } from "@/components/calls/IncomingCallSidebar";

const get = vi.mocked(axios.get);

let source: "crm" | "social" = "crm";

beforeEach(() => {
  vi.clearAllMocks();
  source = "crm";
  h.clientName = "Nino";
  get.mockImplementation(async (url: string) => {
    if (url.startsWith("/api/clients/lookup-by-phone/")) {
      return {
        data: {
          count: 1,
          results: [{ id: 3, name: "Nino Beridze", email: "n@x.ge", phone: "+995597147515", company: "", source }],
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

describe("IncomingCallSidebar ticket links (FE-14)", () => {
  it("a recent ticket opens /tickets/{id} (not the missing /boards route) and closes the sidebar", async () => {
    render(<IncomingCallSidebar />);
    fireEvent.click(await screen.findByTestId("recent-ticket-41"));
    expect(h.push).toHaveBeenCalledWith("/tickets/41");
    expect(h.push).not.toHaveBeenCalledWith("/boards");
    expect(h.closeSidebar).toHaveBeenCalled();
  });

  it("Create ticket pre-fills a social client as the customer and the caller name as the title", async () => {
    source = "social";
    render(<IncomingCallSidebar />);
    await screen.findByText("Router broken");
    fireEvent.click(screen.getByRole("button", { name: /callDetail.createTicket/ }));
    expect(h.openTicketCreate).toHaveBeenCalledWith(undefined, undefined, { title: "Nino", customerId: 3 });
  });

  it("a CRM contact is not a ticket customer: only the title is pre-filled", async () => {
    render(<IncomingCallSidebar />);
    await screen.findByText("Router broken");
    fireEvent.click(screen.getByRole("button", { name: /callDetail.createTicket/ }));
    expect(h.openTicketCreate).toHaveBeenCalledWith(undefined, undefined, { title: "Nino" });
  });

  it("an unknown caller gets the phone number as the title", async () => {
    h.clientName = null;
    get.mockImplementation(async (url: string) => {
      if (url.startsWith("/api/clients/lookup-by-phone/")) return { data: { count: 0, results: [] } };
      return { data: { count: 0, next: null, previous: null, results: [] } };
    });
    render(<IncomingCallSidebar />);
    await waitFor(() => expect(get).toHaveBeenCalledWith("/api/call-logs/", expect.anything()));
    fireEvent.click(screen.getByRole("button", { name: /callDetail.createTicket/ }));
    expect(h.openTicketCreate).toHaveBeenCalledWith(undefined, undefined, { title: "597147515" });
  });

  it("View profile opens the Clients screen deep link for a social client only", async () => {
    source = "social";
    const { unmount } = render(<IncomingCallSidebar />);
    fireEvent.click(await screen.findByRole("button", { name: /callDetail.viewProfile/ }));
    expect(h.push).toHaveBeenCalledWith("/social/clients?client=3");
    unmount();
    source = "crm";
    render(<IncomingCallSidebar />);
    await screen.findByText("Router broken");
    expect(screen.queryByRole("button", { name: /callDetail.viewProfile/ })).toBeNull();
  });
});
