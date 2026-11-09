/**
 * Data access for the board admin dialogs. Board, column and Telegram calls go
 * through the generated client (`@/api/generated/api`); list fetches go
 * through `getAllPages` so large tenants see every user, group and column
 * (W26, WS12).
 *
 * The generated types predate B1's `Board.color`; `BoardWithColor` and the
 * request types below add it until FE-INT regenerates the client.
 */
import type { QueryClient } from "@tanstack/react-query";
import type {
  Board,
  BoardRequest,
  PatchedBoardRequest,
  TenantGroup,
  TicketColumn,
  User,
} from "@/api/generated/interfaces";
import { getAllPages } from "@/app/(tenant)/tickets/_lib/api";
import { tk } from "@/app/(tenant)/tickets/_lib/query-keys";

export type BoardWithColor = Board & { color?: string; position?: number };
export type BoardCreateBody = BoardRequest & { color?: string };
export type BoardPatchBody = PatchedBoardRequest & { color?: string };

/** The minimum a caller passes to open a dialog for a board. */
export interface BoardRef {
  id: number;
  name?: string;
  color?: string;
  is_default?: boolean;
}

export type AdminUser = Pick<User, "id" | "email" | "first_name" | "last_name"> & {
  full_name?: string;
  is_active?: boolean;
};

export const boardAdminKeys = {
  /** Under the `['boards']` prefix, so every board invalidation refreshes it. */
  detail: (boardId: number) => ["boards", "detail", boardId] as const,
  telegram: (boardId: number) => ["boards", "telegram", boardId] as const,
  allUsers: () => tk.users(null),
  groups: () => tk.groups(),
  columns: (boardId: number) => tk.columns(boardId),
};

export function fetchAllUsers(): Promise<AdminUser[]> {
  return getAllPages<AdminUser>("/api/users/");
}

export function fetchAllGroups(): Promise<TenantGroup[]> {
  return getAllPages<TenantGroup>("/api/tenant-groups/");
}

export async function fetchColumns(boardId: number): Promise<TicketColumn[]> {
  const columns = await getAllPages<TicketColumn>("/api/columns/", { board: boardId });
  return [...columns].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id);
}

export function userLabel(u: AdminUser): string {
  const name = u.full_name?.trim() || `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  return name || u.email;
}

/** HTTP status of an axios error, if any. */
export function httpStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

/** Board list, switcher and sidebar caches (`['boards', …]` covers lite and legacy). */
export function invalidateBoards(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: ["boards"] });
}

/** Everything that renders a board's columns. */
export function invalidateBoardColumns(qc: QueryClient, boardId: number) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: tk.columns(boardId) }),
    qc.invalidateQueries({ queryKey: ["kanbanBoard", boardId] }),
    qc.invalidateQueries({ queryKey: ["ticketColumnCounts", boardId] }),
    qc.invalidateQueries({ queryKey: ["boards"] }),
  ]);
}

/** Board name, colour or access changed. */
export function invalidateBoard(qc: QueryClient, boardId: number) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ["boards"] }),
    qc.invalidateQueries({ queryKey: ["kanbanBoard", boardId] }),
    qc.invalidateQueries({ queryKey: ["ticketUsers"] }),
  ]);
}
