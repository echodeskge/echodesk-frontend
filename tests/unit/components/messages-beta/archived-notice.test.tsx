/**
 * Tests for MessagesBetaArchivedNotice — the inline "moved to History"
 * strip shown when the open chat is archived while the sidebar is still
 * on the active (All/Assigned) view. Must self-clear on restore and in
 * the History view itself.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { MessagesBetaArchivedNotice } from "@/components/messages-beta/chat-box/MessagesBetaArchivedNotice";
import { useMessagesBetaStore } from "@/components/messages-beta/store/useMessagesBetaStore";

const CHAT_ID = "fb_page_1_sender_1";
const META = { archivedAt: "2026-07-01T10:00:00Z", byUserId: null };

beforeEach(() => {
  useMessagesBetaStore.getState().reset();
});

describe("MessagesBetaArchivedNotice", () => {
  it("renders when the chat is archived and the sidebar shows the active view", () => {
    useMessagesBetaStore.getState().patchArchive(CHAT_ID, META);
    render(<MessagesBetaArchivedNotice chatId={CHAT_ID} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("movedToHistory")).toBeInTheDocument();
    expect(screen.getByText("movedToHistoryHint")).toBeInTheDocument();
  });

  it("renders nothing in the History view", () => {
    useMessagesBetaStore.getState().patchArchive(CHAT_ID, META);
    useMessagesBetaStore.getState().setShowArchived(true);
    render(<MessagesBetaArchivedNotice chatId={CHAT_ID} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders nothing when the chat is not archived", () => {
    useMessagesBetaStore.getState().patchArchive(CHAT_ID, null);
    render(<MessagesBetaArchivedNotice chatId={CHAT_ID} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("disappears when the chat is restored", () => {
    useMessagesBetaStore.getState().patchArchive(CHAT_ID, META);
    render(<MessagesBetaArchivedNotice chatId={CHAT_ID} />);
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => {
      useMessagesBetaStore.getState().patchArchive(CHAT_ID, null);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
