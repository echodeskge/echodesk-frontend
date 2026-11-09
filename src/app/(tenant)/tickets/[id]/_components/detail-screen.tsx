"use client";

/**
 * The new ticket detail screen (plan FE-09, §3 Detail; design file B).
 *
 * - Data: `useTicket(id)` (A7). States: loading skeleton, 404 "not found",
 *   403 "forbidden", other errors with Retry; all translated, with a way back.
 * - Header (slots): `DetailHeaderBridge`. Dialogs it opens (transfer confirm,
 *   history, delete) render here, inside the route providers.
 * - Status track, then two panes: the main column (max-width 780, gap 22,
 *   scrolling) with the composer at its foot, and the 300px rail. Below `lg`
 *   the panes stack and the page scrolls as one; the composer then sticks to
 *   the bottom while the main pane is in view.
 * - Realtime: `setBoardId(ticket.board.id)` (the wrapper does the same),
 *   `use-detail-realtime` keeps the caches fresh, J/K navigate.
 * - No `min-h-screen`: the screen fills the tenant layout's flex column.
 *   The root carries `data-ws-ready` (RM8).
 *
 * Section owners and props: `section-contracts.ts`.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, FileQuestion, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/hooks/useUserProfile";
import { DetailSkeleton } from "../../_components/primitives/skeletons";
import { EmptyState } from "../../_components/primitives/empty-state";
import { useTicketsRealtime } from "../../_contexts/tickets-realtime-context";
import { useBoardsLite } from "../../_hooks/use-boards-lite";
import { useTicket } from "../../_hooks/use-ticket";
import { useTicketMutations } from "../../_hooks/use-ticket-mutations";
import { errorStatus } from "../../_lib/api";
import type { TicketDetail } from "../../_lib/types";
import { useDetailRealtime } from "../_hooks/use-detail-realtime";
import { useTicketHotkeys } from "../_hooks/use-ticket-hotkeys";
import { useTicketNavigation } from "../_hooks/use-ticket-navigation";
import { ActivityFeed } from "./activity/activity-feed";
import { Composer } from "./composer/composer";
import { DeleteTicketDialog } from "./delete-ticket-dialog";
import { DetailHeaderBridge } from "./detail-header";
import { HistoryDialog } from "./history-dialog";
import { DetailMain } from "./main/detail-main";
import { PropertiesRail } from "./rail/properties-rail";
import { viewerPermissionsOf } from "./section-contracts";
import { StatusTrackBar } from "./status-track-bar";
import { TransferConfirmDialog, useTicketTransfer } from "./transfer-menu";

/** `/tickets/[id]` param → a positive integer id, or null. */
export function parseTicketId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

export type DetailState = "loading" | "not-found" | "forbidden" | "error" | "ready";

export function detailState(query: { data?: unknown; error?: unknown; isError: boolean }, validId: boolean): DetailState {
  if (!validId) return "not-found";
  if (query.data) return "ready";
  if (query.isError) {
    const status = errorStatus(query.error);
    if (status === 404) return "not-found";
    if (status === 403) return "forbidden";
    return "error";
  }
  return "loading";
}

function boardIdOf(ticket: TicketDetail | undefined): number | null {
  return ticket?.board?.id ?? ticket?.column?.board ?? null;
}

function Root({ wsReady, children, state }: { wsReady: boolean; children: ReactNode; state: DetailState }) {
  return (
    <div
      data-testid="ticket-detail"
      data-state={state}
      data-ws-ready={wsReady}
      className="flex min-h-0 w-full flex-1 flex-col bg-background"
    >
      {children}
    </div>
  );
}

export function DetailScreen({ ticketId }: { ticketId: number }) {
  const validId = Number.isInteger(ticketId) && ticketId > 0;
  const { wsReady, setBoardId } = useTicketsRealtime();
  const query = useTicket(validId ? ticketId : null);
  const ticket = query.data;
  const boardId = boardIdOf(ticket);
  const state = detailState(query, validId);

  useEffect(() => {
    if (boardId) setBoardId(boardId);
  }, [boardId, setBoardId]);

  const nav = useTicketNavigation(ticketId, boardId);
  useDetailRealtime({ ticketId, backHref: nav.backHref });
  useTicketHotkeys({ onNext: nav.goNext, onPrev: nav.goPrev, enabled: state === "ready" });

  if (state !== "ready" || !ticket) {
    return (
      <Root wsReady={wsReady} state={state}>
        {state === "loading" ? (
          <DetailSkeleton />
        ) : (
          <DetailError state={state} backHref={nav.backHref} onRetry={() => query.refetch()} />
        )}
      </Root>
    );
  }

  return (
    <Root wsReady={wsReady} state={state}>
      <ReadyDetail ticket={ticket} nav={nav} />
    </Root>
  );
}

