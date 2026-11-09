/** FE-12 forms section and its two dialogs (W76, W124). */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import React from "react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }));
vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock("@/services/auth", () => ({ authService: { isAuthenticated: () => true } }));
vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("@/components/SignatureCanvas", () => ({
  SignatureCanvas: ({ onSignatureChange }: { onSignatureChange: (v: string) => void }) => (
    <button type="button" data-testid="signature" onClick={() => onSignatureChange("data:image/png;base64,AAA")}>
      sign
    </button>
  ),
}));

import axios from "@/api/axios";
import type { TicketFormSubmission } from "@/api/generated/interfaces";
import { FormsSection, formRows } from "@/app/(tenant)/tickets/[id]/_components/rail/forms-section";
import { FormSubmissionViewDialog } from "@/components/FormSubmissionViewDialog";
import { tk } from "@/app/(tenant)/tickets/_lib/query-keys";
import { httpError, makeTicket, newClient, routeAxios } from "../helpers";
import { renderRail } from "./rail-helpers";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const USER = { id: 1, email: "n@x.ge", first_name: "Nino", last_name: "Beridze" };

const PARENT: TicketFormSubmission = {
  id: 100,
  ticket: 10,
  form: {
    id: 1,
    title: "Incident report",
    child_forms: [
      { id: 2, title: "Damage photos", description: "" },
      { id: 3, title: "Customer sign-off", description: "" },
    ],
    parent_form: null,
    item_lists: [{ id: 50, title: "Products" }],
    custom_fields: [{ name: "order_no", label: "Order number", type: "string" }],
  } as never,
  selected_items: [
    { id: 501, label: "Coffee cup", item_list: 50 },
    { id: 502, label: "Saucer", item_list: 50 },
  ] as never,
  form_data: { order_no: "A-17", signature: "data:image/png;base64,AAA" },
  submitted_at: "2026-11-05T10:30:00Z",
  submitted_by: USER,
  ticket_data: {} as never,
};

const CHILD_DONE: TicketFormSubmission = {
  ...PARENT,
  id: 101,
  form: { id: 2, title: "Damage photos", parent_form: { id: 1, title: "Incident report" }, child_forms: [] } as never,
  form_data: {},
  selected_items: [],
};

beforeEach(() => vi.clearAllMocks());

describe("formRows", () => {
  it("parent = the submission without a parent form; children = its child forms with their submissions", () => {
    const rows = formRows([CHILD_DONE, PARENT]);
    expect(rows.parent?.id).toBe(100);
    expect(rows.children.map((c) => [c.form.id, c.submission?.id ?? null])).toEqual([
      [2, 101],
      [3, null],
    ]);
    expect(formRows([]).parent).toBeNull();
  });
});

