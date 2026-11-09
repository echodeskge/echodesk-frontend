"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { boardsCreate } from "@/api/generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ColorField } from "./color-field";
import { DEFAULT_BOARD_COLOR } from "./colors";
import { invalidateBoards, type BoardCreateBody, type BoardWithColor } from "./admin-api";

interface BoardCreateSheetProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (board: BoardWithColor) => void;
}

/** "New board": name, description, colour and is-default (W17, FE-04). */
export function BoardCreateSheet({ open, onClose, onCreated }: BoardCreateSheetProps) {
  const t = useTranslations("tickets.boardAdmin");
  const tCommon = useTranslations("common");
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(DEFAULT_BOARD_COLOR);
  const [colorValid, setColorValid] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("create.nameRequired"));
      return;
    }
    if (!colorValid) return;
    setSaving(true);
    setError(null);
    try {
      const body: BoardCreateBody = {
        name: name.trim(),
        description: description.trim() || undefined,
        is_default: isDefault,
        color,
      };
      const board = (await boardsCreate(body)) as BoardWithColor;
      await invalidateBoards(qc);
      toast.success(t("create.success"));
      onCreated?.(board);
      onClose();
    } catch {
      setError(t("create.error"));
      toast.error(t("create.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !saving && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-base">{t("create.title")}</SheetTitle>
          <SheetDescription className="text-[13px]">{t("create.subtitle")}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {error && (
              <div role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-[13px] text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="board-create-name" className="text-[13px]">
                {t("create.name")}
              </Label>
              <Input
                id="board-create-name"
                value={name}
                autoFocus
                maxLength={100}
                placeholder={t("create.namePlaceholder")}
                disabled={saving}
                className="h-[34px] text-[13px]"
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="board-create-description" className="text-[13px]">
                {t("create.description")}
              </Label>
              <Textarea
                id="board-create-description"
                value={description}
                rows={3}
                placeholder={t("create.descriptionPlaceholder")}
                disabled={saving}
                className="text-[13px]"
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <ColorField
              label={t("create.color")}
              value={color}
              onChange={setColor}
              onValidityChange={setColorValid}
              disabled={saving}
            />

            <div className="flex items-center justify-between gap-4 rounded-[10px] border px-4 py-3">
              <div className="space-y-0.5">
                <Label htmlFor="board-create-default" className="cursor-pointer text-[13px]">
                  {t("create.isDefault")}
                </Label>
                <p className="text-xs text-muted-foreground">{t("create.isDefaultHint")}</p>
              </div>
              <Switch id="board-create-default" checked={isDefault} onCheckedChange={setIsDefault} disabled={saving} />
            </div>
          </div>

          <div className="flex gap-2 border-t px-5 py-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" className="flex-1" disabled={saving || !name.trim() || !colorValid}>
              {saving ? <Spinner className="size-4" /> : <Plus className="size-4" />}
              {saving ? t("create.submitting") : t("create.submit")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