function ReadyDetail({ ticket, nav }: { ticket: TicketDetail; nav: ReturnType<typeof useTicketNavigation> }) {
  const router = useRouter();
  const perms = viewerPermissionsOf(ticket);
  const boardId = boardIdOf(ticket);
  const { beingEdited } = useTicketsRealtime();
  const { data: profile } = useUserProfile();
  const boards = useBoardsLite({ enabled: perms.can_transfer });
  const transfer = useTicketTransfer(ticket);
  const { deleteTicket } = useTicketMutations();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const editing = beingEdited.get(ticket.id);
  const editingName = editing && editing.userId !== profile?.id ? editing.userName : null;

  const transferBoards = useMemo(
    () => (boards.data ?? []).filter((b) => b.id !== boardId).map((b) => ({ id: b.id, name: b.name, color: b.color })),
    [boards.data, boardId],
  );

  const confirmDelete = () =>
    deleteTicket.mutate(
      { id: ticket.id, boardId: boardId ?? undefined },
      {
        onSuccess: () => {
          setDeleteOpen(false);
          router.push(nav.backHref);
        },
      },
    );

  return (
    <>
      <DetailHeaderBridge
        ticketId={ticket.id}
        boardName={ticket.board?.name ?? ""}
        perms={perms}
        backHref={nav.backHref}
        position={nav.position}
        total={nav.total}
        prevId={nav.prevId}
        nextId={nav.nextId}
        onPrev={nav.goPrev}
        onNext={nav.goNext}
        transferBoards={transferBoards}
        onTransferPick={transfer.pick}
        onOpenHistory={() => setHistoryOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        editingName={editingName}
      />
      <StatusTrackBar ticket={ticket} perms={perms} />
      <div
        data-slot="detail-panes"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden"
      >
        <div data-slot="detail-main-pane" className="flex min-w-0 flex-col lg:min-h-0 lg:flex-1">
          <div data-slot="detail-main-scroll" className="p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-10 lg:pb-8 lg:pt-6">
            <div data-slot="detail-column" className="flex max-w-[780px] flex-col gap-[22px]">
              <DetailMain ticket={ticket} perms={perms} />
              <ActivityFeed ticketId={ticket.id} perms={perms} />
            </div>
          </div>
          <div data-slot="detail-composer" className="sticky bottom-0 z-10 shrink-0 bg-background lg:static">
            <Composer ticket={ticket} perms={perms} />
          </div>
        </div>
        <aside
          data-slot="detail-rail"
          className="w-full shrink-0 border-t lg:w-[300px] lg:overflow-y-auto lg:border-l lg:border-t-0"
        >
          <PropertiesRail ticket={ticket} perms={perms} />
        </aside>
      </div>

      {perms.can_transfer && (
        <TransferConfirmDialog
          target={transfer.target}
          onOpenChange={(open) => {
            if (!open && !transfer.pending) transfer.cancel();
          }}
          onConfirm={transfer.confirm}
          pending={transfer.pending}
        />
      )}
      <HistoryDialog
        ticketId={ticket.id}
        boardId={ticket.board?.id ?? ticket.column?.board ?? null}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
      {perms.can_delete && (
        <DeleteTicketDialog
          ticketId={ticket.id}
          open={deleteOpen}
          onOpenChange={(open) => {
            if (!deleteTicket.isPending) setDeleteOpen(open);
          }}
          onConfirm={confirmDelete}
          pending={deleteTicket.isPending}
        />
      )}
    </>
  );
}

function DetailError({ state, backHref, onRetry }: { state: DetailState; backHref: string; onRetry: () => void }) {
  const t = useTranslations("ticketsScreen.errors");
  const icon = state === "forbidden" ? Lock : state === "not-found" ? FileQuestion : AlertCircle;
  const title = state === "forbidden" ? t("forbidden") : state === "not-found" ? t("notFound") : t("loadFailed");
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <EmptyState
        icon={icon}
        title={title}
        action={
          <div className="flex items-center gap-2">
            {state === "error" && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                {t("retry")}
              </Button>
            )}
            <Button size="sm" asChild>
              <Link href={backHref}>{t("back")}</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
