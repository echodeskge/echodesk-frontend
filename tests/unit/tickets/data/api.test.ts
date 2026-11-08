import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import axios from "@/api/axios";
import * as api from "@/app/(tenant)/tickets/_lib/api";

const get = vi.mocked(axios.get);
const post = vi.mocked(axios.post);
const patch = vi.mocked(axios.patch);
const del = vi.mocked(axios.delete);
const H = { headers: { "X-Client-Mutation": "mid-1" } };

beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue({ data: {} });
  post.mockResolvedValue({ data: {} });
  patch.mockResolvedValue({ data: {} });
  del.mockResolvedValue({ data: null });
});

describe("filtersToParams", () => {
  it("maps every A4 filter", () => {
    expect(
      api.filtersToParams({
        assignee: ["me", "4"],
        unassigned: true,
        priority: ["critical", "high"],
        label: [3, 5],
        due: "week",
        q: " login ",
        sort: "priority",
      }),
    ).toEqual({
      assignee: "me,4",
      unassigned: 1,
      priority__in: "critical,high",
      tags__in: "3,5",
      due: "week",
      q: "login",
      ordering: "priority_rank",
    });
  });

  it("uses `search` for the list endpoint and omits empty values", () => {
    expect(api.filtersToParams({ q: "x", assignee: [], priority: [], due: null }, "search")).toEqual({ search: "x" });
    expect(api.filtersToParams(undefined)).toEqual({});
  });

  it("maps sorts to server orderings", () => {
    expect(api.sortToOrdering("manual")).toBe("position_in_column");
    expect(api.sortToOrdering("created")).toBe("-created_at");
    expect(api.sortToOrdering("updated")).toBe("-updated_at");
    expect(api.sortToOrdering("due")).toBe("due_date");
    expect(api.sortToOrdering(undefined)).toBeUndefined();
  });
});

