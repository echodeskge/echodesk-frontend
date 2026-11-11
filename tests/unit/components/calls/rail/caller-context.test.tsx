/**
 * CallerContext: lookup by phone through the generated client (error →
 * ErrorBlock with retry), tickets by client id for social clients only,
 * recent calls with the number, notes (disabled while the log is pending),
 * Create ticket prefill and the profile link.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

const h = vi.hoisted(() => ({
  lookup: vi.fn(),
  partialUpdate: vi.fn(),
  axiosGet: vi.fn(),
  useClientTickets: vi.fn(),
  openTicketCreate: vi.fn(),
}));

vi.mock("@/api/generated/api", () => ({
  clientsLookupByPhoneRetrieve: h.lookup,
  callLogsPartialUpdate: h.partialUpdate,
}));
vi.mock("@/api/axios", () => ({ default: { get: h.axiosGet } }));
vi.mock("@/hooks/api/useConversationTickets", () => ({ useClientTickets: h.useClientTickets }));
vi.mock("@/contexts/TicketCreateContext", () => ({ useTicketCreate: () => ({ openTicketCreate: h.openTicketCreate }) }));

import { CallerContext } from "@/components/calls/rail/caller-context";
import { makeActiveCall, renderWithProviders } from "./rail-test-utils";

const lookupHit = (source: "crm" | "social") => ({
  count: 1,
  results: [{ id: 3, name: "Nino Beridze", email: "n@x.ge", phone: "+995597147515", company: "ACME", source }],
});

beforeEach(() => {
  h.lookup.mockResolvedValue(lookupHit("social"));
  h.partialUpdate.mockResolvedValue({});
  h.useClientTickets.mockReturnValue({ isPending: false, data: [{ id: 41, title: "Router broken", column: "Open" }] });
  h.axiosGet.mockResolvedValue({
    data: {
      count: 2,
      results: [
        { id: 7, direction: "inbound", status: "answered", started_at: "2026-11-09T10:00:00Z", duration_display: "01:10" },
        { id: 5, direction: "inbound", status: "missed", started_at: "2026-11-08T09:30:00Z", duration_display: "" },
        { id: 2, direction: "outbound", status: "ended", started_at: "2026-11-07T08:00:00Z", duration_display: "00:40" },
      ],
    },
  });
});

describe("CallerContext — client lookup", () => {
  it("looks the number up through the generated client and shows the client card", async () => {
    renderWithProviders(<CallerContext call={makeActiveCall()} />);
    expect(screen.getByTestId("call-rail-context")).toBeInTheDocument();
    const card = await screen.findByTestId("call-rail-client");
    expect(h.lookup).toHaveBeenCalledWith("+995555123456");
    expect(card).toHaveTextContent("Nino Beridze");
    expect(card).toHaveTextContent("ACME");
    expect(card).toHaveTextContent("n@x.ge");
    expect(screen.getByTestId("call-rail-view-profile")).toHaveAttribute("href", "/social/clients?client=3");
  });

  it("shows an ErrorBlock with retry when the lookup fails, then recovers", async () => {
    const user = userEvent.setup();
    // The hook retries once on its own before giving up.
    h.lookup.mockRejectedValueOnce(new Error("network")).mockRejectedValueOnce(new Error("network"));
    renderWithProviders(<CallerContext call={makeActiveCall()} />);
    const block = await screen.findByTestId("call-rail-context-error");
    expect(block).toHaveTextContent("Couldn't look up the caller");
    h.lookup.mockResolvedValueOnce(lookupHit("social"));
    await user.click(within(block).getByRole("button", { name: /Retry/ }));
    expect(await screen.findByTestId("call-rail-client")).toBeInTheDocument();
    expect(h.lookup).toHaveBeenCalledTimes(3);
  });

  it("an unknown number shows the unknown-caller box and no tickets section", async () => {
    h.lookup.mockResolvedValue({ count: 0, results: [] });
    renderWithProviders(<CallerContext call={makeActiveCall({ callerName: undefined })} />);
    const box = await screen.findByTestId("call-rail-unknown-caller");
    expect(box).toHaveTextContent("Unknown caller");
    expect(box).toHaveTextContent("+995555123456");
    expect(screen.queryByTestId("call-rail-context-tickets")).toBeNull();
    expect(h.useClientTickets).toHaveBeenLastCalledWith(null);
  });
});

describe("CallerContext — tickets", () => {
  it("fetches tickets by client id for a social client and links to /tickets/{id}", async () => {
    renderWithProviders(<CallerContext call={makeActiveCall()} />);
    const link = await screen.findByTestId("call-rail-ticket-41");
    expect(link).toHaveAttribute("href", "/tickets/41");
    expect(link).toHaveTextContent("Router broken");
    expect(link).toHaveTextContent("Open");
    expect(h.useClientTickets).toHaveBeenLastCalledWith(3);
  });

  it("a CRM contact shows 'No linked tickets' and never queries by id", async () => {
    h.lookup.mockResolvedValue(lookupHit("crm"));
    renderWithProviders(<CallerContext call={makeActiveCall()} />);
    expect(await screen.findByText("No linked tickets")).toBeInTheDocument();
    expect(h.useClientTickets).toHaveBeenLastCalledWith(null);
    expect(screen.queryByTestId("call-rail-view-profile")).toBeNull();
  });

  it("shows 'No tickets yet' for a social client without tickets", async () => {
    h.useClientTickets.mockReturnValue({ isPending: false, data: [] });
    renderWithProviders(<CallerContext call={makeActiveCall()} />);
    expect(await screen.findByText("No tickets yet")).toBeInTheDocument();
  });
});

describe("CallerContext — recent calls", () => {
  it("queries the last 6 calls with the number and lists the others (current log excluded)", async () => {
    renderWithProviders(<CallerContext call={makeActiveCall({ logId: 7 })} />);
    const rows = await screen.findAllByTestId("call-rail-recent-call");
    expect(h.axiosGet).toHaveBeenCalledWith("/api/call-logs/", {
      params: { ordering: "-started_at", page: 1, page_size: 6, search: "+995555123456" },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Missed");
    expect(rows[1]).toHaveTextContent("Ended");
    expect(rows[1]).toHaveTextContent("00:40");
  });

  it("shows the empty line when there are none", async () => {
    h.axiosGet.mockResolvedValue({ data: { count: 0, results: [] } });
    renderWithProviders(<CallerContext call={makeActiveCall()} />);
    expect(await screen.findByText("No previous calls with this number")).toBeInTheDocument();
  });
});

describe("CallerContext — notes", () => {
  it("is disabled while the call log is pending", async () => {
    renderWithProviders(<CallerContext call={makeActiveCall({ logId: null, logPending: true })} />);
    await screen.findByTestId("call-rail-client");
    expect(screen.getByTestId("call-rail-notes")).toBeDisabled();
    expect(screen.getByTestId("call-rail-notes-save")).toBeDisabled();
    expect(screen.getByText("Notes can be saved once the call is logged")).toBeInTheDocument();
  });

  it("saves through callLogsPartialUpdate and reports success / failure", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CallerContext call={makeActiveCall({ logId: 7 })} />);
    await screen.findByTestId("call-rail-client");
    expect(screen.getByTestId("call-rail-notes-save")).toBeDisabled();
    await user.type(screen.getByTestId("call-rail-notes"), "Asked about the router");
    await user.click(screen.getByTestId("call-rail-notes-save"));
    await waitFor(() => expect(h.partialUpdate).toHaveBeenCalledWith(7, { notes: "Asked about the router" }));
    expect(await screen.findByText("Notes saved")).toBeInTheDocument();

    h.partialUpdate.mockRejectedValueOnce(new Error("500"));
    await user.type(screen.getByTestId("call-rail-notes"), "!");
    await user.click(screen.getByTestId("call-rail-notes-save"));
    expect(await screen.findByText("Couldn't save the notes")).toBeInTheDocument();
  });
});

describe("CallerContext — Create ticket", () => {
  it("prefills a social client as the customer and the caller name as the title", async () => {
    renderWithProviders(<CallerContext call={makeActiveCall({ callerName: "Nino" })} />);
    await screen.findByTestId("call-rail-client");
    fireEvent.click(screen.getByTestId("call-rail-create-ticket"));
    expect(h.openTicketCreate).toHaveBeenCalledWith(undefined, undefined, { title: "Nino", customerId: 3 });
  });

  it("a CRM contact is not a ticket customer: only the title is prefilled", async () => {
    h.lookup.mockResolvedValue(lookupHit("crm"));
    renderWithProviders(<CallerContext call={makeActiveCall({ callerName: undefined })} />);
    await screen.findByTestId("call-rail-client");
    fireEvent.click(screen.getByTestId("call-rail-create-ticket"));
    expect(h.openTicketCreate).toHaveBeenCalledWith(undefined, undefined, { title: "Nino Beridze" });
  });

  it("an unknown caller gets the phone number as the title", async () => {
    h.lookup.mockResolvedValue({ count: 0, results: [] });
    renderWithProviders(<CallerContext call={makeActiveCall({ callerName: undefined })} />);
    await screen.findByTestId("call-rail-unknown-caller");
    fireEvent.click(screen.getByTestId("call-rail-create-ticket"));
    expect(h.openTicketCreate).toHaveBeenCalledWith(undefined, undefined, { title: "+995555123456" });
  });
});
