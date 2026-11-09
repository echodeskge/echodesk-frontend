"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckSquare, Clock, Pencil, Plus, Settings, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { columnsCreate, columnsDestroy, columnsUpdate } from "@/api/generated/api";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ColorField } from "./color-field";
import { DEFAULT_COLUMN_COLOR, normalizeHex } from "./colors";
import { boardAdminKeys, fetchColumns, httpStatus, invalidateBoardColumns, type BoardRef } from "./admin-api";

interface ColumnForm {
  name: string;
  description: string;
  color: string;
  position: number;
  is_default: boolean;
  is_closed_status: boolean;
  track_time: boolean;
}

function formFor(column: TicketColumn | null, nextPosition: number): ColumnForm {
  return {
    name: column?.name ?? "",
    description: column?.description ?? "",
    color: normalizeHex(column?.color, DEFAULT_COLUMN_COLOR),
    position: column?.position ?? nextPosition,
    is_default: column?.is_default ?? false,
    is_closed_status: column?.is_closed_status ?? false,
    // Explicit, never defaulted from a missing field (the old Kanban edit lost track_time).
    track_time: column?.track_time ?? false,
  };
}

interface BoardStatusEditorProps {
  board: BoardRef;
  open: boolean;
  onClose: () => void;
}

/**
 * "Edit columns" (W20): list with badges and ticket counts, create and edit
 * every column field, delete through an AlertDialog. Deleting a column that
 * still holds tickets is refused by the server (400); the dialog says why.
 */