describe("getAllPages", () => {
  it("follows next with page_size=100 and stops at null", async () => {
    get
      .mockResolvedValueOnce({ data: { count: 3, next: "https://t.api/api/tags/?page=2&page_size=100", previous: null, results: [{ id: 1 }, { id: 2 }] } })
      .mockResolvedValueOnce({ data: { count: 3, next: null, previous: "x", results: [{ id: 3 }] } });
    const rows = await api.getAllPages<{ id: number }>("/api/tags/", { board: 2 });
    expect(rows.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenNthCalledWith(1, "/api/tags/", { params: { board: 2, page_size: 100, page: 1 } });
    expect(get).toHaveBeenNthCalledWith(2, "/api/tags/", { params: { board: 2, page_size: 100, page: 2 } });
  });

  it("accepts an unpaginated array", async () => {
    get.mockResolvedValueOnce({ data: [{ id: 7 }] });
    expect(await api.getAllPages("/api/x/")).toEqual([{ id: 7 }]);
  });

  it("never loops on a next that doesn't advance", async () => {
    get.mockResolvedValue({ data: { count: 1, next: "/api/x/?page=1", previous: null, results: [{ id: 1 }] } });
    expect(await api.getAllPages("/api/x/")).toEqual([{ id: 1 }]);
    expect(get).toHaveBeenCalledTimes(1);
  });
});

describe("nextPageNumber", () => {
  it("reads the page from absolute and relative URLs", () => {
    expect(api.nextPageNumber("https://a.b/api/x/?page=3")).toBe(3);
    expect(api.nextPageNumber("/api/x/?page_size=5&page=2")).toBe(2);
    expect(api.nextPageNumber(null)).toBeNull();
    expect(api.nextPageNumber("/api/x/")).toBeNull();
  });
});

describe("boards, kanban, list, counts", () => {
  it("getBoardsLite pages through boards/?lite=1", async () => {
    get.mockResolvedValueOnce({ data: { count: 1, next: null, previous: null, results: [{ id: 1, name: "S" }] } });
    expect(await api.getBoardsLite()).toEqual([{ id: 1, name: "S" }]);
    expect(get).toHaveBeenCalledWith("/api/boards/", { params: { lite: 1, page_size: 100, page: 1 } });
  });

  it("getBoardAccess reads the full board", async () => {
    await api.getBoardAccess(4);
    expect(get).toHaveBeenCalledWith("/api/boards/4/");
  });

  it("getKanban sends lite=1 and filters; manual sort sends no ordering", async () => {
    await api.getKanban(2, { q: "abc", priority: ["low"], sort: "manual" });
    expect(get).toHaveBeenCalledWith("/api/boards/2/kanban_board/", {
      params: { lite: 1, q: "abc", priority__in: "low" },
    });
    await api.getKanban(2, { sort: "due" });
    expect(get).toHaveBeenLastCalledWith("/api/boards/2/kanban_board/", { params: { lite: 1, ordering: "due_date" } });
  });

  it("getTicketList always sends group=column, uses `search`, and pages by 50", async () => {
    await api.getTicketList(3, { q: "x", sort: "updated" }, 2);
    expect(get).toHaveBeenCalledWith("/api/tickets/", {
      params: { board: 3, group: "column", page: 2, page_size: 50, search: "x", ordering: "-updated_at" },
    });
  });

  it("getColumnCounts sends board and filters without ordering", async () => {
    await api.getColumnCounts(3, { due: "overdue", sort: "priority" });
    expect(get).toHaveBeenCalledWith("/api/tickets/column_counts/", { params: { board: 3, due: "overdue" } });
  });

  it("getViewCounts scopes to a board or all boards", async () => {
    await api.getViewCounts(5);
    expect(get).toHaveBeenLastCalledWith("/api/tickets/view_counts/", { params: { board: 5 } });
    await api.getViewCounts(null);
    expect(get).toHaveBeenLastCalledWith("/api/tickets/view_counts/", { params: {} });
  });
});

describe("ticket detail", () => {
  it("reads ticket, navigation, activity and history", async () => {
    await api.getTicket(8);
    expect(get).toHaveBeenLastCalledWith("/api/tickets/8/");
    await api.getNavigation(8, { view: "list", sort: "priority", assignee: ["me"] });
    expect(get).toHaveBeenLastCalledWith("/api/tickets/8/navigation/", {
      params: { view: "list", assignee: "me", ordering: "priority_rank" },
    });
    await api.getActivity(8);
    expect(get).toHaveBeenLastCalledWith("/api/tickets/8/activity/");
    await api.getHistory(8);
    expect(get).toHaveBeenLastCalledWith("/api/tickets/8/history/");
  });

  it("attaches the mutation header to writes", async () => {
    await api.patchTicket(8, { title: "t" }, "mid-1");
    expect(patch).toHaveBeenLastCalledWith("/api/tickets/8/", { title: "t" }, H);
    await api.moveTicket(8, { column_id: 2 }, "mid-1");
    expect(patch).toHaveBeenLastCalledWith("/api/tickets/8/move_to_column/", { column_id: 2 }, H);
    await api.deleteTicket(8, "mid-1");
    expect(del).toHaveBeenLastCalledWith("/api/tickets/8/", H);
  });

  it("sends no header object when no mutation id is given", async () => {
    await api.patchTicket(8, { title: "t" });
    expect(patch).toHaveBeenLastCalledWith("/api/tickets/8/", { title: "t" }, undefined);
  });

  it("comments", async () => {
    await api.createComment({ ticket: 8, comment: "hi", is_internal: false }, "mid-1");
    expect(post).toHaveBeenLastCalledWith("/api/comments/", { ticket: 8, comment: "hi", is_internal: false }, H);
    await api.updateComment(4, { comment: "edit" }, "mid-1");
    expect(patch).toHaveBeenLastCalledWith("/api/comments/4/", { comment: "edit" }, H);
    await api.deleteComment(4, "mid-1");
    expect(del).toHaveBeenLastCalledWith("/api/comments/4/", H);
  });

  it("uploads attachments as multipart with progress", async () => {
    const onProgress = vi.fn();
    const file = new File(["abc"], "a.txt", { type: "text/plain" });
    await api.uploadAttachment(8, file, onProgress, "mid-1");
    const [url, body, config] = post.mock.calls[0] as [string, FormData, { headers: Record<string, string>; onUploadProgress: (e: { loaded: number; total?: number }) => void }];
    expect(url).toBe("/api/attachments/");
    expect(body.get("ticket")).toBe("8");
    expect((body.get("file") as File).name).toBe("a.txt");
    expect(config.headers).toEqual({ "Content-Type": "multipart/form-data", "X-Client-Mutation": "mid-1" });
    config.onUploadProgress({ loaded: 50, total: 200 });
    expect(onProgress).toHaveBeenCalledWith(25);
    await api.deleteAttachment(3, "mid-1");
    expect(del).toHaveBeenLastCalledWith("/api/attachments/3/", H);
  });

  it("checklist endpoints", async () => {
    await api.checklistCreate({ ticket: 8, text: "a" }, "mid-1");
    expect(post).toHaveBeenLastCalledWith("/api/checklist-items/", { ticket: 8, text: "a" }, H);
    await api.checklistUpdate(2, { text: "b" }, "mid-1");
    expect(patch).toHaveBeenLastCalledWith("/api/checklist-items/2/", { text: "b" }, H);
    await api.checklistToggle(2, "mid-1");
    expect(patch).toHaveBeenLastCalledWith("/api/checklist-items/2/toggle_check/", {}, H);
    await api.checklistReorder(2, 0, "mid-1");
    expect(patch).toHaveBeenLastCalledWith("/api/checklist-items/2/reorder/", { position: 0 }, H);
    await api.checklistDelete(2, "mid-1");
    expect(del).toHaveBeenLastCalledWith("/api/checklist-items/2/", H);
  });

  it("timer endpoints", async () => {
    await api.timerGet(8);
    expect(get).toHaveBeenLastCalledWith("/api/tickets/8/timer/");
    await api.timerStart(8, {}, "mid-1");
    expect(post).toHaveBeenLastCalledWith("/api/tickets/8/timer/start/", {}, H);
    await api.timerStart(8, { switch: true }, "mid-1");
    expect(post).toHaveBeenLastCalledWith("/api/tickets/8/timer/start/", { switch: true }, H);
    await api.timerStop(8, "mid-1");
    expect(post).toHaveBeenLastCalledWith("/api/tickets/8/timer/stop/", {}, H);
    await api.timerCurrent();
    expect(get).toHaveBeenLastCalledWith("/api/time-entries/current/");
    await api.timerStopCurrent("mid-1");
    expect(post).toHaveBeenLastCalledWith("/api/time-entries/current/stop/", {}, H);
    await api.getTimeSummary(8);
    expect(get).toHaveBeenLastCalledWith("/api/time-logs/ticket_summary/", { params: { ticket: 8 } });
  });
});

describe("errorStatus", () => {
  it("reads the HTTP status from an axios error", () => {
    expect(api.errorStatus({ response: { status: 403 } })).toBe(403);
    expect(api.errorStatus(new Error("x"))).toBeUndefined();
    expect(api.errorStatus(null)).toBeUndefined();
  });
});
