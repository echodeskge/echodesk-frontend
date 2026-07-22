/**
 * Tests for resolveDeepLinkArchiveState — the deep-link archive check.
 *
 * Archived chats are excluded from the active conversations list, so a
 * deep-linked row has no archive state (`undefined`). The helper fetches
 * the single-conversation status and, if archived, switches the sidebar
 * to the History view and patches the archive meta. A WS archive_update
 * landing mid-flight wins over the fetched snapshot.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { socialAssignmentsStatusRetrieve } from "@/api/generated/api";

const mockStatusRetrieve = vi.fn();

vi.mock("@/api/generated/api", () => ({
  socialAssignmentsStatusRetrieve: (...args: unknown[]) => mockStatusRetrieve(...args),
}));

import { resolveDeepLinkArchiveState } from "@/components/messages-beta/store/archive-status";
import { useMessagesBetaStore } from "@/components/messages-beta/store/useMessagesBetaStore";

type StatusResponse = Awaited<ReturnType<typeof socialAssignmentsStatusRetrieve>>;

const CHAT_ID = "fb_page_1_sender_1";
const ROW = {
  platform: "facebook" as const,
  accountId: "page_1",
  conversationKey: "sender_1",
};

// The generator doesn't emit null unions, but assignment / archived_at /
// archived_by_id are null at runtime for unassigned / non-archived chats.
function makeStatus(overrides: Partial<StatusResponse> = {}): StatusResponse {
  return {
    assignment: null as unknown as StatusResponse["assignment"],
    settings: {
      chat_assignment_enabled: false,
      session_management_enabled: false,
      hide_assigned_chats: false,
      collect_customer_rating: false,
    },
    is_archived: false,
    archived_at: null as unknown as string,
    archived_by_id: null as unknown as number,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useMessagesBetaStore.getState().reset();
  useMessagesBetaStore.getState().selectChat(CHAT_ID);
});

describe("resolveDeepLinkArchiveState", () => {
  it("archived chat: patches meta and switches to the History view", async () => {
    mockStatusRetrieve.mockResolvedValue(
      makeStatus({
        is_archived: true,
        archived_at: "2026-07-01T10:00:00Z",
        archived_by_id: 7,
      })
    );

    await resolveDeepLinkArchiveState(CHAT_ID, ROW);

    expect(mockStatusRetrieve).toHaveBeenCalledWith("page_1", "sender_1", "facebook");
    const state = useMessagesBetaStore.getState();
    expect(state.archivedByChatId[CHAT_ID]).toEqual({
      archivedAt: "2026-07-01T10:00:00Z",
      byUserId: 7,
    });
    expect(state.showArchived).toBe(true);
  });

  it("not archived: patches null and does not switch views", async () => {
    mockStatusRetrieve.mockResolvedValue(makeStatus());

    await resolveDeepLinkArchiveState(CHAT_ID, ROW);

    const state = useMessagesBetaStore.getState();
    expect(state.archivedByChatId[CHAT_ID]).toBeNull();
    expect(state.showArchived).toBe(false);
  });

  it("fetch failure: leaves state untouched and does not throw", async () => {
    mockStatusRetrieve.mockRejectedValue(new Error("network down"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(resolveDeepLinkArchiveState(CHAT_ID, ROW)).resolves.toBeUndefined();

    const state = useMessagesBetaStore.getState();
    expect(state.archivedByChatId[CHAT_ID]).toBeUndefined();
    expect(state.showArchived).toBe(false);
    warnSpy.mockRestore();
  });

  it("WS race: an archive_update landing mid-flight wins over the fetch", async () => {
    let resolveFetch!: (v: StatusResponse) => void;
    mockStatusRetrieve.mockReturnValue(
      new Promise<StatusResponse>((res) => {
        resolveFetch = res;
      })
    );

    const pending = resolveDeepLinkArchiveState(CHAT_ID, ROW);
    // WS says "not archived" while our fetch is still in flight.
    useMessagesBetaStore.getState().patchArchive(CHAT_ID, null);
    resolveFetch(
      makeStatus({ is_archived: true, archived_at: "2026-07-01T10:00:00Z" })
    );
    await pending;

    const state = useMessagesBetaStore.getState();
    expect(state.archivedByChatId[CHAT_ID]).toBeNull();
    expect(state.showArchived).toBe(false);
  });

  it("selection changed mid-flight: patches meta but does not switch views", async () => {
    let resolveFetch!: (v: StatusResponse) => void;
    mockStatusRetrieve.mockReturnValue(
      new Promise<StatusResponse>((res) => {
        resolveFetch = res;
      })
    );

    const pending = resolveDeepLinkArchiveState(CHAT_ID, ROW);
    useMessagesBetaStore.getState().selectChat("fb_page_1_other");
    resolveFetch(
      makeStatus({ is_archived: true, archived_at: "2026-07-01T10:00:00Z" })
    );
    await pending;

    const state = useMessagesBetaStore.getState();
    expect(state.archivedByChatId[CHAT_ID]).toEqual({
      archivedAt: "2026-07-01T10:00:00Z",
      byUserId: null,
    });
    expect(state.showArchived).toBe(false);
  });

  it("already in History view (?view=history deep link): idempotent", async () => {
    useMessagesBetaStore.getState().setShowArchived(true);
    mockStatusRetrieve.mockResolvedValue(
      makeStatus({ is_archived: true, archived_at: "2026-07-01T10:00:00Z" })
    );

    await resolveDeepLinkArchiveState(CHAT_ID, ROW);

    const state = useMessagesBetaStore.getState();
    expect(state.archivedByChatId[CHAT_ID]).toEqual({
      archivedAt: "2026-07-01T10:00:00Z",
      byUserId: null,
    });
    expect(state.showArchived).toBe(true);
  });
});
