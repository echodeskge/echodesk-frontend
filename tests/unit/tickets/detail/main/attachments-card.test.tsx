/** FE-10 attachments card: collapsed with a count, Upload (stopPropagation, limits, progress), tiles, open/download, remove gate, empty text. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const toastMock = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }));
const profile = vi.hoisted(() => ({ current: { id: 3, is_staff: false } as Record<string, unknown> }));
vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: () => ({ data: profile.current }) }));
vi.mock("@/app/(tenant)/tickets/_contexts/tickets-realtime-context", async () => (await import("./main-helpers")).presenceMock);

import axios from "@/api/axios";
import { useQuery } from "@tanstack/react-query";
import type { TicketAttachment } from "@/api/generated/interfaces";
import { tk } from "@/app/(tenant)/tickets/_lib/query-keys";
import type { TicketDetail, ViewerPermissions } from "@/app/(tenant)/tickets/_lib/types";
import { DetailMain } from "@/app/(tenant)/tickets/[id]/_components/main/detail-main";
import { formatFileSize, validateFiles } from "@/app/(tenant)/tickets/[id]/_components/main/main-utils";
import { PERMS_AGENT, PERMS_ALL, clearMatchMedia, makeTicket, mockMatchMedia, newClient, routeAxios } from "../helpers";
import { fakeFile, renderMain } from "./main-helpers";

const ADMIN = { id: 1, email: "admin@demo.ge", first_name: "Nino", last_name: "Beridze" };
const AGENT = { id: 3, email: "agent@demo.ge", first_name: "Luka", last_name: "M" };

function att(id: number, filename: string, content_type: string, uploaded_by = ADMIN, file_size = 240 * 1024): TicketAttachment {
  return {
    id,
    ticket: 10,
    file: `https://files.example/${filename}`,
    file_url: `https://files.example/${filename}`,
    filename,
    file_size,
    content_type,
    uploaded_by,
    uploaded_at: "2026-11-08T10:00:00Z",
  };
}

const FILES = [att(1, "screenshot.png", "image/png"), att(2, "sip-trace.pcap", "application/vnd.tcpdump.pcap", AGENT, 1.2 * 1024 * 1024)];

let uploadResolvers: Array<() => void> = [];

function setup({ attachments = FILES, perms = PERMS_ALL as ViewerPermissions, holdUploads = false } = {}) {
  const client = newClient();
  const ticket = makeTicket({ attachments, viewer_permissions: perms });
  client.setQueryData(tk.ticket(10), ticket);
  let next = 50;
  routeAxios(axios, {
    post: {
      "/api/attachments/": async (_u, form, config) => {
        const file = (form as FormData).get("file") as File;
        const cfg = config as { onUploadProgress?: (e: { loaded: number; total: number }) => void };
        cfg.onUploadProgress?.({ loaded: 40, total: 100 });
        if (holdUploads) await new Promise<void>((r) => uploadResolvers.push(r));
        return att(next++, file.name, file.type || "application/octet-stream", AGENT, file.size);
      },
    },
    delete: { "/api/attachments/": () => undefined },
  });
  function Harness() {
    const { data } = useQuery<TicketDetail>({ queryKey: tk.ticket(10), queryFn: () => ticket, staleTime: Infinity });
    return <DetailMain ticket={data ?? ticket} perms={perms} />;
  }
  return renderMain(<Harness />, { client });
}

const header = () => screen.getByRole("button", { name: /Attachments/ });
const tiles = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="attachment-tile"]'));
const input = () => screen.getByTestId("attachments-input") as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
  uploadResolvers = [];
  profile.current = { id: 3, is_staff: false };
});
afterEach(() => clearMatchMedia());

describe("AttachmentsCard", () => {
  it("is collapsed by default and shows the count", async () => {
    setup();
    expect(header()).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector('[data-slot="attachments-count"]')).toHaveTextContent("2");
    expect(tiles()).toHaveLength(0);
    await userEvent.click(header());
    expect(tiles()).toHaveLength(2);
  });

  it("Upload stops propagation (it doesn't toggle the card) and opens the file picker", async () => {
    setup();
    const upload = screen.getByRole("button", { name: "Upload" });
    const click = vi.spyOn(input(), "click");
    const stop = vi.spyOn(Event.prototype, "stopPropagation");
    await userEvent.click(upload);
    expect(click).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
    stop.mockRestore();
    expect(header()).toHaveAttribute("aria-expanded", "false");
    expect(input()).toHaveAttribute("multiple");
  });

  it("uploads picked files with per-file progress and adds the tiles", async () => {
    const { client } = setup({ holdUploads: true });
    fireEvent.change(input(), { target: { files: [fakeFile("a.txt", 2000, "text/plain"), fakeFile("b.zip", 3000, "application/zip")] } });
    expect(header()).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(document.querySelectorAll('[data-slot="upload-tile"]')).toHaveLength(2));
    await waitFor(() => expect(screen.getByRole("progressbar", { name: "Uploading a.txt" })).toHaveAttribute("aria-valuenow", "40"));
    expect(vi.mocked(axios.post)).toHaveBeenCalledWith(
      "/api/attachments/",
      expect.any(FormData),
      expect.objectContaining({ headers: expect.objectContaining({ "X-Client-Mutation": expect.any(String) }) }),
    );
    uploadResolvers.forEach((r) => r());
    await waitFor(() => expect(document.querySelectorAll('[data-slot="upload-tile"]')).toHaveLength(0));
    expect(tiles()).toHaveLength(4);
    expect(client.getQueryData<TicketDetail>(tk.ticket(10))!.attachments).toHaveLength(4);
  });

  it("accepts up to 10 files of at most 10 MB each, with messages beyond that", async () => {
    setup({ attachments: [] });
    const many = Array.from({ length: 12 }, (_, i) => fakeFile(`f${i}.txt`, 100, "text/plain"));
    many[1] = fakeFile("huge.mov", 11 * 1024 * 1024, "video/quicktime");
    fireEvent.change(input(), { target: { files: many } });
    expect(toastMock.error).toHaveBeenCalledWith("You can upload up to 10 files at once");
    expect(toastMock.error).toHaveBeenCalledWith("Files can be at most 10 MB");
    await waitFor(() => expect(vi.mocked(axios.post)).toHaveBeenCalledTimes(9));
    const v = validateFiles(many);
    expect(v.accepted).toHaveLength(9);
    expect(v.tooMany).toBe(true);
    expect(v.tooLarge.map((f) => f.name)).toEqual(["huge.mov"]);
  });

  it("a failed upload shows a toast naming the file", async () => {
    setup({ attachments: [] });
    vi.mocked(axios.post).mockRejectedValueOnce(new Error("boom"));
    fireEvent.change(input(), { target: { files: [fakeFile("bad.pdf", 100, "application/pdf")] } });
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Couldn't upload bad.pdf"));
    expect(document.querySelectorAll('[data-slot="upload-tile"]')).toHaveLength(0);
  });

  it("tiles show a thumbnail or type icon, the name and '{size} · {uploader}'", async () => {
    setup();
    await userEvent.click(header());
    const [img, pcap] = tiles();
    expect(img.querySelector("img")).toHaveAttribute("src", "https://files.example/screenshot.png");
    expect(img).toHaveTextContent("screenshot.png");
    expect(img).toHaveTextContent("240 KB · Nino Beridze");
    expect(pcap.querySelector("img")).toBeNull();
    expect(pcap.querySelector("svg")).toBeTruthy();
    expect(pcap).toHaveTextContent("1.2 MB · Luka M");
    // A thumbnail that fails to load falls back to the type icon.
    fireEvent.error(img.querySelector("img")!);
    expect(img.querySelector("img")).toBeNull();
    expect(img.querySelector("svg")).toBeTruthy();
    expect(formatFileSize(500)).toBe("1 KB");
    expect(formatFileSize(25 * 1024 * 1024)).toBe("25 MB");
  });

  it("a tile opens file_url in a new tab with rel=noopener; non-previewable types get download", async () => {
    setup();
    await userEvent.click(header());
    const [img, pcap] = tiles();
    const imgLink = within(img).getByRole("link", { name: "Open screenshot.png" });
    expect(imgLink).toHaveAttribute("href", "https://files.example/screenshot.png");
    expect(imgLink).toHaveAttribute("target", "_blank");
    expect(imgLink.getAttribute("rel")).toContain("noopener");
    expect(imgLink).not.toHaveAttribute("download");
    const pcapLink = within(pcap).getByRole("link", { name: "Download sip-trace.pcap" });
    expect(pcapLink).toHaveAttribute("download", "sip-trace.pcap");
    expect(pcapLink).toHaveAttribute("target", "_blank");
  });

  it("remove is offered to the uploader, staff or an editor, and calls deleteAttachment after a confirm", async () => {
    // Agent without can_edit: only their own file is removable.
    const { client } = setup({ perms: { ...PERMS_AGENT, can_edit: false } });
    await userEvent.click(header());
    expect(within(tiles()[0]).queryByRole("button", { name: "Remove" })).toBeNull();
    await userEvent.click(within(tiles()[1]).getByRole("button", { name: "Remove" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Remove sip-trace.pcap?");
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(vi.mocked(axios.delete)).toHaveBeenCalledWith("/api/attachments/2/", expect.anything()));
    await waitFor(() => expect(tiles()).toHaveLength(1));
    expect(client.getQueryData<TicketDetail>(tk.ticket(10))!.attachments.map((a) => a.id)).toEqual([1]);
  });

  it("editors and staff may remove any file", async () => {
    const { unmount } = setup({ perms: PERMS_ALL });
    await userEvent.click(header());
    expect(within(tiles()[0]).getByRole("button", { name: "Remove" })).toBeInTheDocument();
    unmount();
    profile.current = { id: 9, is_staff: true };
    setup({ perms: { ...PERMS_AGENT, can_edit: false } });
    await userEvent.click(header());
    expect(within(tiles()[0]).getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("empty text: 'drop files anywhere' on desktop, 'tap Upload' on touch devices", async () => {
    const { unmount } = setup({ attachments: [] });
    await userEvent.click(header());
    expect(document.querySelector('[data-slot="attachments-empty"]')).toHaveTextContent("Drop files anywhere on this page");
    unmount();
    mockMatchMedia((q) => q.includes("pointer: coarse"));
    setup({ attachments: [] });
    await userEvent.click(header());
    expect(document.querySelector('[data-slot="attachments-empty"]')).toHaveTextContent("Tap Upload to add one");
  });
});