export function BoardStatusEditor({ board, open, onClose }: BoardStatusEditorProps) {
  const t = useTranslations("tickets.boardAdmin.columns");
  const tEditor = useTranslations("tickets.boardStatusEditor");
  const tToasts = useTranslations("tickets.toasts");
  const tCommon = useTranslations("common");
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: boardAdminKeys.columns(board.id),
    queryFn: () => fetchColumns(board.id),
    enabled: open,
  });
  const columns = query.data ?? [];

  /** null = list; "new" = create form; a column = edit form. */
  const [editing, setEditing] = useState<TicketColumn | "new" | null>(null);
  const [form, setForm] = useState<ColumnForm>(() => formFor(null, 0));
  const [colorValid, setColorValid] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<TicketColumn | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const startCreate = () => {
    setForm(formFor(null, columns.length));
    setEditing("new");
  };
  const startEdit = (column: TicketColumn) => {
    setForm(formFor(column, columns.length));
    setEditing(column);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !colorValid || editing === null) return;
    setSaving(true);
    const fields = { ...form, name: form.name.trim() };
    try {
      if (editing === "new") {
        await columnsCreate({ ...fields, board: board.id });
        toast.success(tToasts("columnCreated"));
      } else {
        // `board` is read-only on update (a column can't move boards).
        await columnsUpdate(editing.id, fields);
        toast.success(tToasts("columnUpdated"));
      }
      await invalidateBoardColumns(qc, board.id);
      setEditing(null);
    } catch {
      toast.error(tToasts("columnError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await columnsDestroy(deleting.id);
      toast.success(tToasts("columnDeleted"));
      await invalidateBoardColumns(qc, board.id);
      setDeleting(null);
    } catch (error) {
      const message = httpStatus(error) === 400 ? t("hasTickets") : tToasts("columnError");
      setDeleteError(message);
      toast.error(message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const field = <K extends keyof ColumnForm>(key: K, value: ColumnForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && !saving && onClose()}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
          <DialogHeader className="border-b px-5 py-4 text-start">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Settings className="size-4" aria-hidden />
              {editing === null
                ? t("title")
                : editing === "new"
                  ? tEditor("createNewStatusColumn")
                  : tEditor("editStatusColumn")}
            </DialogTitle>
            <DialogDescription className="truncate text-[13px]">{board.name}</DialogDescription>
          </DialogHeader>

          {editing === null ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {query.isLoading ? (
                <div className="flex justify-center py-10" aria-busy="true">
                  <Spinner className="size-6" />
                </div>
              ) : query.isError ? (
                <p role="alert" className="py-8 text-center text-[13px] text-destructive">
                  {tEditor("errorOccurred")}
                </p>
              ) : columns.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="mb-4 text-[13px] text-muted-foreground">{t("empty")}</p>
                  <Button size="sm" onClick={startCreate}>
                    <Plus className="size-3.5" />
                    {t("add")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <ul className="overflow-hidden rounded-[10px] border" role="list" aria-label={t("title")}>
                    {columns.map((column) => (
                      <li key={column.id} className="flex items-start gap-3 border-b px-3 py-2.5 last:border-b-0" data-testid={`column-row-${column.id}`}>
                        <span
                          aria-hidden
                          className="mt-1 size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: column.color || DEFAULT_COLUMN_COLOR }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-[13px] font-semibold">{column.name}</span>
                            {column.is_default && (
                              <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[11px]">
                                <Star className="size-3" aria-hidden />
                                {tEditor("defaultBadge")}
                              </Badge>
                            )}
                            {column.is_closed_status && (
                              <Badge variant="secondary" className="h-5 gap-1 bg-green/15 px-1.5 text-[11px] text-green">
                                <CheckSquare className="size-3" aria-hidden />
                                {tEditor("closedBadge")}
                              </Badge>
                            )}
                            {column.track_time && (
                              <Badge variant="secondary" className="h-5 gap-1 bg-amber-500/15 px-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                                <Clock className="size-3" aria-hidden />
                                {tEditor("trackTimeBadge")}
                              </Badge>
                            )}
                          </div>
                          {column.description && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">{column.description}</p>
                          )}
                          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                            {t("ticketsCount", { count: column.tickets_count ?? 0 })}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={t("edit", { name: column.name })}
                            onClick={() => startEdit(column)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={t("delete", { name: column.name })}
                            onClick={() => {
                              setDeleteError(null);
                              setDeleting(column);
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Button size="sm" variant="outline" onClick={startCreate}>
                    <Plus className="size-3.5" />
                    {t("add")}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="column-name" className="text-[13px]">
                    {tEditor("nameLabel")}
                  </Label>
                  <Input
                    id="column-name"
                    value={form.name}
                    autoFocus
                    maxLength={100}
                    placeholder={tEditor("namePlaceholder")}
                    disabled={saving}
                    className="h-[34px] text-[13px]"
                    onChange={(e) => field("name", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="column-description" className="text-[13px]">
                    {tEditor("descriptionLabel")}
                  </Label>
                  <Textarea
                    id="column-description"
                    value={form.description}
                    rows={2}
                    placeholder={tEditor("descriptionPlaceholder")}
                    disabled={saving}
                    className="text-[13px]"
                    onChange={(e) => field("description", e.target.value)}
                  />
                </div>
                <ColorField
                  label={tEditor("colorLabel")}
                  value={form.color}
                  onChange={(c) => field("color", c)}
                  onValidityChange={setColorValid}
                  disabled={saving}
                />
                <div className="grid gap-2">
                  <Label htmlFor="column-position" className="text-[13px]">
                    {tEditor("positionLabel")}
                  </Label>
                  <Input
                    id="column-position"
                    type="number"
                    min={0}
                    value={form.position}
                    disabled={saving}
                    className="h-[34px] w-28 text-[13px]"
                    onChange={(e) => field("position", Math.max(0, parseInt(e.target.value, 10) || 0))}
                  />
                </div>
                <div className="space-y-2.5">
                  {(
                    [
                      ["is_default", "defaultStatusCheckbox"],
                      ["is_closed_status", "closedStatusCheckbox"],
                      ["track_time", "trackTimeCheckbox"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="flex items-start gap-2">
                      <Checkbox
                        id={`column-${key}`}
                        checked={form[key]}
                        disabled={saving}
                        className="mt-0.5"
                        onCheckedChange={(checked) => field(key, checked === true)}
                      />
                      <Label htmlFor={`column-${key}`} className="cursor-pointer text-[13px] font-normal leading-snug">
                        {tEditor(label)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between gap-2 border-t px-5 py-3">
                <Button type="button" variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
                  <ArrowLeft className="size-4" />
                  {tCommon("back")}
                </Button>
                <Button type="submit" disabled={saving || !form.name.trim() || !colorValid}>
                  {saving && <Spinner className="size-4" />}
                  {saving ? tEditor("saving") : editing === "new" ? tEditor("create") : tEditor("update")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && !deleteBusy && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirm", { name: deleting?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (deleting.tickets_count ?? 0) > 0 ? t("hasTickets") : t("deleteBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-[13px] text-destructive">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteBusy}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {deleteBusy && <Spinner className="size-3.5" />}
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
