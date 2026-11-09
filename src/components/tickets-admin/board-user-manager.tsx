"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Shield, UserCog, Users } from "lucide-react";
import { toast } from "sonner";
import { boardsPartialUpdate, boardsRetrieve } from "@/api/generated/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  boardAdminKeys,
  fetchAllGroups,
  fetchAllUsers,
  invalidateBoard,
  userLabel,
  type BoardRef,
  type BoardWithColor,
} from "./admin-api";

interface Option {
  id: number;
  label: string;
  meta?: string;
}

function toggle(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

function OptionList({
  idPrefix,
  options,
  selected,
  onChange,
  searchLabel,
  emptyLabel,
  disabled,
}: {
  idPrefix: string;
  options: Option[];
  selected: number[];
  onChange: (ids: number[]) => void;
  searchLabel: string;
  emptyLabel: string;
  disabled?: boolean;
}) {
  const t = useTranslations("tickets.boardAdmin.users");
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const visible = needle
    ? options.filter((o) => o.label.toLowerCase().includes(needle) || o.meta?.toLowerCase().includes(needle))
    : options;
  // Selected first, then alphabetical, so the current access is visible at a glance.
  const sorted = [...visible].sort(
    (a, b) => Number(selected.includes(b.id)) - Number(selected.includes(a.id)) || a.label.localeCompare(b.label),
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={q}
            aria-label={searchLabel}
            placeholder={searchLabel}
            className="h-[34px] ps-8 text-[13px]"
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {t("selected", { count: selected.length })}
        </span>
      </div>
      <ul className="max-h-[300px] overflow-y-auto rounded-[10px] border" role="list">
        {sorted.length === 0 ? (
          <li className="px-3 py-6 text-center text-[13px] text-muted-foreground">{emptyLabel}</li>
        ) : (
          sorted.map((o) => {
            const id = `${idPrefix}-${o.id}`;
            return (
              <li key={o.id} className="border-b last:border-b-0">
                <label htmlFor={id} className="flex min-h-[38px] cursor-pointer items-center gap-3 px-3 py-1.5 hover:bg-muted/40">
                  <Checkbox
                    id={id}
                    checked={selected.includes(o.id)}
                    disabled={disabled}
                    onCheckedChange={() => onChange(toggle(selected, o.id))}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px]">{o.label}</span>
                    {o.meta && <span className="block truncate text-xs text-muted-foreground">{o.meta}</span>}
                  </span>
                </label>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

interface BoardUserManagerProps {
  board: BoardRef;
  open: boolean;
  onClose: () => void;
}

/**
 * Board access (W22–W24): order users, board users and board groups. Saves
 * `order_user_ids`, `board_user_ids` and `board_group_ids` in one PATCH.
 * Users and groups are fetched page by page until the end (W26).
 */
export function BoardUserManager({ board, open, onClose }: BoardUserManagerProps) {
  const t = useTranslations("tickets.boardAdmin.users");
  const tCommon = useTranslations("common");
  const qc = useQueryClient();

  const boardQuery = useQuery({
    queryKey: boardAdminKeys.detail(board.id),
    queryFn: () => boardsRetrieve(String(board.id)) as Promise<BoardWithColor>,
    enabled: open,
  });
  const usersQuery = useQuery({
    queryKey: boardAdminKeys.allUsers(),
    queryFn: fetchAllUsers,
    enabled: open,
    staleTime: 2 * 60_000,
  });
  const groupsQuery = useQuery({
    queryKey: boardAdminKeys.groups(),
    queryFn: fetchAllGroups,
    enabled: open,
    staleTime: 2 * 60_000,
  });

  const [orderUserIds, setOrderUserIds] = useState<number[]>([]);
  const [boardUserIds, setBoardUserIds] = useState<number[]>([]);
  const [groupIds, setGroupIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const data = boardQuery.data;
  useEffect(() => {
    if (!data) return;
    setOrderUserIds((data.order_users ?? []).map((u) => u.id));
    setBoardUserIds((data.board_users ?? []).map((u) => u.id));
    setGroupIds((data.board_groups ?? []).map((g) => g.id));
  }, [data]);

  const userOptions = useMemo<Option[]>(() => {
    const byId = new Map<number, Option>();
    for (const u of usersQuery.data ?? []) {
      if (u.is_active === false) continue;
      const label = userLabel(u);
      byId.set(u.id, { id: u.id, label, meta: label === u.email ? undefined : u.email });
    }
    // Keep users already on the board even if they no longer come back in the list.
    for (const u of [...(data?.order_users ?? []), ...(data?.board_users ?? [])]) {
      if (!byId.has(u.id)) {
        const label = userLabel(u);
        byId.set(u.id, { id: u.id, label, meta: label === u.email ? undefined : u.email });
      }
    }
    return [...byId.values()];
  }, [usersQuery.data, data]);

  const groupOptions = useMemo<Option[]>(() => {
    const byId = new Map<number, Option>();
    for (const g of groupsQuery.data ?? []) byId.set(g.id, { id: g.id, label: g.name });
    for (const g of data?.board_groups ?? []) if (!byId.has(g.id)) byId.set(g.id, { id: g.id, label: g.name });
    return [...byId.values()];
  }, [groupsQuery.data, data]);

  const isOpenBoard = orderUserIds.length === 0 && boardUserIds.length === 0 && groupIds.length === 0;
  const loading = boardQuery.isLoading || usersQuery.isLoading || groupsQuery.isLoading;
  const failed = boardQuery.isError || usersQuery.isError || groupsQuery.isError;

  const handleSave = async () => {
    setSaving(true);
    try {
      await boardsPartialUpdate(String(board.id), {
        order_user_ids: orderUserIds,
        board_user_ids: boardUserIds,
        board_group_ids: groupIds,
      });
      await invalidateBoard(qc, board.id);
      toast.success(t("saved"));
      onClose();
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  const hint = (text: string) => (
    <p className="text-xs text-muted-foreground">{text}</p>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[600px]">
        <DialogHeader className="border-b px-5 py-4 text-start">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Shield className="size-4" aria-hidden />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="truncate text-[13px]">{data?.name ?? board.name}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12" aria-busy="true">
            <Spinner className="size-6" />
          </div>
        ) : failed ? (
          <p role="alert" className="px-5 py-10 text-center text-[13px] text-destructive">
            {t("loadError")}
          </p>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {isOpenBoard && (
              <p className="mb-3 rounded-[10px] border bg-muted/40 px-3 py-2 text-xs text-muted-foreground" data-testid="open-board-hint">
                {t("openBoardHint")}
              </p>
            )}
            <Tabs defaultValue="order-users" className="gap-3">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="order-users" className="gap-1.5">
                  <UserCog className="size-3.5" aria-hidden />
                  <span className="truncate">{t("orderUsers")}</span>
                </TabsTrigger>
                <TabsTrigger value="board-users" className="gap-1.5">
                  <Users className="size-3.5" aria-hidden />
                  <span className="truncate">{t("boardUsers")}</span>
                </TabsTrigger>
                <TabsTrigger value="board-groups" className="gap-1.5">
                  <Shield className="size-3.5" aria-hidden />
                  <span className="truncate">{t("boardGroups")}</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="order-users" className="space-y-3">
                {hint(t("orderUsersHint"))}
                <OptionList
                  idPrefix="order-user"
                  options={userOptions}
                  selected={orderUserIds}
                  onChange={setOrderUserIds}
                  searchLabel={t("search")}
                  emptyLabel={t("noResults")}
                  disabled={saving}
                />
              </TabsContent>
              <TabsContent value="board-users" className="space-y-3">
                {hint(t("boardUsersHint"))}
                <OptionList
                  idPrefix="board-user"
                  options={userOptions}
                  selected={boardUserIds}
                  onChange={setBoardUserIds}
                  searchLabel={t("search")}
                  emptyLabel={t("noResults")}
                  disabled={saving}
                />
              </TabsContent>
              <TabsContent value="board-groups" className="space-y-3">
                {hint(t("boardGroupsHint"))}
                <OptionList
                  idPrefix="board-group"
                  options={groupOptions}
                  selected={groupIds}
                  onChange={setGroupIds}
                  searchLabel={t("groupsSearch")}
                  emptyLabel={t("noGroups")}
                  disabled={saving}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter className="border-t px-5 py-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {tCommon("cancel")}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || loading || failed}>
            {saving && <Spinner className="size-4" />}
            {saving ? tCommon("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
