"use client";

/**
 * Board admin host (plan §4.5, FE-04). Mounted once in the tenant layout so
 * the sidebar ("+ New board"), the board switcher menu and any other page can
 * open the board dialogs:
 *
 *   const { openCreateBoard, openEditColumns, openManageUsers, openBoardSettings, gates } = useBoardAdmin();
 *
 * Every open call is gated by the viewer's permissions (the same keys the
 * backend checks); `gates` lets entry points hide themselves. Dialogs are
 * code-split and mounted only while open.
 */
import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { boardsDefaultRetrieve } from "@/api/generated/api";
import { useBoard } from "@/contexts/BoardContext";
import { getBoardsLite } from "@/app/(tenant)/tickets/_lib/api";
import { useTicketPermissions } from "@/app/(tenant)/tickets/_hooks/use-ticket-permissions";
import type { BoardRef, BoardWithColor } from "./admin-api";

const BoardCreateSheet = lazy(() => import("./board-create-sheet").then((m) => ({ default: m.BoardCreateSheet })));
const BoardSettingsDialog = lazy(() =>
  import("./board-settings-dialog").then((m) => ({ default: m.BoardSettingsDialog })),
);
const BoardUserManager = lazy(() => import("./board-user-manager").then((m) => ({ default: m.BoardUserManager })));
const BoardStatusEditor = lazy(() => import("./board-status-editor").then((m) => ({ default: m.BoardStatusEditor })));

export type { BoardRef } from "./admin-api";

export interface BoardAdminGates {
  /** `create_boards` or staff. */
  canCreateBoard: boolean;
  /** `manage_columns` or staff. */
  canEditColumns: boolean;
  /** `edit_boards` or staff (access lists are board edits on the server). */
  canManageUsers: boolean;
  /** Any of edit, delete or set-default. */
  canOpenSettings: boolean;
}

export interface OpenCreateBoardOptions {
  onCreated?: (board: BoardWithColor) => void;
}

export interface BoardAdminApi {
  openCreateBoard: (options?: OpenCreateBoardOptions) => void;
  openEditColumns: (board: BoardRef) => void;
  openManageUsers: (board: BoardRef) => void;
  openBoardSettings: (board: BoardRef) => void;
  gates: BoardAdminGates;
}

const NO_GATES: BoardAdminGates = {
  canCreateBoard: false,
  canEditColumns: false,
  canManageUsers: false,
  canOpenSettings: false,
};

const noop = () => {};
const OUTSIDE_HOST: BoardAdminApi = {
  openCreateBoard: noop,
  openEditColumns: noop,
  openManageUsers: noop,
  openBoardSettings: noop,
  gates: NO_GATES,
};

const BoardAdminContext = createContext<BoardAdminApi | null>(null);

/** The host's API; a no-op with every gate closed outside `BoardAdminHost`. */
export function useBoardAdmin(): BoardAdminApi {
  return useContext(BoardAdminContext) ?? OUTSIDE_HOST;
}

type Active =
  | { kind: "create"; onCreated?: (board: BoardWithColor) => void }
  | { kind: "settings"; board: BoardRef }
  | { kind: "users"; board: BoardRef }
  | { kind: "columns"; board: BoardRef }
  | null;

function currentBoardParam(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = new URLSearchParams(window.location.search).get("board");
    const id = raw ? Number(raw) : NaN;
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

function onTicketsPath(): boolean {
  return typeof window !== "undefined" && (window.location.pathname ?? "").startsWith("/tickets");
}

/** The board to land on after `deletedId` is gone: the default board, else the first accessible one. */
export async function resolveFallbackBoard(deletedId: number): Promise<number | null> {
  try {
    const def = await boardsDefaultRetrieve();
    if (def?.id && def.id !== deletedId) return def.id;
  } catch {
    // 404 when no default board exists; fall through.
  }
  try {
    const boards = await getBoardsLite();
    return boards.find((b) => b.id !== deletedId)?.id ?? null;
  } catch {
    return null;
  }
}

export function BoardAdminHost({ children }: { children?: ReactNode }) {
  const perms = useTicketPermissions();
  const { selectedBoardId, setSelectedBoardId } = useBoard();
  const router = useRouter();
  const [active, setActive] = useState<Active>(null);

  const gates = useMemo<BoardAdminGates>(
    () => ({
      canCreateBoard: perms.canCreateBoard,
      canEditColumns: perms.canManageColumns,
      canManageUsers: perms.canEditBoard,
      canOpenSettings: perms.canEditBoard || perms.canDeleteBoard || perms.canSetDefaultBoard,
    }),
    [perms],
  );

  const openCreateBoard = useCallback(
    (options?: OpenCreateBoardOptions) => {
      if (gates.canCreateBoard) setActive({ kind: "create", onCreated: options?.onCreated });
    },
    [gates.canCreateBoard],
  );
  const openEditColumns = useCallback(
    (board: BoardRef) => {
      if (gates.canEditColumns) setActive({ kind: "columns", board });
    },
    [gates.canEditColumns],
  );
  const openManageUsers = useCallback(
    (board: BoardRef) => {
      if (gates.canManageUsers) setActive({ kind: "users", board });
    },
    [gates.canManageUsers],
  );
  const openBoardSettings = useCallback(
    (board: BoardRef) => {
      if (gates.canOpenSettings) setActive({ kind: "settings", board });
    },
    [gates.canOpenSettings],
  );

  const api = useMemo<BoardAdminApi>(
    () => ({ openCreateBoard, openEditColumns, openManageUsers, openBoardSettings, gates }),
    [openCreateBoard, openEditColumns, openManageUsers, openBoardSettings, gates],
  );

  const close = useCallback(() => setActive(null), []);

  const handleCreated = useCallback(
    (board: BoardWithColor) => {
      const callback = active?.kind === "create" ? active.onCreated : undefined;
      setSelectedBoardId(board.id);
      if (callback) callback(board);
      else if (onTicketsPath()) router.push(`/tickets?board=${board.id}`);
    },
    [active, router, setSelectedBoardId],
  );

  const handleDeleted = useCallback(
    async (boardId: number) => {
      const shown = onTicketsPath() ? (currentBoardParam() ?? selectedBoardId) : selectedBoardId;
      if (shown !== boardId && selectedBoardId !== boardId) return;
      const fallback = await resolveFallbackBoard(boardId);
      setSelectedBoardId(fallback);
      if (onTicketsPath()) router.replace(fallback ? `/tickets?board=${fallback}` : "/tickets");
    },
    [router, selectedBoardId, setSelectedBoardId],
  );

  return (
    <BoardAdminContext.Provider value={api}>
      {children}
      <Suspense fallback={null}>
        {active?.kind === "create" && <BoardCreateSheet open onClose={close} onCreated={handleCreated} />}
        {active?.kind === "settings" && (
          <BoardSettingsDialog
            open
            board={active.board}
            onClose={close}
            gates={{
              canEditBoard: perms.canEditBoard,
              canDeleteBoard: perms.canDeleteBoard,
              canSetDefaultBoard: perms.canSetDefaultBoard,
              canManageColumns: perms.canManageColumns,
            }}
            onDeleted={handleDeleted}
            onOpenUsers={() => setActive({ kind: "users", board: active.board })}
            onOpenColumns={() => setActive({ kind: "columns", board: active.board })}
          />
        )}
        {active?.kind === "users" && <BoardUserManager open board={active.board} onClose={close} />}
        {active?.kind === "columns" && <BoardStatusEditor open board={active.board} onClose={close} />}
      </Suspense>
    </BoardAdminContext.Provider>
  );
}
