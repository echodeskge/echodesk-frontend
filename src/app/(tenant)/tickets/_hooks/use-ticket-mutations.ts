"use client";

/**
 * Ticket writes used across the board, list and detail (plan §4.5, E11, E33).
 *
 * - Every request carries a fresh mutation id (`X-Client-Mutation`), which is
 *   remembered so the realtime layer can ignore this tab's own echo.
 * - `patchTicket` writes the response into `tk.ticket(id)` and invalidates
 *   the board and list caches (prefixes, so every filter combination).
 * - Errors become translated toasts (`tickets.toasts.*`); server text is not
 *   shown because it may be English-only.
 */
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { deleteTicket, errorStatus, moveTicket, patchTicket } from "../_lib/api";
import { newMutationId, rememberMutation } from "../_lib/mutation-id";
import { tk } from "../_lib/query-keys";
import type { TicketDetail, TicketPatch } from "../_lib/types";

type ErrorKind = "saveError" | "moveError" | "deleteError";

/** Translation key (under the global `tickets` namespace) for a failed write. */
export function ticketErrorKey(error: unknown, fallback: ErrorKind): string {
  const status = errorStatus(error);
  if (status === 403) return "toasts.forbidden";
  return `toasts.${fallback}`;
}

function mid(): string {
  const id = newMutationId();
  rememberMutation(id);
  return id;
}

function boardIdOf(ticket: Partial<TicketDetail> | undefined): number | undefined {
  return ticket?.board?.id ?? ticket?.column?.board ?? undefined;
}

export function invalidateTicketCollections(qc: QueryClient, boardId?: number) {
  const scoped = (key: string) => (boardId ? [key, boardId] : [key]);
  qc.invalidateQueries({ queryKey: scoped("kanbanBoard") });
  qc.invalidateQueries({ queryKey: scoped("ticketList") });
  qc.invalidateQueries({ queryKey: scoped("ticketColumnCounts") });
}

export function useTicketMutations() {
  const qc = useQueryClient();
  const t = useTranslations("tickets");

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: number; body: TicketPatch }) => patchTicket(id, body, mid()),
    onSuccess: (data, { id }) => {
      const before = qc.getQueryData<TicketDetail>(tk.ticket(id));
      qc.setQueryData(tk.ticket(id), data);
      qc.invalidateQueries({ queryKey: tk.activity(id) });
      const oldBoard = boardIdOf(before);
      const newBoard = boardIdOf(data);
      invalidateTicketCollections(qc, newBoard);
      if (oldBoard && oldBoard !== newBoard) invalidateTicketCollections(qc, oldBoard);
    },
    onError: (error) => {
      toast.error(t(ticketErrorKey(error, "saveError")));
    },
  });

  const move = useMutation({
    mutationFn: ({
      id,
      columnId,
      position,
    }: {
      id: number;
      columnId: number;
      position?: number;
      boardId?: number;
    }) =>
      moveTicket(
        id,
        position === undefined ? { column_id: columnId } : { column_id: columnId, position_in_column: position },
        mid(),
      ),
    onSuccess: (data, { id, boardId }) => {
      qc.setQueryData(tk.ticket(id), (prev: TicketDetail | undefined) => (prev ? { ...prev, ...data } : prev));
      qc.invalidateQueries({ queryKey: tk.activity(id) });
      invalidateTicketCollections(qc, boardIdOf(data) ?? boardId);
    },
    onError: (error, { boardId }) => {
      // E33: never restore a local snapshot; refetch the server state.
      invalidateTicketCollections(qc, boardId);
      toast.error(t(ticketErrorKey(error, "moveError")));
    },
  });

  const remove = useMutation({
    mutationFn: ({ id }: { id: number; boardId?: number }) => deleteTicket(id, mid()),
    onSuccess: (_data, { id, boardId }) => {
      qc.removeQueries({ queryKey: tk.ticket(id) });
      invalidateTicketCollections(qc, boardId);
      qc.invalidateQueries({ queryKey: ["boards", "lite"] });
      qc.invalidateQueries({ queryKey: ["ticketViewCounts"] });
      toast.success(t("toasts.deleted"));
    },
    onError: (error) => {
      toast.error(t(ticketErrorKey(error, "deleteError")));
    },
  });

  return { patchTicket: patch, moveTicket: move, deleteTicket: remove };
}
