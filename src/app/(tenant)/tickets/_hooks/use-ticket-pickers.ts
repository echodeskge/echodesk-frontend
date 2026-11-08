"use client";

/**
 * Option lists for the ticket pickers (create sheet, rail, filters). Every
 * list is fetched through `getAllPages` (page_size=100 until `next` is null,
 * WS12), so large tenants see every user, tag and group.
 */
import { useQuery } from "@tanstack/react-query";
import type { Department, Tag, TenantGroup, TicketColumn, User } from "@/api/generated/interfaces";
import { getAllPages, getBoardAccess } from "../_lib/api";
import { tk } from "../_lib/query-keys";
import type { BoardAccess } from "../_lib/types";

type PickerUser = Pick<User, "id" | "email" | "first_name" | "last_name" | "full_name" | "is_staff" | "is_active"> & {
  is_superuser?: boolean;
  tenant_groups?: { id: number }[];
};

const STALE = 2 * 60_000;

/**
 * Users who can work on a board (ported from the create sheet, W53, plus
 * `order_users` to match the server's board access, E2):
 * - a board with no users, groups or order users is open: everyone;
 * - otherwise board users, order users, members of the board's groups,
 *   and staff/superusers (they see every board).
 */
export function filterUsersForBoard<U extends PickerUser>(users: U[], board: BoardAccess | null | undefined): U[] {
  if (!board) return users;
  const direct = [...(board.board_users ?? []), ...(board.order_users ?? [])].map((u) => u.id);
  const groupIds = new Set((board.board_groups ?? []).map((g) => g.id));
  if (direct.length === 0 && groupIds.size === 0) return users;
  const allowed = new Set(direct);
  return users.filter(
    (u) =>
      u.is_staff ||
      u.is_superuser ||
      allowed.has(u.id) ||
      (u.tenant_groups ?? []).some((g) => groupIds.has(g.id)),
  );
}

async function fetchBoardUsers(boardId: number | null): Promise<PickerUser[]> {
  const [users, board] = await Promise.all([
    getAllPages<PickerUser>("/api/users/"),
    boardId ? getBoardAccess(boardId) : Promise.resolve(null),
  ]);
  return filterUsersForBoard(users, board);
}

export function sortColumns<C extends { id: number; position?: number }>(columns: C[]): C[] {
  return [...columns].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id);
}

export function useTicketPickers(boardId: number | null, options: { enabled?: boolean } = {}) {
  const enabled = options.enabled !== false;

  const users = useQuery({
    queryKey: tk.users(boardId),
    queryFn: () => fetchBoardUsers(boardId),
    enabled,
    staleTime: STALE,
  });

  const columns = useQuery({
    queryKey: tk.columns(boardId ?? 0),
    queryFn: async () => sortColumns(await getAllPages<TicketColumn>("/api/columns/", { board: boardId })),
    enabled: enabled && !!boardId,
    staleTime: STALE,
  });

  const tags = useQuery({
    queryKey: tk.tags(),
    queryFn: () => getAllPages<Tag>("/api/tags/"),
    enabled,
    staleTime: STALE,
  });

  const groups = useQuery({
    queryKey: tk.groups(),
    queryFn: () => getAllPages<TenantGroup>("/api/tenant-groups/"),
    enabled,
    staleTime: STALE,
  });

  const departments = useQuery({
    queryKey: tk.departments(),
    queryFn: () => getAllPages<Department>("/api/departments/"),
    enabled,
    staleTime: STALE,
  });

  return {
    users: users.data ?? [],
    columns: columns.data ?? [],
    tags: tags.data ?? [],
    groups: groups.data ?? [],
    departments: departments.data ?? [],
    isLoading: users.isLoading || columns.isLoading || tags.isLoading || groups.isLoading || departments.isLoading,
    queries: { users, columns, tags, groups, departments },
  };
}
