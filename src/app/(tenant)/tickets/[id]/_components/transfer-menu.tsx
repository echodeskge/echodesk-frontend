"use client";

/**
 * Transfer to another board (plan FE-09, DC19, W64).
 *
 * - `TransferMenuSection`: the ⋮ menu's "Transfer to board" label and one row
 *   per other accessible board (colour dot + name). Plain props only: it
 *   renders inside the app header slot.
 * - `TransferConfirmDialog`: "Move this ticket to {board}?".
 * - `useTicketTransfer`: loads every page of the target board's columns
 *   (shared `tk.columns` cache), then moves the ticket to the first column.
 *   A target without columns gets a translated toast and no request.
 *
 * The caller hides all of it when `!viewer_permissions.can_transfer`.
 */
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { TicketColumn } from "@/api/generated/interfaces";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenuItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { ColorDot } from "../../_components/primitives/color-dot";
import { getAllPages } from "../../_lib/api";
import { tk } from "../../_lib/query-keys";
import { sortColumns } from "../../_hooks/use-ticket-pickers";
import { invalidateTicketCollections, useTicketMutations } from "../../_hooks/use-ticket-mutations";
import type { TicketDetail } from "../../_lib/types";

export interface TransferTarget {
  id: number;
  name: string;
  color?: string | null;
}

export function TransferMenuSection({
  boards,
  label,
  onPick,
}: {
  boards: TransferTarget[];
  label: string;
  onPick: (board: TransferTarget) => void;
}) {
  if (boards.length === 0) return null;
  return (
    <>
      <DropdownMenuLabel className="flex h-6 items-center px-2 py-0 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
        {label}
      </DropdownMenuLabel>
      {boards.map((b) => (
        <DropdownMenuItem
          key={b.id}
          data-testid={`transfer-board-${b.id}`}
          className="h-[30px] gap-2 px-2 text-[13px]"
          onSelect={() => onPick(b)}
        >
          <ColorDot color={b.color ?? undefined} />
          <span className="truncate">{b.name}</span>
        </DropdownMenuItem>
      ))}
    </>
  );
}

export function TransferConfirmDialog({
  target,
  onOpenChange,
  onConfirm,
  pending = false,
}: {
  target: TransferTarget | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (target: TransferTarget) => void;
  pending?: boolean;
}) {
  const t = useTranslations("ticketsScreen.detail.header");
  return (
    <AlertDialog open={target !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="transfer-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{target ? t("transferConfirm", { board: target.name }) : ""}</AlertDialogTitle>
          <AlertDialogDescription>{target ? t("transferConfirmBody", { board: target.name }) : ""}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending || !target}
            onClick={(e) => {
              e.preventDefault();
              if (target) onConfirm(target);
            }}
          >
            {t("transfer")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useTicketTransfer(ticket: Pick<TicketDetail, "id" | "board"> | undefined) {
  const qc = useQueryClient();
  const t = useTranslations("ticketsScreen.detail.header");
  const tToasts = useTranslations("tickets.toasts");
  const { moveTicket } = useTicketMutations();
  const [target, setTarget] = useState<TransferTarget | null>(null);
  const [loading, setLoading] = useState(false);

  const confirm = useCallback(
    async (board: TransferTarget) => {
      if (!ticket) return;
      setLoading(true);
      let columns: TicketColumn[];
      try {
        columns = await qc.fetchQuery({
          queryKey: tk.columns(board.id),
          queryFn: async () => sortColumns(await getAllPages<TicketColumn>("/api/columns/", { board: board.id })),
          staleTime: 60_000,
        });
      } catch {
        setLoading(false);
        toast.error(tToasts("moveError"));
        return;
      }
      const first = columns[0];
      if (!first) {
        setLoading(false);
        setTarget(null);
        toast.error(t("noColumns", { board: board.name }));
        return;
      }
      const fromBoard = ticket.board?.id;
      moveTicket.mutate(
        { id: ticket.id, columnId: first.id, boardId: fromBoard },
        {
          onSuccess: () => {
            if (fromBoard) invalidateTicketCollections(qc, fromBoard);
            qc.invalidateQueries({ queryKey: ["ticketNav", ticket.id] });
            qc.invalidateQueries({ queryKey: tk.history(ticket.id) });
            qc.invalidateQueries({ queryKey: tk.boards() });
            toast.success(tToasts("moved"));
          },
          onSettled: () => {
            setLoading(false);
            setTarget(null);
          },
        },
      );
    },
    [moveTicket, qc, t, tToasts, ticket],
  );

  return {
    /** The board awaiting confirmation (null = dialog closed). */
    target,
    pick: setTarget,
    cancel: () => setTarget(null),
    confirm,
    pending: loading || moveTicket.isPending,
  };
}
