/** FE-11 composer. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";

const h = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock("@/hooks/useUserProfile", async () => (await import("./fe11-helpers")).profileMock);
vi.mock("sonner", () => ({ toast: h.toast }));

import axios from "@/api/axios";
import { Composer, draftKey, isMacPlatform } from "@/app/(tenant)/tickets/[id]/_components/composer/composer";
import { COMMENT_POSTED_EVENT } from "@/app/(tenant)/tickets/[id]/_components/activity/use-comment-mutations";
import { tk } from "@/app/(tenant)/tickets/_lib/query-keys";
import { PERMS_ALL, PERMS_AGENT, makeTicket, page, renderDetail, routeAxios, type Route } from "./helpers";
import { AGENT, STAFF, USERS, setProfile } from "./fe11-helpers";

const ticket = makeTicket({ customer: { id: 7, name: "Tamar Gelashvili", email: "t@x.ge", phone: "" } });
const postComment = vi.fn<Route>();
const postAttachment = vi.fn<Route>();
const postUse = vi.fn<Route>();

const REPLIES = [
  { id: 1, title: "Greeting", message: "Hello {{customer_name}}", platforms: ["all"], shortcut: "hi", category: "", use_count: 0, position: 0, created_by: null, created_by_name: null, created_at: "", updated_at: "" },
  { id: 2, title: "Closing", message: "Thanks, bye", platforms: ["all"], shortcut: "bye", category: "", use_count: 0, position: 1, created_by: null, created_by_name: null, created_at: "", updated_at: "" },
];

function routes() {
  routeAxios(axios, {
    get: {
      "/api/users/": () => page(USERS),
      "/api/boards/1/": () => ({ id: 1, board_users: [], board_groups: [], order_users: [] }),
      "/api/columns/": () => page([]),
      "/api/tags/": () => page([]),
      "/api/tenant-groups/": () => page([]),
      "/api/departments/": () => page([]),
      "/api/social/quick-replies/": () => REPLIES,
    },
    post: {
      "/api/comments/": postComment,
      "/api/attachments/": postAttachment,
      "/api/social/quick-replies/1/use/": postUse,
    },
  });
}

function renderComposer(perms = PERMS_ALL, locale: "en" | "ka" = "en") {
  return renderDetail(<Composer ticket={ticket} perms={perms} />, { locale });
}

function textarea() {
  return screen.getByRole("combobox", { name: "Add Comment" }) as HTMLTextAreaElement;
}

function setNavigatorPlatform(platform: string) {
  Object.defineProperty(window.navigator, "platform", { configurable: true, get: () => platform });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  setProfile(STAFF);
  routes();
  postComment.mockImplementation((_url, body) => ({ id: 99, ...(body as object) }));
  postAttachment.mockImplementation(() => ({ id: 5, filename: "trace.pcap" }));
  postUse.mockImplementation(() => ({ original_message: "Hello {{customer_name}}", processed_message: "Hello Tamar Gelashvili", use_count: 1 }));
  setNavigatorPlatform("MacIntel");
});

afterEach(() => {
  delete (window as unknown as { visualViewport?: unknown }).visualViewport;
});

describe("Composer", () => {
  it("shows my avatar in solid primary and the bar padding (16px gutters on phones)", () => {
    renderComposer();
    const avatar = document.querySelector('[data-slot="composer-avatar"]')!;
    expect(avatar).toHaveTextContent("NB");
    expect(avatar.className).toMatch(/\bbg-primary\b/);
    expect(avatar.className).toMatch(/text-primary-foreground/);
    const bar = document.querySelector('[data-slot="composer"]')!;
    expect(bar.className).toMatch(/px-4/);
    expect(bar.className).toMatch(/sm:px-10/);
    expect(bar.className).toMatch(/pt-3/);
    expect(bar.className).toMatch(/pb-3\.5/);
  });

  it("internal is on by default; staff can turn it off; label and placeholder follow", () => {
    renderComposer();
    const toggle = document.querySelector<HTMLButtonElement>('[data-slot="composer-internal"]')!;
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveTextContent("Internal note");
    expect(textarea()).toHaveAttribute("placeholder", "Write an internal note… Type @ to mention someone");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveTextContent("Not internal: customers can't see replies yet");
    expect(textarea()).toHaveAttribute("placeholder", "Write a comment… Type @ to mention someone");
  });

  it("non-staff: the toggle is locked on with the internalForced tooltip", async () => {
    setProfile(AGENT);
    renderComposer(PERMS_AGENT);
    const toggle = document.querySelector<HTMLButtonElement>('[data-slot="composer-internal"]')!;
    expect(toggle).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    fireEvent.focus(toggle);
    expect((await screen.findAllByText("Your comments are always internal")).length).toBeGreaterThan(0);
  });

  it("the box changes border/background when internal and when focused", () => {
    renderComposer();
    const box = document.querySelector('[data-slot="composer-box"]')!;
    const internalIdle = box.className;
    fireEvent.focus(textarea());
    const internalFocused = box.className;
    expect(internalFocused).not.toBe(internalIdle);
    fireEvent.click(document.querySelector('[data-slot="composer-internal"]')!);
    const publicFocused = box.className;
    fireEvent.blur(textarea());
    const publicIdle = box.className;
    expect(new Set([internalIdle, internalFocused, publicFocused, publicIdle]).size).toBe(4);
    expect(internalIdle).toMatch(/border-\[#f59e0b4d\]/);
    expect(publicIdle).toMatch(/border-input/);
    expect(publicFocused).toMatch(/border-ring/);
  });

  it("Post is disabled while the draft is empty", () => {
    renderComposer();
    const post = document.querySelector<HTMLButtonElement>('[data-slot="composer-post"]')!;
    expect(post).toBeDisabled();
    fireEvent.change(textarea(), { target: { value: "   " } });
    expect(post).toBeDisabled();
    fireEvent.change(textarea(), { target: { value: "hi" } });
    expect(post).toBeEnabled();
  });

  it("⌘↵ posts on Mac with the hint; internal flag and mutation header sent; draft cleared", async () => {
    const posted = vi.fn();
    window.addEventListener(COMMENT_POSTED_EVENT, posted);
    const { client } = renderComposer();
    const spy = vi.spyOn(client, "invalidateQueries");
    await waitFor(() => expect(document.querySelector('[data-slot="composer-hint"]')).toHaveTextContent("⌘↵"));
    expect(document.querySelector('[data-slot="composer-hint"]')).toHaveAttribute("title", "⌘↵ to post");
    fireEvent.change(textarea(), { target: { value: "Looks like a timer mismatch" } });
    fireEvent.keyDown(textarea(), { key: "Enter", metaKey: true });
    await waitFor(() => expect(postComment).toHaveBeenCalled());
    const [url, body, config] = postComment.mock.calls[0];
    expect(url).toBe("/api/comments/");
    expect(body).toEqual({ ticket: 10, comment: "Looks like a timer mismatch", is_internal: true });
    expect((config as { headers: Record<string, string> }).headers["X-Client-Mutation"]).toBeTruthy();
    await waitFor(() => expect(textarea().value).toBe(""));
    const keys = spy.mock.calls.map(([a]) => JSON.stringify((a as { queryKey: unknown }).queryKey));
    expect(keys).toContain(JSON.stringify(tk.activity(10)));
    expect(keys).toContain(JSON.stringify(tk.ticket(10)));
    expect(keys).toContain(JSON.stringify(["kanbanBoard", 1]));
    expect(posted).toHaveBeenCalled();
    window.removeEventListener(COMMENT_POSTED_EVENT, posted);
  });

  it("Ctrl↵ posts elsewhere, with the Ctrl hint; staff can post not-internal", async () => {
    setNavigatorPlatform("Win32");
    renderComposer();
    await waitFor(() => expect(document.querySelector('[data-slot="composer-hint"]')).toHaveTextContent("Ctrl↵"));
    fireEvent.click(document.querySelector('[data-slot="composer-internal"]')!);
    fireEvent.change(textarea(), { target: { value: "Public" } });
    fireEvent.keyDown(textarea(), { key: "Enter", metaKey: false, ctrlKey: false });
    expect(postComment).not.toHaveBeenCalled();
    fireEvent.keyDown(textarea(), { key: "Enter", ctrlKey: true });
    await waitFor(() => expect(postComment).toHaveBeenCalled());
    expect(postComment.mock.calls[0][1]).toEqual({ ticket: 10, comment: "Public", is_internal: false });
  });

  it("non-staff always post internal", async () => {
    setProfile(AGENT);
    renderComposer(PERMS_AGENT);
    fireEvent.change(textarea(), { target: { value: "Agent note" } });
    fireEvent.click(document.querySelector('[data-slot="composer-post"]')!);
    await waitFor(() => expect(postComment).toHaveBeenCalled());
    expect((postComment.mock.calls[0][1] as { is_internal: boolean }).is_internal).toBe(true);
  });

  it("a failed post shows the translated toast and keeps the draft", async () => {
    postComment.mockImplementation(() => {
      throw Object.assign(new Error("x"), { response: { status: 500 } });
    });
    renderComposer();
    fireEvent.change(textarea(), { target: { value: "keep me" } });
    fireEvent.click(document.querySelector('[data-slot="composer-post"]')!);
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith("Couldn't post the comment"));
    expect(textarea().value).toBe("keep me");
  });

  it("typing @ opens the mention list; Enter inserts @email", async () => {
    renderComposer();
    const ta = textarea();
    await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/users/", expect.anything()));
    ta.focus();
    fireEvent.change(ta, { target: { value: "ping @gio", selectionStart: 9, selectionEnd: 9 } });
    const list = await screen.findByRole("listbox");
    expect(within(list).getAllByRole("option")).toHaveLength(1);
    expect(within(list).getByRole("option")).toHaveTextContent("Giorgi Kapanadze");
    fireEvent.keyDown(ta, { key: "Enter" });
    expect(postComment).not.toHaveBeenCalled();
    await waitFor(() => expect(textarea().value).toBe("ping @giorgi@demo.ge "));
  });

  it("the mention list says 'No users found' (translated)", async () => {
    renderComposer(PERMS_ALL, "ka");
    const ta = screen.getByRole("combobox");
    await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/users/", expect.anything()));
    ta.focus();
    fireEvent.change(ta, { target: { value: "@zzz", selectionStart: 4, selectionEnd: 4 } });
    expect(await screen.findByText("მომხმარებლები ვერ მოიძებნა")).toBeInTheDocument();
  });

  it("the Mention button inserts @ at the caret and opens the list", async () => {
    renderComposer();
    const ta = textarea();
    fireEvent.change(ta, { target: { value: "Hello world" } });
    ta.setSelectionRange(5, 5);
    fireEvent.click(screen.getByRole("button", { name: "Mention someone" }));
    await waitFor(() => expect(textarea().value).toBe("Hello @ world"));
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
    expect(textarea().selectionStart).toBe(7);
  });

  it("Attach uploads to the ticket and inserts '📎 name'; a failure shows a toast", async () => {
    const { client } = renderComposer();
    const spy = vi.spyOn(client, "invalidateQueries");
    const input = screen.getByTestId("composer-file-input") as HTMLInputElement;
    const file = new File(["x"], "trace.pcap", { type: "application/octet-stream" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    await waitFor(() => expect(textarea().value).toBe("📎 trace.pcap"));
    const [url, form] = postAttachment.mock.calls[0];
    expect(url).toBe("/api/attachments/");
    expect((form as FormData).get("ticket")).toBe("10");
    expect(spy.mock.calls.map(([a]) => JSON.stringify((a as { queryKey: unknown }).queryKey))).toContain(
      JSON.stringify(tk.ticket(10)),
    );

    postAttachment.mockImplementation(() => {
      throw new Error("413");
    });
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(["y"], "big.mov")] } });
    });
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith("Couldn't attach big.mov"));
  });

  it("Saved reply inserts the processed quick reply at the caret", async () => {
    renderComposer();
    fireEvent.change(textarea(), { target: { value: "Hi. " } });
    textarea().setSelectionRange(4, 4);
    fireEvent.click(screen.getByRole("button", { name: "Saved reply" }));
    const search = await screen.findByRole("textbox", { name: "Search saved replies" });
    fireEvent.change(search, { target: { value: "greet" } });
    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(1);
    fireEvent.click(options[0]);
    await waitFor(() => expect(textarea().value).toBe("Hi. Hello Tamar Gelashvili"));
    expect(postUse.mock.calls[0][1]).toEqual({ customer_name: "Tamar Gelashvili", agent_name: "Nino Beridze" });
  });

  it("Saved reply is hidden without the social feature", () => {
    setProfile({ ...STAFF, feature_keys: ["ticket_management"] });
    renderComposer();
    expect(screen.queryByRole("button", { name: "Saved reply" })).toBeNull();
  });

  it("keeps the draft per ticket in sessionStorage", () => {
    window.sessionStorage.setItem(draftKey(10), "restored draft");
    const { unmount } = renderComposer();
    expect(textarea().value).toBe("restored draft");
    fireEvent.change(textarea(), { target: { value: "changed" } });
    expect(window.sessionStorage.getItem(draftKey(10))).toBe("changed");
    unmount();
    renderComposer();
    expect(textarea().value).toBe("changed");
  });

  it("survives blocked storage", () => {
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    renderComposer();
    fireEvent.change(textarea(), { target: { value: "x" } });
    expect(textarea().value).toBe("x");
    get.mockRestore();
    set.mockRestore();
  });

  it("pads above the on-screen keyboard (visualViewport)", () => {
    const listeners: Record<string, () => void> = {};
    const vv = {
      height: 844,
      offsetTop: 0,
      addEventListener: (type: string, fn: () => void) => {
        listeners[type] = fn;
      },
      removeEventListener: () => {},
    };
    Object.defineProperty(window, "visualViewport", { configurable: true, value: vv });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
    renderComposer();
    const bar = document.querySelector<HTMLElement>('[data-slot="composer"]')!;
    expect(bar.style.paddingBottom).toBe("");
    vv.height = 500;
    act(() => listeners.resize());
    expect(bar.style.paddingBottom).toBe("358px");
  });

  it("detects the platform", () => {
    expect(isMacPlatform({ platform: "MacIntel", userAgent: "" })).toBe(true);
    expect(isMacPlatform({ platform: "", userAgent: "iPhone" })).toBe(true);
    expect(isMacPlatform({ platform: "Win32", userAgent: "Windows" })).toBe(false);
  });
});