describe("FormsSection", () => {
  it('"No forms" empty state (D194 section frame)', () => {
    renderRail(<FormsSection ticket={makeTicket()} />);
    const section = screen.getByTestId("forms-section");
    expect(section.className).toContain("p-3");
    expect(section.className).toContain("gap-2");
    expect(section).toHaveTextContent("Forms");
    expect(screen.getByTestId("forms-empty")).toHaveTextContent("No forms");
  });

  it("parent row with View; children Completed/View or Not filled/Fill", () => {
    renderRail(<FormsSection ticket={makeTicket({ form_submissions: [PARENT, CHILD_DONE] })} />);
    const parent = screen.getByTestId("form-parent");
    expect(parent).toHaveTextContent("Incident report");
    expect(parent).toHaveTextContent("Nino Beridze · Nov 5");
    expect(within(parent).getByRole("button")).toHaveTextContent("View");
    expect(screen.getByTestId("form-child-2")).toHaveTextContent("Completed");
    expect(within(screen.getByTestId("form-child-2")).getByRole("button")).toHaveTextContent("View");
    const todo = screen.getByTestId("form-child-3");
    expect(todo).toHaveTextContent("Not filled");
    const fill = within(todo).getByRole("button");
    expect(fill).toHaveTextContent("Fill");
    expect(fill.className).toContain("h-6");
    expect(fill.className).toContain("text-[11px]");
  });

  it("View opens the translated submission dialog: field labels, signature image, items grouped by list", async () => {
    renderRail(<FormsSection ticket={makeTicket({ form_submissions: [PARENT] })} />, { locale: "ka" });
    fireEvent.click(within(screen.getByTestId("form-parent")).getByRole("button"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("გაგზავნილია");
    expect(dialog).toHaveTextContent("გამგზავნი: Nino Beridze");
    expect(dialog).toHaveTextContent("5 ნოე 2026");
    expect(dialog).toHaveTextContent("Order number");
    expect(dialog).toHaveTextContent("A-17");
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", "data:image/png;base64,AAA");
    expect(within(dialog).getByRole("img")).toHaveAttribute("alt", "ხელმოწერა: signature");
    expect(dialog).toHaveTextContent("Products");
    expect(dialog).toHaveTextContent("Coffee cup");
    expect(dialog).toHaveTextContent("Saucer");
  });

  it("Fill opens the child form (string, text, number, date, signature; item pickers), submits and invalidates the ticket", async () => {
    routeAxios(axios, {
      get: {
        "/api/ticket-forms/3/": () => ({
          id: 3,
          title: "Customer sign-off",
          description: "Ask the customer to sign",
          item_lists: [{ id: 50, title: "Products" }],
          custom_fields: [
            { name: "who", label: "Name", type: "string", required: true },
            { name: "remarks", label: "Remarks", type: "text" },
            { name: "qty", label: "Quantity", type: "number" },
            { name: "when", label: "Date", type: "date" },
            { name: "sig", label: "Signature", type: "signature" },
          ],
        }),
        "/api/item-lists/50/": () => ({ id: 50, title: "Products", root_items: [{ id: 501, label: "Coffee cup", children: [] }] }),
      },
      post: { "/api/form-submissions/": () => ({ id: 102 }) },
    });
    const client = newClient();
    const spy = vi.spyOn(client, "invalidateQueries");
    renderRail(<FormsSection ticket={makeTicket({ form_submissions: [PARENT] })} />, { client });
    fireEvent.click(within(screen.getByTestId("form-child-3")).getByRole("button"));
    const dialog = await screen.findByRole("dialog", { name: "Customer sign-off" });
    await within(dialog).findByText("Select items from the lists");
    expect(within(dialog).getByText("Fields")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Name/), { target: { value: "Tamar" } });
    fireEvent.change(within(dialog).getByLabelText("Quantity"), { target: { value: "2" } });
    fireEvent.change(within(dialog).getByLabelText("Date"), { target: { value: "2026-11-09" } });
    expect(within(dialog).getByLabelText("Remarks").tagName).toBe("TEXTAREA");
    fireEvent.click(within(dialog).getByTestId("signature"));
    fireEvent.click(within(dialog).getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: /Coffee cup/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit form" }));
    await waitFor(() =>
      expect(vi.mocked(axios.post)).toHaveBeenCalledWith("/api/form-submissions/", {
        ticket: 10,
        form_id: 3,
        selected_item_ids: [501],
        form_data: { who: "Tamar", qty: 2, when: "2026-11-09", sig: "data:image/png;base64,AAA" },
      }),
    );
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: tk.ticket(10) }));
    expect(spy).toHaveBeenCalledWith({ queryKey: tk.activity(10) });
    expect(toastMock.success).toHaveBeenCalledWith("Form submitted");
  });

  it("the fill dialog shows a translated load error instead of rendering nothing", async () => {
    routeAxios(axios, {
      get: {
        "/api/ticket-forms/3/": () => {
          throw httpError(500);
        },
      },
    });
    renderRail(<FormsSection ticket={makeTicket({ form_submissions: [PARENT] })} />, { locale: "ka" });
    fireEvent.click(within(screen.getByTestId("form-child-3")).getByRole("button"));
    expect(await screen.findByRole("dialog", { name: "ფორმის ჩატვირთვა ვერ მოხერხდა" })).toBeInTheDocument();
  });

  it("the view dialog shows the empty data text", async () => {
    renderRail(
      <FormSubmissionViewDialog open onOpenChange={() => {}} submission={{ ...CHILD_DONE, form_data: {} }} />,
    );
    expect(await screen.findByText("No form data was submitted")).toBeInTheDocument();
  });
});
