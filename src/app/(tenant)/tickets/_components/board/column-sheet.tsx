"use client";

/**
 * Add / edit a single column from the board (plan WS3, W32).
 *
 * Both modes send every column flag explicitly (name, description, colour,
 * position, is_default, is_closed_status, track_time): the old Kanban sheets
 * dropped the flags, so renaming a column turned `track_time` off.
 * "Edit all columns…" lives in FE-04's `BoardStatusEditor`.
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { columnsCreate, columnsUpdate } from "@/api/generated/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ColorField } from "@/components/tickets-admin/color-field";
import { DEFAULT_COLUMN_COLOR, normalizeHex } from "@/components/tickets-admin/colors";
import { invalidateBoardColumns } from "@/components/tickets-admin/admin-api";
import type { KanbanColumn } from "../../_lib/types";

export interface ColumnFormValues {
  name: string;
  description: string;
  color: string;
  position: number;
  is_default: boolean;
  is_closed_status: boolean;
  track_time: boolean;
}

export function columnFormValues(column: KanbanColumn | null, nextPosition: number): ColumnFormValues {
  return {
    name: column?.name ?? "",
    description: column?.description ?? "",
    color: normalizeHex(column?.color, DEFAULT_COLUMN_COLOR),
    position: column?.position ?? nextPosition,
    is_default: column?.is_default ?? false,
    is_closed_status: column?.is_closed_status ?? false,
    track_time: column?.track_time ?? false,
  };
}

export interface ColumnSheetProps {
  open: boolean;
  onClose: () => void;
  boardId: number;
  boardName?: string;
  /** null = add a column. */
  column: KanbanColumn | null;
  /** Position for a new column (after the last one). */
  nextPosition: number;
}

const FLAGS = [
  ["is_default", "defaultStatusCheckbox"],
  ["is_closed_status", "closedStatusCheckbox"],
  ["track_time", "trackTimeCheckbox"],
] as const;

export function ColumnSheet({ open, onClose, boardId, boardName, column, nextPosition }: ColumnSheetProps) {
  const t = useTranslations("ticketsScreen.board");
  const tEditor = useTranslations("tickets.boardStatusEditor");
  const tToasts = useTranslations("tickets.toasts");
  const tCommon = useTranslations("common");
  const qc = useQueryClient();
  const [form, setForm] = useState<ColumnFormValues>(() => columnFormValues(column, nextPosition));
  const [colorValid, setColorValid] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(columnFormValues(column, nextPosition));
  }, [open, column, nextPosition]);

  const field = <K extends keyof ColumnFormValues>(key: K, value: ColumnFormValues[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name || !colorValid) return;
    setSaving(true);
    const fields = { ...form, name };
    try {
      if (column) {
        await columnsUpdate(column.id, fields);
        toast.success(tToasts("columnUpdated"));
      } else {
        await columnsCreate({ ...fields, board: boardId });
        toast.success(tToasts("columnCreated"));
      }
      await invalidateBoardColumns(qc, boardId);
      onClose();
    } catch {
      toast.error(tToasts("columnError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !saving && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md" data-testid="column-sheet">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-base">{column ? t("editColumn") : t("addColumn")}</SheetTitle>
          {boardName && <SheetDescription className="truncate text-[13px]">{boardName}</SheetDescription>}
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div className="grid gap-2">
              <Label htmlFor="kanban-column-name" className="text-[13px]">
                {tEditor("nameLabel")}
              </Label>
              <Input
                id="kanban-column-name"
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
              <Label htmlFor="kanban-column-description" className="text-[13px]">
                {tEditor("descriptionLabel")}
              </Label>
              <Textarea
                id="kanban-column-description"
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
            <div className="space-y-2.5">
              {FLAGS.map(([key, label]) => (
                <div key={key} className="flex items-start gap-2">
                  <Checkbox
                    id={`kanban-column-${key}`}
                    checked={form[key]}
                    disabled={saving}
                    className="mt-0.5"
                    onCheckedChange={(checked) => field(key, checked === true)}
                  />
                  <Label htmlFor={`kanban-column-${key}`} className="cursor-pointer text-[13px] font-normal leading-snug">
                    {tEditor(label)}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 border-t px-5 py-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" className="flex-1" disabled={saving || !form.name.trim() || !colorValid}>
              {saving && <Spinner className="size-4" />}
              {saving ? tEditor("saving") : column ? tEditor("update") : tEditor("create")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
