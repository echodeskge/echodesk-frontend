"use client";

/**
 * Board row (FE-12): the transfer flow shared with the header's ⋮ menu
 * (`useTicketTransfer` + `TransferConfirmDialog`). Picking another board
 * asks for confirmation, then moves the ticket to that board's first
 * column. Hidden when `!can_transfer` (DC19).
 */
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { PropertyPicker, type PickerOption } from "../../../_components/primitives/property-picker";
import { PropertyRow } from "../../../_components/primitives/property-row";
import { useBoardsLite } from "../../../_hooks/use-boards-lite";
import type { TicketDetail, ViewerPermissions } from "../../../_lib/types";
import { TransferConfirmDialog, useTicketTransfer } from "../transfer-menu";
import { useEditingPresence, RailLabel } from "./rail-shared";

export function BoardRow({ ticket, perms }: { ticket: TicketDetail; perms: ViewerPermissions }) {
  const t = useTranslations("ticketsScreen.rail");
  const boards = useBoardsLite({ enabled: perms.can_transfer });
  const transfer = useTicketTransfer(ticket);
  const presence = useEditingPresence(ticket.id, "board");

  const options: PickerOption<number>[] = useMemo(() => {
    const out: PickerOption<number>[] = (boards.data ?? []).map((b) => ({ value: b.id, label: b.name, color: b.color }));
    if (ticket.board && !out.some((o) => o.value === ticket.board.id)) {
      out.unshift({ value: ticket.board.id, label: ticket.board.name, color: ticket.board.color });
    }
    return out;
  }, [boards.data, ticket.board]);

  if (!perms.can_transfer) return null;

  return (
    <PropertyRow label={<RailLabel>{t("board")}</RailLabel>}>
      <PropertyPicker
        options={options}
        value={ticket.board?.id ?? null}
        onChange={(id) => {
          const target = options.find((o) => o.value === id);
          if (target && id !== ticket.board?.id) transfer.pick({ id, name: target.label, color: target.color });
        }}
        onOpenChange={presence}
        placeholder={t("notSet")}
        disabled={transfer.pending}
        searchPlaceholder={t("search")}
        emptyText={t("noResults")}
        selectedLabel={t("selected")}
      />
      <TransferConfirmDialog
        target={transfer.target}
        onOpenChange={(open) => {
          if (!open && !transfer.pending) transfer.cancel();
        }}
        onConfirm={transfer.confirm}
        pending={transfer.pending}
      />
    </PropertyRow>
  );
}
