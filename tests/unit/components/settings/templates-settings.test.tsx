/**
 * Settings → Templates: WhatsApp template cards (design TEMPLATES page) and
 * the saved replies table; the old /social/templates routes redirect here and
 * the main menu no longer has its own Templates item.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import type { QuickReply } from "@/hooks/api/useSocial";

const replace = vi.fn();
const push = vi.fn();
let search = "";
const syncMutate = vi.fn();
const deleteMutate = vi.fn();
const refetch = vi.fn();
const reorderMutate = vi.fn();
const deleteReplyMutate = vi.fn();
let replies: QuickReply[] = [];
let templates: unknown[] = [];
let connected = true;

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
  usePathname: () => "/settings/templates",
  useSearchParams: () => new URLSearchParams(search),
  redirect: vi.fn(),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/messages-beta/sidebar/NewWhatsAppMessageDialog", () => ({
  NewWhatsAppMessageDialog: ({ open }: { open: boolean }) => (open ? <div data-testid="compose-dialog" /> : null),
}));
vi.mock("@/components/social/QuickReplyForm", () => ({
  QuickReplyForm: ({ editingReply }: { editingReply: QuickReply | null }) => (
    <div data-testid="quick-reply-form">{editingReply ? editingReply.title : "new"}</div>
  ),
}));
vi.mock("@/hooks/api/useSocial", () => ({
  useWhatsAppStatus: () => ({
    data: connected ? { connected: true, accounts: [{ waba_id: "W1", business_name: "Shop" }] } : { connected: false },
    isLoading: false,
  }),
  useWhatsAppTemplates: () => ({ data: templates, isLoading: false, refetch }),
  useSyncWhatsAppTemplates: () => ({ mutateAsync: syncMutate, isPending: false }),
  useDeleteWhatsAppTemplate: () => ({ mutateAsync: deleteMutate, isPending: false }),
  useQuickReplies: () => ({ data: replies, isLoading: false }),
  useDeleteQuickReply: () => ({ mutate: deleteReplyMutate, isPending: false }),
  useReorderQuickReplies: () => ({ mutate: reorderMutate, isPending: false }),
}));

import { TemplatesSettings } from "@/app/(tenant)/settings/templates/_components/templates-settings";
import {
  movedPositions,
  sortReplies,
} from "@/app/(tenant)/settings/templates/_components/saved-replies-tab";
import { templatePreviewText } from "@/app/(tenant)/settings/templates/_components/template-utils";

function reply(id: number, position: number, overrides: Partial<QuickReply> = {}): QuickReply {
  return {
    id,
    title: `Reply ${id}`,
    message: `Message ${id}`,
    platforms: ["all"],
    shortcut: "",
    category: "",
    use_count: 0,
    position,
    created_by: null,
    created_by_name: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("TemplatesSettings — WhatsApp tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    search = "";
    connected = true;
    templates = [
      {
        id: 1,
        name: "order_ready",
        language: "ka",
        category: "UTILITY",
        status: "APPROVED",
        components: [{ type: "BODY", text: "Hi {{1}}, your order is ready" }],
      },
      { id: 2, name: "promo", language: "en", category: "MARKETING", status: "PENDING", components: [] },
    ];
  });

  it("shows template cards with a bubble preview, status and Use", () => {
    render(<TemplatesSettings />);
    expect(screen.getByTestId("templates-grid")).toBeInTheDocument();
    expect(screen.getByText("order_ready")).toBeInTheDocument();
    expect(screen.getByText("Hi {{1}}, your order is ready")).toBeInTheDocument();
    const uses = screen.getAllByRole("button", { name: /use/ });
    expect(uses[0]).not.toBeDisabled();
    expect(uses[1]).toBeDisabled(); // pending template
    fireEvent.click(uses[0]);
    expect(screen.getByTestId("compose-dialog")).toBeInTheDocument();
  });

  it("syncs from Meta", async () => {
    render(<TemplatesSettings />);
    fireEvent.click(screen.getByTestId("templates-sync"));
    await waitFor(() => expect(syncMutate).toHaveBeenCalledWith("W1"));
  });

  it("asks before deleting (no browser confirm)", async () => {
    render(<TemplatesSettings />);
    fireEvent.click(screen.getByRole("button", { name: 'deleteTemplate:{"name":"order_ready"}' }));
    expect(deleteMutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "delete" }));
    await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith(1));
  });

  it("asks to connect WhatsApp first", () => {
    connected = false;
    render(<TemplatesSettings />);
    expect(screen.getByTestId("templates-connect-first")).toBeInTheDocument();
  });

  it("switches to Saved replies through the URL", () => {
    render(<TemplatesSettings />);
    fireEvent.click(screen.getByRole("tab", { name: "tabs.replies" }));
    expect(replace).toHaveBeenCalledWith("/settings/templates?tab=replies");
  });
});

describe("TemplatesSettings — Saved replies tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    search = "tab=replies";
    replies = [reply(1, 1, { platforms: ["email", "whatsapp"], use_count: 4 }), reply(2, 0, { shortcut: "hi" })];
  });

  it("lists replies in their order with channels and uses", () => {
    render(<TemplatesSettings />);
    const rows = screen.getAllByTestId(/^saved-reply-/);
    expect(rows.map((r) => r.getAttribute("data-testid"))).toEqual(["saved-reply-2", "saved-reply-1"]);
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("moves a reply down", () => {
    render(<TemplatesSettings />);
    fireEvent.click(screen.getAllByRole("button", { name: "moveDown" })[0]);
    expect(reorderMutate).toHaveBeenCalledWith(
      [
        { id: 1, position: 0 },
        { id: 2, position: 1 },
      ],
      expect.any(Object)
    );
  });

  it("opens the form to create and to edit", () => {
    render(<TemplatesSettings />);
    fireEvent.click(screen.getByTestId("new-saved-reply"));
    expect(screen.getByTestId("quick-reply-form")).toHaveTextContent("new");
  });

  it("filters by search", () => {
    render(<TemplatesSettings />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "message 1" } });
    expect(screen.getAllByTestId(/^saved-reply-/)).toHaveLength(1);
  });

  it("confirms before deleting", () => {
    render(<TemplatesSettings />);
    fireEvent.click(screen.getAllByRole("button", { name: "delete" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "delete" }));
    expect(deleteReplyMutate).toHaveBeenCalledWith(2, expect.any(Object));
  });
});

describe("helpers", () => {
  it("sorts by position then title and renumbers on move", () => {
    const list = [reply(5, 2), reply(6, 0), reply(7, 1)];
    expect(sortReplies(list).map((r) => r.id)).toEqual([6, 7, 5]);
    expect(movedPositions(list, 6, -1)).toBeNull();
    expect(movedPositions(list, 5, -1)).toEqual([
      { id: 6, position: 0 },
      { id: 5, position: 1 },
      { id: 7, position: 2 },
    ]);
  });

  it("builds the preview from header, body and footer", () => {
    expect(
      templatePreviewText({
        components: [
          { type: "FOOTER", text: "Bye" },
          { type: "BODY", text: "Body" },
          { type: "HEADER", text: "Hello" },
        ],
      })
    ).toBe("Hello\n\nBody\n\nBye");
  });
});
