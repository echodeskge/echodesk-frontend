/** FE-12 payment block: when it shows, its rows, and "Record payment" (critic 16, W87, E8). */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }));
vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("@/services/auth", () => ({ authService: { isAuthenticated: () => true } }));

import axios from "@/api/axios";
import {
  PaymentBlock,
  newestPayment,
  showPaymentBlock,
} from "@/app/(tenant)/tickets/[id]/_components/rail/payment-block";
import { tk } from "@/app/(tenant)/tickets/_lib/query-keys";
import type { TicketDetail, ViewerPermissions } from "@/app/(tenant)/tickets/_lib/types";
import { PERMS_AGENT, PERMS_ALL, httpError, makeTicket, newClient, routeAxios, type Route } from "../helpers";
import { renderRail } from "./rail-helpers";

const ADMIN = { id: 1, email: "a@x.ge", first_name: "Admin", last_name: "User" };

const ORDER = makeTicket({
  is_order: true,
  price: "120.00",
  currency: "GEL",
  amount_paid: "50.00",
  remaining_balance: "70.00",
  payment_status: "partially_paid",
  payment_due_date: "2026-11-01",
  is_overdue: true,
  payments: [
    { id: 5, ticket: 10, amount: "50.00", currency: "GEL", payment_method: "cash", payment_reference: "R-1", notes: "", processed_by: ADMIN, processed_at: "2026-11-03T10:00:00Z" },
  ],
});

function setup({
  ticket = ORDER,
  perms = PERMS_ALL as ViewerPermissions,
  locale = "en" as "en" | "ka",
  process,
  patchPayment,
}: { ticket?: TicketDetail; perms?: ViewerPermissions; locale?: "en" | "ka"; process?: Route; patchPayment?: Route } = {}) {
  routeAxios(axios, {
    post: {
      "/api/payments/process_payment/":
        process ??
        ((_u, body) => {
          const b = body as { amount: string };
          return {
            message: "ok",
            remaining_balance: "40.00",
            ticket: {
              ...ticket,
              amount_paid: "80.00",
              remaining_balance: "40.00",
              payments: [
                ...ticket.payments,
                { id: 6, ticket: 10, amount: b.amount, currency: "GEL", payment_method: "manual", payment_reference: "", notes: "", processed_by: ADMIN, processed_at: "2026-11-09T10:00:00Z" },
              ],
            },
          };
        }),
    },
    patch: { "/api/payments/6/": patchPayment ?? ((_u, b) => ({ id: 6, ...(b as object) })) },
  });
  const client = newClient();
  client.setQueryData(tk.ticket(10), ticket);
  function Harness() {
    const { data } = useQuery({ queryKey: tk.ticket(10), queryFn: () => ticket, staleTime: Infinity });
    return <PaymentBlock ticket={data ?? ticket} perms={perms} />;
  }
  return renderRail(<Harness />, { client, locale });
}

beforeEach(() => vi.clearAllMocks());

