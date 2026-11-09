"use client";

/**
 * Fills the app header for the board page (plan E22, FE-06):
 * - `breadcrumb`: the board switcher (the layout already renders the page
 *   title "Boards" and the "/" separator);
 * - `primary`: viewer avatars, then "New ticket".
 *
 * Deviation from E22: the viewers go into `primary` (before the button)
 * rather than `icons`, because the layout renders `primary | divider | icons`
 * and the design (D18–D23) puts the avatars left of "New ticket".
 *
 * Slot content renders outside the tickets route providers (risk 10), so every
 * hook runs here and the slot components only get translated strings,
 * plain data and callbacks. Callbacks go through a ref so the slot never
 * holds a stale closure between refreshes.
 */
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { Board } from "@/api/generated/interfaces";
import { useHeaderActions } from "@/contexts/HeaderActionsContext";
import { useTicketCreate } from "@/contexts/TicketCreateContext";
import { useBoardAdmin } from "@/components/tickets-admin/board-admin-host";
import { useTicketsRealtime } from "../../_contexts/tickets-realtime-context";
import { useTicketPermissions } from "../../_hooks/use-ticket-permissions";
import type { BoardLite } from "../../_lib/types";
import { BoardSwitcher } from "./board-switcher";
import { NewTicketButton } from "./new-ticket-button";
import { ViewerAvatars } from "./viewer-avatars";

export interface TicketsHeaderBridgeProps {
  boards: BoardLite[];
  currentBoard: BoardLite | null;
  onSelectBoard: (id: number) => void;
}

export function TicketsHeaderBridge({ boards, currentBoard, onSelectBoard }: TicketsHeaderBridgeProps) {
  const t = useTranslations("tickets");
  const ts = useTranslations("ticketsScreen.header");
  const { activeUsers } = useTicketsRealtime();
  const { canCreateTicket } = useTicketPermissions();
  const admin = useBoardAdmin();
  const { openTicketCreate } = useTicketCreate();

  const viewers = dedupeViewers(activeUsers);
  const labels = {
    switchBoard: t("boardAdmin.menu.switchBoard"),
    current: t("boardAdmin.menu.current"),
    newBoard: t("boardAdmin.menu.newBoard"),
    editColumns: t("boardAdmin.menu.editColumns"),
    manageUsers: t("boardAdmin.menu.manageUsers"),
    boardSettings: t("boardAdmin.menu.boardSettings"),
  };
  const newTicketLabel = ts("newTicket");
  const viewingLabel = t("presence.viewing", { count: viewers.length });

  const handlers = useRef({ onSelectBoard, currentBoard, admin, openTicketCreate });
  useEffect(() => {
    handlers.current = { onSelectBoard, currentBoard, admin, openTicketCreate };
  });

  const { gates } = admin;
  const hasBoard = currentBoard !== null;
  const boardsKey = boards.map((b) => `${b.id}:${b.name}:${b.color}:${b.open_count}`).join("|");
  const viewersKey = viewers.map((v) => `${v.id}:${v.name}`).join("|");

  useHeaderActions(
    {
      breadcrumb: hasBoard ? (
        <BoardSwitcher
          boards={boards}
          currentId={currentBoard.id}
          onSelect={(id) => handlers.current.onSelectBoard(id)}
          labels={labels}
          onNewBoard={
            gates.canCreateBoard
              ? () =>
                  handlers.current.admin.openCreateBoard({
                    onCreated: (b) => handlers.current.onSelectBoard(b.id),
                  })
              : undefined
          }
          onEditColumns={gates.canEditColumns ? () => withBoard((b) => handlers.current.admin.openEditColumns(b)) : undefined}
          onManageUsers={gates.canManageUsers ? () => withBoard((b) => handlers.current.admin.openManageUsers(b)) : undefined}
          onBoardSettings={gates.canOpenSettings ? () => withBoard((b) => handlers.current.admin.openBoardSettings(b)) : undefined}
        />
      ) : undefined,
      primary: (
        <>
          <ViewerAvatars viewers={viewers} label={viewingLabel} />
          {canCreateTicket && (
            <NewTicketButton
              label={newTicketLabel}
              onClick={() => {
                const b = handlers.current.currentBoard;
                // The create sheet only reads `id` from the board.
                handlers.current.openTicketCreate(b ? ({ id: b.id, name: b.name } as Board) : undefined);
              }}
            />
          )}
        </>
      ),
    },
    [
      hasBoard,
      currentBoard?.id,
      boardsKey,
      viewersKey,
      viewingLabel,
      newTicketLabel,
      canCreateTicket,
      gates.canCreateBoard,
      gates.canEditColumns,
      gates.canManageUsers,
      gates.canOpenSettings,
      labels.switchBoard,
      labels.newBoard,
    ],
  );

  function withBoard(fn: (b: { id: number; name: string; color: string; is_default: boolean }) => void) {
    const b = handlers.current.currentBoard;
    if (b) fn({ id: b.id, name: b.name, color: b.color, is_default: b.is_default });
  }

  return null;
}

/** One avatar per user (a user with two tabs joins twice). */
export function dedupeViewers(users: { user_id: number; user_name: string; user_email?: string }[]) {
  const seen = new Map<number, { id: number; name: string }>();
  for (const u of users) {
    if (!seen.has(u.user_id)) seen.set(u.user_id, { id: u.user_id, name: u.user_name || u.user_email || "?" });
  }
  return [...seen.values()];
}
