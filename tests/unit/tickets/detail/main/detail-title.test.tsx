/** FE-10 title: auto-growing textarea, DC23 styling, Enter/blur save, Esc cancel, empty rejected, read-only, presence. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const toastMock = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("@/app/(tenant)/tickets/_contexts/tickets-realtime-context", async () => (await import("./main-helpers")).presenceMock);

import axios from "@/api/axios";
import { DetailTitle, TITLE_MAX_LENGTH, autoGrow } from "@/app/(tenant)/tickets/[id]/_components/main/detail-title";
import { makeTicket, routeAxios } from "../helpers";
import { presence, renderMain } from "./main-helpers";

function setup({ title = "Calls drop", canEdit = true } = {}) {
  routeAxios(axios, { patch: { "/api/tickets/10/": (_u, body) => makeTicket({ ...(body as object) }) } });
  renderMain(<DetailTitle ticketId={10} title={title} canEdit={canEdit} />);
  return screen.getByRole("textbox", { name: "Title" }) as HTMLTextAreaElement;
}

const patchCalls = () => vi.mocked(axios.patch).mock.calls.filter(([u]) => u === "/api/tickets/10/");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DetailTitle", () => {
  it("is an auto-growing, wrapping textarea (a 300-character title is fully visible)", () => {
    const long = "x".repeat(150) + " " + "y".repeat(149);
    const el = setup({ title: long });
    expect(el.tagName).toBe("TEXTAREA");
    expect(el).toHaveAttribute("rows", "1");
    expect(el.value).toBe(long);
    expect(el).toHaveClass("whitespace-pre-wrap", "break-words", "overflow-hidden", "resize-none", "w-full");
    expect(el.className).not.toMatch(/truncate|text-ellipsis|whitespace-nowrap/);
    expect(el).toHaveAttribute("maxLength", String(TITLE_MAX_LENGTH));
  });

  it("autoGrow sets the height from the content height plus the borders", () => {
    const el = document.createElement("textarea");
    Object.defineProperty(el, "scrollHeight", { value: 132, configurable: true });
    Object.defineProperty(el, "offsetHeight", { value: 40, configurable: true });
    Object.defineProperty(el, "clientHeight", { value: 38, configurable: true });
    autoGrow(el);
    expect(el.style.height).toBe("134px");
  });

  it("has the design type and the hover / focus ring classes (DC23)", () => {
    const el = setup();
    expect(el).toHaveClass("tracking-[-0.02em]", "font-semibold", "text-xl", "leading-7", "sm:text-2xl", "sm:leading-8");
    expect(el).toHaveClass("border-transparent", "hover:border-border", "focus:border-border", "focus:shadow-[0_0_0_3px_hsl(var(--foreground)/0.08)]");
    expect(el).toHaveClass("-ml-2", "px-2", "py-0.5", "rounded-md");
  });

  it("Enter saves without inserting a newline", async () => {
    const el = setup();
    await userEvent.clear(el);
    await userEvent.type(el, "New title{Enter}");
    expect(el.value).toBe("New title");
    await waitFor(() => expect(patchCalls()).toHaveLength(1));
    expect(patchCalls()[0][1]).toEqual({ title: "New title" });
    expect(patchCalls()[0][2]).toEqual({ headers: { "X-Client-Mutation": expect.any(String) } });
  });

  it("blur saves; an unchanged title sends nothing", async () => {
    const el = setup();
    el.focus();
    fireEvent.blur(el);
    expect(patchCalls()).toHaveLength(0);
    await userEvent.type(el, " now");
    fireEvent.blur(el);
    await waitFor(() => expect(patchCalls()).toHaveLength(1));
    expect(patchCalls()[0][1]).toEqual({ title: "Calls drop now" });
  });

  it("Esc reverts and does not save", async () => {
    const el = setup();
    await userEvent.type(el, " typo");
    await userEvent.keyboard("{Escape}");
    expect(el.value).toBe("Calls drop");
    expect(patchCalls()).toHaveLength(0);
  });

  it("rejects an empty title with a message", async () => {
    const el = setup();
    await userEvent.clear(el);
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent("The title can't be empty");
    expect(el).toHaveAttribute("aria-invalid", "true");
    expect(patchCalls()).toHaveLength(0);
    fireEvent.blur(el);
    expect(el.value).toBe("Calls drop");
    expect(patchCalls()).toHaveLength(0);
  });

  it("is read-only without can_edit and never saves", async () => {
    const el = setup({ canEdit: false });
    expect(el).toHaveAttribute("readonly");
    expect(el).not.toHaveClass("hover:border-border");
    el.focus();
    fireEvent.blur(el);
    expect(patchCalls()).toHaveLength(0);
    expect(presence.sendTicketEditing).not.toHaveBeenCalled();
  });

  it("sends ticket_editing on focus and ticket_editing_stopped on blur", () => {
    const el = setup();
    fireEvent.focus(el);
    expect(presence.sendTicketEditing).toHaveBeenCalledWith(10, "title");
    fireEvent.blur(el);
    expect(presence.sendTicketEditingStopped).toHaveBeenCalledWith(10);
  });

  it("a save error shows the translated toast", async () => {
    routeAxios(axios, {
      patch: {
        "/api/tickets/10/": () => {
          throw Object.assign(new Error("x"), { response: { status: 500, data: {} } });
        },
      },
    });
    renderMain(<DetailTitle ticketId={10} title="A" canEdit />);
    const el = screen.getByRole("textbox", { name: "Title" });
    await userEvent.type(el, "B{Enter}");
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Couldn't save the change"));
  });
});
