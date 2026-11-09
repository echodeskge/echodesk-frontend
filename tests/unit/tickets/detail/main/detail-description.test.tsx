/**
 * FE-10 description (E16, DC24). Ports and adapts the 9 TicketDescription
 * tests: sanitised static view, empty placeholder, the edit control, editing
 * through the rich editor (mocked here as a textarea that emits HTML),
 * Save / Cancel / ⌘↵ / Esc, the HTML save body, formatting round-trip,
 * read-only, and presence.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const toastMock = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("@/app/(tenant)/tickets/_contexts/tickets-realtime-context", async () => (await import("./main-helpers")).presenceMock);
vi.mock("@/components/RichTextEditor", () => ({
  RichTextEditor: (props: { content: string; onChange: (v: string) => void; placeholder?: string; className?: string; editorClassName?: string }) => (
    <div data-testid="rich-editor" data-class={props.className} data-editor-class={props.editorClassName}>
      <textarea
        aria-label="rich editor"
        placeholder={props.placeholder}
        value={props.content}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  ),
}));

import axios from "@/api/axios";
import { useQuery } from "@tanstack/react-query";
import { tk } from "@/app/(tenant)/tickets/_lib/query-keys";
import type { TicketDetail } from "@/app/(tenant)/tickets/_lib/types";
import { DetailDescription } from "@/app/(tenant)/tickets/[id]/_components/main/detail-description";
import { makeTicket, newClient, routeAxios } from "../helpers";
import { presence, renderMain } from "./main-helpers";

function setup(over: Partial<TicketDetail> = {}, canEdit = true) {
  const client = newClient();
  const ticket = makeTicket(over);
  client.setQueryData(tk.ticket(10), ticket);
  routeAxios(axios, { patch: { "/api/tickets/10/": (_u, body) => ({ ...ticket, ...(body as object) }) } });
  function Harness() {
    const { data } = useQuery<TicketDetail>({ queryKey: tk.ticket(10), queryFn: () => ticket, staleTime: Infinity });
    return <DetailDescription ticket={data ?? ticket} canEdit={canEdit} />;
  }
  return renderMain(<Harness />, { client });
}

const patchCalls = () => vi.mocked(axios.patch).mock.calls.filter(([u]) => u === "/api/tickets/10/");
const editButton = () => screen.getByRole("button", { name: "Edit the description" });

beforeEach(() => vi.clearAllMocks());

describe("DetailDescription", () => {
  it("renders sanitised HTML: markup kept, scripts and handlers stripped", () => {
    setup({
      description: '<p>This is the <strong>description</strong></p><script>alert(1)</script><img src="x" onerror="alert(2)">',
      description_format: "html",
    });
    const html = document.querySelector('[data-slot="detail-description-html"]')!;
    expect(html.querySelector("strong")).toHaveTextContent("description");
    expect(html.innerHTML).not.toContain("<script");
    expect(html.innerHTML).not.toContain("onerror");
  });

  it("reads HTML from rich_description when present", () => {
    setup({ description: "plain", rich_description: "<p>Rich <em>text</em></p>" });
    expect(document.querySelector('[data-slot="detail-description-html"] em')).toHaveTextContent("text");
  });

  it("renders plain text with its line breaks", () => {
    setup({ description: "Line one\nLine two", description_format: "plain" });
    const p = document.querySelector('[data-slot="detail-description-text"]')!;
    expect(p).toHaveClass("whitespace-pre-wrap");
    expect(p.textContent).toBe("Line one\nLine two");
  });

  it("shows the placeholder when the description is empty (or an empty editor doc)", () => {
    const { unmount } = setup({ description: "", rich_description: undefined });
    expect(screen.getByText("Add a description…")).toBeInTheDocument();
    unmount();
    setup({ description: "<p></p>", description_format: "html" });
    expect(screen.getByText("Add a description…")).toBeInTheDocument();
  });

  it("has a Pencil edit control and the hover classes (DC24)", () => {
    setup({ description: "Hello" });
    const box = document.querySelector('[data-slot="detail-description"]')!;
    expect(box).toHaveAttribute("title", "Click to edit");
    expect(box).toHaveClass("hover:bg-muted/30", "hover:border-border", "rounded-[8px]", "p-2", "-ml-2");
    expect(editButton().querySelector("svg")).toHaveClass("lucide-pencil");
  });

  it("a click on the text opens the rich editor styled as the edit box", async () => {
    setup({ description: "Hello" });
    await userEvent.click(screen.getByText("Hello"));
    const editor = screen.getByTestId("rich-editor");
    expect(editor.getAttribute("data-class")).toContain("rounded-[8px]");
    expect(editor.getAttribute("data-editor-class")).toContain("min-h-[120px]");
    expect(editor.getAttribute("data-editor-class")).toContain("px-3.5");
    expect(editor.getAttribute("data-editor-class")).toContain("py-3");
    // Plain text is converted to paragraphs for the editor.
    expect(screen.getByLabelText("rich editor")).toHaveValue("<p>Hello</p>");
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("a click that only selected text does not open the editor", () => {
    setup({ description: "Copy me" });
    const sel = { isCollapsed: false, toString: () => "Copy" } as unknown as Selection;
    const spy = vi.spyOn(window, "getSelection").mockReturnValue(sel);
    fireEvent.click(screen.getByText("Copy me"));
    expect(screen.queryByTestId("rich-editor")).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it("Save sends description (HTML), rich_description and description_format", async () => {
    setup({ description: "Hello" });
    await userEvent.click(editButton());
    fireEvent.change(screen.getByLabelText("rich editor"), { target: { value: "<p>Hello <strong>world</strong></p>" } });
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(patchCalls()).toHaveLength(1));
    expect(patchCalls()[0][1]).toEqual({
      description: "<p>Hello <strong>world</strong></p>",
      rich_description: "<p>Hello <strong>world</strong></p>",
      description_format: "html",
    });
    await waitFor(() => expect(screen.queryByTestId("rich-editor")).not.toBeInTheDocument());
  });

  it("formatting survives the round trip (saved bold shows, and reopens as the same HTML)", async () => {
    setup({ description: "Hello" });
    await userEvent.click(editButton());
    fireEvent.change(screen.getByLabelText("rich editor"), { target: { value: "<p><strong>Bold</strong> text</p>" } });
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(document.querySelector('[data-slot="detail-description-html"] strong')).toHaveTextContent("Bold"));
    await userEvent.click(editButton());
    expect(screen.getByLabelText("rich editor")).toHaveValue("<p><strong>Bold</strong> text</p>");
  });

  it("⌘/Ctrl+Enter saves; Esc and Cancel discard", async () => {
    setup({ description: "Hello" });
    await userEvent.click(editButton());
    const ed = screen.getByLabelText("rich editor");
    fireEvent.change(ed, { target: { value: "<p>Changed</p>" } });
    fireEvent.keyDown(ed, { key: "Escape" });
    expect(screen.queryByTestId("rich-editor")).not.toBeInTheDocument();
    expect(patchCalls()).toHaveLength(0);

    await userEvent.click(editButton());
    fireEvent.change(screen.getByLabelText("rich editor"), { target: { value: "<p>Changed</p>" } });
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(patchCalls()).toHaveLength(0);

    await userEvent.click(editButton());
    fireEvent.change(screen.getByLabelText("rich editor"), { target: { value: "<p>Changed</p>" } });
    fireEvent.keyDown(screen.getByLabelText("rich editor"), { key: "Enter", ctrlKey: true });
    await waitFor(() => expect(patchCalls()).toHaveLength(1));
  });

  it("saving unchanged content closes without a request", async () => {
    setup({ description: "<p>Same</p>", description_format: "html" });
    await userEvent.click(editButton());
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(patchCalls()).toHaveLength(0);
    expect(screen.queryByTestId("rich-editor")).not.toBeInTheDocument();
  });

  it("is read-only for non-editors (no edit control, a click does nothing)", async () => {
    setup({ description: "Hello" }, false);
    expect(screen.queryByRole("button", { name: "Edit the description" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("Hello"));
    expect(screen.queryByTestId("rich-editor")).not.toBeInTheDocument();
  });

  it("sends ticket_editing while editing and ticket_editing_stopped after", async () => {
    setup({ description: "Hello" });
    await userEvent.click(editButton());
    expect(presence.sendTicketEditing).toHaveBeenCalledWith(10, "description");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(presence.sendTicketEditingStopped).toHaveBeenCalledWith(10);
  });
});
