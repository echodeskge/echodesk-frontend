"use client";

/**
 * Board socket → detail caches (plan FE-09, §4.3).
 *
 * The detail page listens on its ticket's board (the wrapper and the screen
 * call `setBoardId(ticket.board.id)`). For events about THIS ticket:
 * - `ticket_updated`: the card fields (title, priority, labels, due date,
 *   counters) are patched into `tk.ticket(id)` at once; any change the card
 *   can't express (assignees, column, description, customer, …) also
 *   refetches the ticket. History and activity refetch.
 * - `ticket_moved`: refetch the ticket (new column) and the activity.
 * - `ticket_commented`: refetch the activity.
 * - `ticket_activity`: refetch the activity; `timer` also refetches
 *   `tk.timer(id)` and `tk.timerCurrent()`; checklist / attachment / form /
 *   comment changes refetch the ticket (those lists live in the detail).
 * - `ticket_deleted` with reason `transferred`: refetch the ticket and follow
 *   it to `to_board_id`, no redirect. Any other reason: a toast and back to
 *   the board.
 * Every created / deleted / moved event on the board refetches the "x of n"
 * navigation (positions shift).
 *
 * The echo of this tab's own writes (`client_mutation_id`) is ignored: the
 * mutation hooks already updated the caches.
 */
import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useBoardEvents, useTicketsRealtime } from "../../_contexts/tickets-realtime-context";
import { isOwnEvent } from "../../_lib/mutation-id";
import { tk } from "../../_lib/query-keys";
import type { BoardEvent, TicketCard, TicketDetail, TicketUpdatedEvent } from "../../_lib/types";

/** `ticket_updated.changes` keys that a card patch fully covers. */
const CARD_PATCHABLE: ReadonlySet<string> = new Set(["title", "priority", "tags", "due_date", "updated_at"]);

/** Activity kinds whose data also lives in the ticket detail payload. */
const DETAIL_KINDS: ReadonlySet<string> = new Set(["checklist", "attachment", "form", "comment", "comment_edited", "comment_deleted"]);

/** The detail fields a lite card (or the change list) can update in place. */
export function patchFromCard(prev: TicketDetail, card: TicketCard | undefined, event: TicketUpdatedEvent): TicketDetail {
  const next: TicketDetail = { ...prev };
  const changes = event.changes ?? {};
  if (card) {
    next.title = card.title;
    next.priority = card.priority;
    next.tags = card.tags;
    next.due_date = card.due_date;
    next.is_overdue_task = card.is_overdue_task;
    next.updated_at = card.updated_at;
    next.comments_count = card.comments_count;
    next.checklist_items_count = card.checklist_items_count;
    next.completed_checklist_items_count = card.completed_checklist_items_count;
  } else {
    if (changes.title) next.title = String(changes.title.new ?? "");
    if (changes.priority) next.priority = String(changes.priority.new ?? prev.priority);
    if (changes.due_date) next.due_date = (changes.due_date.new as string | null) ?? null;
    if (changes.tags && Array.isArray(changes.tags.new)) next.tags = changes.tags.new;
  }
  return next;
}

export function needsRefetch(event: TicketUpdatedEvent): boolean {
  const keys = Object.keys(event.changes ?? {});
  return keys.length === 0 || keys.some((k) => !CARD_PATCHABLE.has(k));
}

function refetchTicket(qc: QueryClient, id: number) {
  qc.invalidateQueries({ queryKey: tk.ticket(id) });
}

export interface DetailRealtimeOptions {
  ticketId: number;
  /** Where to go when the ticket is deleted. */
  backHref: string;
}

export function useDetailRealtime({ ticketId, backHref }: DetailRealtimeOptions): void {
  const qc = useQueryClient();
  const router = useRouter();
  // The parent namespace, so nothing is looked up before a delete arrives
  // (the `realtime` keys live in pending/fe-09.json until FE-INT merges them).
  const t = useTranslations("ticketsScreen.detail");
  const { setBoardId } = useTicketsRealtime();
  const backRef = useRef(backHref);
  useEffect(() => {
    backRef.current = backHref;
  });

  const handle = useCallback(
    (event: BoardEvent) => {
      if (event.type === "ticket_created" || event.type === "ticket_deleted" || event.type === "ticket_moved") {
        qc.invalidateQueries({ queryKey: ["ticketNav"] });
      }
      if (isOwnEvent(event)) return;

      const aboutThis =
        event.type === "ticket_created" ? event.ticket?.id === ticketId : event.ticket_id === ticketId;
      if (!aboutThis) return;

      switch (event.type) {
        case "ticket_updated": {
          qc.setQueryData<TicketDetail>(tk.ticket(ticketId), (prev) =>
            prev ? patchFromCard(prev, event.card, event) : prev,
          );
          if (needsRefetch(event)) refetchTicket(qc, ticketId);
          qc.invalidateQueries({ queryKey: tk.activity(ticketId) });
          qc.invalidateQueries({ queryKey: tk.history(ticketId) });
          break;
        }
        case "ticket_moved":
          refetchTicket(qc, ticketId);
          qc.invalidateQueries({ queryKey: tk.activity(ticketId) });
          qc.invalidateQueries({ queryKey: tk.history(ticketId) });
          qc.invalidateQueries({ queryKey: tk.timeSummary(ticketId) });
          break;
        case "ticket_commented":
          qc.invalidateQueries({ queryKey: tk.activity(ticketId) });
          break;
        case "ticket_activity":
          qc.invalidateQueries({ queryKey: tk.activity(ticketId) });
          if (event.kind === "timer") {
            qc.invalidateQueries({ queryKey: tk.timer(ticketId) });
            qc.invalidateQueries({ queryKey: tk.timerCurrent() });
          }
          if (event.kind === "history") qc.invalidateQueries({ queryKey: tk.history(ticketId) });
          if (DETAIL_KINDS.has(event.kind)) refetchTicket(qc, ticketId);
          break;
        case "ticket_deleted":
          if (event.reason === "transferred") {
            refetchTicket(qc, ticketId);
            qc.invalidateQueries({ queryKey: tk.history(ticketId) });
            qc.invalidateQueries({ queryKey: tk.activity(ticketId) });
            if (event.to_board_id) setBoardId(event.to_board_id);
            break;
          }
          toast.info(event.deleted_by_name ? t("realtime.deletedBy", { name: event.deleted_by_name }) : t("realtime.deleted"));
          router.push(backRef.current);
          break;
        default:
          break;
      }
    },
    [qc, router, setBoardId, t, ticketId],
  );

  useBoardEvents(handle);
}
