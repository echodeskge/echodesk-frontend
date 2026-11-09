/** FE-10 page drop zone: overlay on file dragenter, drop uploads to this ticket, internal drags ignored, off on touch. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { act, screen, waitFor } from "@testing-library/react";

const toastMock = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: () => ({ data: { id: 1, is_staff: true } }) }));
vi.mock("@/app/(tenant)/tickets/_contexts/tickets-realtime-context", async () => (await import("./main-helpers")).presenceMock);

import axios from "@/api/axios";
import { DetailMain } from "@/app/(tenant)/tickets/[id]/_components/main/detail-main";
import { useQuery } from "@tanstack/react-query";
import { tk } from "@/app/(tenant)/tickets/_lib/query-keys";
import type { TicketDetail } from "@/app/(tenant)/tickets/_lib/types";
import { PERMS_ALL, clearMatchMedia, makeTicket, mockMatchMedia, newClient, routeAxios } from "../helpers";
import { fakeFile, renderMain } from "./main-helpers";

function dragEvent(type: string, { files = [] as File[], types = ["Files"] } = {}) {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, "dataTransfer", { value: { types, files, dropEffect: "none" } });
  Object.defineProperty(e, "relatedTarget", { value: document.body });
  return e;
}

function setup() {
  routeAxios(axios, {
    post: {
      "/api/attachments/": (_u, form) => {
        const file = (form as FormData).get("file") as File;
        return { id: 77, ticket: 10, file: "f", file_url: "https://files.example/f", filename: file.name, file_size: file.size, content_type: file.type, uploaded_by: { id: 1, email: "a@x", first_name: "A", last_name: "B" }, uploaded_at: "2026-11-08T10:00:00Z" };
      },
    },
  });
  const client = newClient();
  const ticket = makeTicket();
  client.setQueryData(tk.ticket(10), ticket);
  function Harness() {
    const { data } = useQuery<TicketDetail>({ queryKey: tk.ticket(10), queryFn: () => ticket, staleTime: Infinity });
    return <DetailMain ticket={data ?? ticket} perms={PERMS_ALL} />;
  }
  return renderMain(<Harness />, { client });
}

const overlay = () => screen.queryByTestId("page-drop-overlay");

beforeEach(() => vi.clearAllMocks());
afterEach(() => clearMatchMedia());

describe("page drop zone", () => {
  it("dragenter with files shows the overlay; leaving the page hides it", () => {
    setup();
    expect(overlay()).toBeNull();
    act(() => void window.dispatchEvent(dragEvent("dragenter")));
    expect(overlay()).toHaveTextContent("Drop files to attach them");
    act(() => void window.dispatchEvent(dragEvent("dragleave")));
    expect(overlay()).toBeNull();
  });

  it("dragover is accepted (preventDefault) so the browser doesn't open the file", () => {
    setup();
    const over = dragEvent("dragover");
    act(() => void window.dispatchEvent(over));
    expect(over.defaultPrevented).toBe(true);
  });

  it("a drop uploads the files to this ticket and opens the attachments card", async () => {
    setup();
    act(() => void window.dispatchEvent(dragEvent("dragenter")));
    const drop = dragEvent("drop", { files: [fakeFile("log.txt", 100, "text/plain")] });
    act(() => void window.dispatchEvent(drop));
    expect(drop.defaultPrevented).toBe(true);
    expect(overlay()).toBeNull();
    await waitFor(() => expect(vi.mocked(axios.post)).toHaveBeenCalledTimes(1));
    const form = vi.mocked(axios.post).mock.calls[0][1] as FormData;
    expect(form.get("ticket")).toBe("10");
    expect((form.get("file") as File).name).toBe("log.txt");
    expect(screen.getByRole("button", { name: /Attachments/ })).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(document.querySelectorAll('[data-slot="attachment-tile"]')).toHaveLength(1));
  });

  it("ignores internal drags (no files: text, the checklist reorder)", () => {
    setup();
    act(() => void window.dispatchEvent(dragEvent("dragenter", { types: ["text/plain"] })));
    expect(overlay()).toBeNull();
    const drop = dragEvent("drop", { types: ["text/plain"] });
    act(() => void window.dispatchEvent(drop));
    expect(drop.defaultPrevented).toBe(false);
    expect(vi.mocked(axios.post)).not.toHaveBeenCalled();
  });

  it("is disabled on touch devices (mobile uses the Upload button)", () => {
    mockMatchMedia((q) => q.includes("pointer: coarse"));
    setup();
    act(() => void window.dispatchEvent(dragEvent("dragenter")));
    expect(overlay()).toBeNull();
    const drop = dragEvent("drop", { files: [fakeFile("a.txt")] });
    act(() => void window.dispatchEvent(drop));
    expect(vi.mocked(axios.post)).not.toHaveBeenCalled();
  });
});