describe("PaymentBlock", () => {
  it("renders only for orders or tickets with a payment due date (E1)", () => {
    expect(showPaymentBlock({ is_order: false, payment_due_date: null })).toBe(false);
    expect(showPaymentBlock({ is_order: true, payment_due_date: null })).toBe(true);
    expect(showPaymentBlock({ is_order: false, payment_due_date: "2026-11-01" })).toBe(true);
    setup({ ticket: makeTicket() });
    expect(screen.queryByTestId("payment-block")).toBeNull();
  });

  it("price, status, amount paid, remaining, overdue Payment due and the payments list", () => {
    setup();
    const block = screen.getByTestId("payment-block");
    expect(block).toHaveTextContent("Price120.00 GEL");
    expect(block.querySelector('[data-slot="payment-status"]')).toHaveTextContent("Partly paid");
    expect(block).toHaveTextContent("Amount paid50.00 GEL");
    expect(block).toHaveTextContent("Remaining70.00 GEL");
    const due = block.querySelector('[data-slot="payment-due"]')!;
    expect(due).toHaveAttribute("data-overdue", "true");
    expect(due).toHaveTextContent("Nov 1· Payment overdue");
    const row = block.querySelector('[data-slot="payment-row"]')!;
    expect(row).toHaveTextContent("50.00 GEL · Cash · Nov 3");
    expect(row).toHaveAttribute("title", "R-1 · Recorded by Admin User");
  });

  it("ka: translated labels and Georgian dates", () => {
    setup({ locale: "ka" });
    const block = screen.getByTestId("payment-block");
    expect(block).toHaveTextContent("გადახდა");
    expect(block.querySelector('[data-slot="payment-row"]')).toHaveTextContent("50.00 GEL · ნაღდი · 3 ნოე");
  });

  it('"Record payment" only with can_manage_payments', () => {
    setup({ perms: PERMS_AGENT });
    expect(screen.queryByTestId("record-payment")).toBeNull();
  });

  it("records amount → process_payment, then saves method, reference and notes on the new row", async () => {
    const { client } = setup();
    fireEvent.click(screen.getByTestId("record-payment"));
    const dialog = await screen.findByTestId("record-payment-dialog");
    fireEvent.change(within(dialog).getByLabelText(/Amount/), { target: { value: "30" } });
    fireEvent.change(within(dialog).getByLabelText("Method"), { target: { value: "card" } });
    fireEvent.change(within(dialog).getByLabelText("Reference"), { target: { value: "TX-9" } });
    fireEvent.change(within(dialog).getByLabelText("Notes"), { target: { value: "at the desk" } });
    fireEvent.click(within(dialog).getByTestId("record-payment-save"));
    await waitFor(() =>
      expect(vi.mocked(axios.post)).toHaveBeenCalledWith(
        "/api/payments/process_payment/",
        { ticket_id: 10, amount: "30.00" },
        expect.objectContaining({ headers: expect.objectContaining({ "X-Client-Mutation": expect.any(String) }) }),
      ),
    );
    await waitFor(() =>
      expect(vi.mocked(axios.patch)).toHaveBeenCalledWith("/api/payments/6/", {
        payment_method: "card",
        payment_reference: "TX-9",
        notes: "at the desk",
      }),
    );
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Payment recorded"));
    const saved = client.getQueryData<TicketDetail>(tk.ticket(10))!;
    expect(saved.amount_paid).toBe("80.00");
    expect(saved.payments.find((p) => p.id === 6)?.payment_method).toBe("card");
    await waitFor(() => expect(screen.queryByTestId("record-payment-dialog")).toBeNull());
  });

  it("manual with no reference or notes: no second request", async () => {
    setup();
    fireEvent.click(screen.getByTestId("record-payment"));
    const dialog = await screen.findByTestId("record-payment-dialog");
    fireEvent.change(within(dialog).getByLabelText(/Amount/), { target: { value: "10" } });
    fireEvent.change(within(dialog).getByLabelText("Method"), { target: { value: "manual" } });
    fireEvent.click(within(dialog).getByTestId("record-payment-save"));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    expect(vi.mocked(axios.patch)).not.toHaveBeenCalled();
  });

  it("rejects an empty or non-positive amount without a request", async () => {
    setup();
    fireEvent.click(screen.getByTestId("record-payment"));
    const dialog = await screen.findByTestId("record-payment-dialog");
    fireEvent.change(within(dialog).getByLabelText(/Amount/), { target: { value: "0" } });
    fireEvent.click(within(dialog).getByTestId("record-payment-save"));
    expect(await within(dialog).findByText("Enter an amount greater than 0")).toBeInTheDocument();
    expect(vi.mocked(axios.post)).not.toHaveBeenCalled();
  });

  it("errors: a failed process_payment toasts; a failed detail save warns", async () => {
    setup({
      process: () => {
        throw httpError(403);
      },
    });
    fireEvent.click(screen.getByTestId("record-payment"));
    const dialog = await screen.findByTestId("record-payment-dialog");
    fireEvent.change(within(dialog).getByLabelText(/Amount/), { target: { value: "5" } });
    fireEvent.click(within(dialog).getByTestId("record-payment-save"));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Couldn't record the payment"));
    expect(screen.getByTestId("record-payment-dialog")).toBeInTheDocument();
  });

  it("a failed method/notes save still records the payment and warns", async () => {
    setup({
      patchPayment: () => {
        throw httpError(500);
      },
    });
    fireEvent.click(screen.getByTestId("record-payment"));
    const dialog = await screen.findByTestId("record-payment-dialog");
    fireEvent.change(within(dialog).getByLabelText(/Amount/), { target: { value: "5" } });
    fireEvent.change(within(dialog).getByLabelText("Notes"), { target: { value: "x" } });
    fireEvent.click(within(dialog).getByTestId("record-payment-save"));
    await waitFor(() =>
      expect(toastMock.warning).toHaveBeenCalledWith("The payment was recorded, but its method and notes couldn't be saved"),
    );
  });

  it("newestPayment picks the highest id", () => {
    expect(newestPayment([{ id: 2 }, { id: 9 }, { id: 4 }] as never)?.id).toBe(9);
    expect(newestPayment([])).toBeNull();
  });
});
