"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, Star, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { boardsDestroy, boardsPartialUpdate, boardsRetrieve, boardsSetDefaultCreate } from "@/api/generated/api";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ColorField } from "./color-field";
import { DEFAULT_BOARD_COLOR, normalizeHex } from "./colors";
import {
  boardAdminKeys,
  invalidateBoard,
  type BoardPatchBody,
  type BoardRef,
  type BoardWithColor,
} from "./admin-api";
import { TelegramTab } from "./telegram-tab";

export interface BoardSettingsGates {
  canEditBoard: boolean;
  canDeleteBoard: boolean;
  canSetDefaultBoard: boolean;
  canManageColumns: boolean;
}

interface BoardSettingsDialogProps {
  board: BoardRef;
  open: boolean;
  onClose: () => void;
  gates: BoardSettingsGates;
  onDeleted?: (boardId: number) => void;
  onOpenUsers?: () => void;
  onOpenColumns?: () => void;
}

/**
 * Board settings (W18, W19, W25): Details (name, description, colour, make
 * default, access shortcuts, delete) and Telegram.
 */
export function BoardSettingsDialog({
  board,
  open,
  onClose,
  gates,
  onDeleted,
  onOpenUsers,
  onOpenColumns,
}: BoardSettingsDialogProps) {
  const t = useTranslations("tickets.boardAdmin");
  const tCommon = useTranslations("common");
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: boardAdminKeys.detail(board.id),
    queryFn: () => boardsRetrieve(String(board.id)) as Promise<BoardWithColor>,
    enabled: open,
  });
  const data = query.data;

  const [name, setName] = useState(board.name ?? "");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(normalizeHex(board.color, DEFAULT_BOARD_COLOR));
  const [colorValid, setColorValid] = useState(true);
  const [busy, setBusy] = useState<null | "save" | "default" | "delete">(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!data) return;
    setName(data.name);
    setDescription(data.description ?? "");
    setColor(normalizeHex(data.color, DEFAULT_BOARD_COLOR));
  }, [data]);

  const displayName = data?.name ?? board.name ?? "";
  const isDefault = data?.is_default ?? board.is_default ?? false;
  const dirty =
    !!data &&
    (name.trim() !== data.name ||
      description !== (data.description ?? "") ||
      color !== normalizeHex(data.color, DEFAULT_BOARD_COLOR));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gates.canEditBoard || !name.trim() || !colorValid) return;
    setBusy("save");
    try {
      const body: BoardPatchBody = { name: name.trim(), description, color };
      const saved = (await boardsPartialUpdate(String(board.id), body)) as BoardWithColor;
      qc.setQueryData(boardAdminKeys.detail(board.id), saved);
      await invalidateBoard(qc, board.id);
      toast.success(t("settings.saved"));
    } catch {
      toast.error(t("settings.saveError"));
    } finally {
      setBusy(null);
    }
  };

  const handleMakeDefault = async () => {
    setBusy("default");
    try {
      await boardsSetDefaultCreate(String(board.id));
      await invalidateBoard(qc, board.id);
      toast.success(t("settings.defaultSet", { name: displayName }));
    } catch {
      toast.error(t("settings.defaultError"));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    setBusy("delete");
    try {
      await boardsDestroy(String(board.id));
      qc.removeQueries({ queryKey: boardAdminKeys.detail(board.id) });
      qc.removeQueries({ queryKey: ["kanbanBoard", board.id] });
      await qc.invalidateQueries({ queryKey: ["boards"] });
      toast.success(t("settings.deleted"));
      setConfirmDelete(false);
      onDeleted?.(board.id);
      onClose();
    } catch {
      toast.error(t("settings.deleteError"));
    } finally {
      setBusy(null);
    }
  };

  const showAccess = (gates.canEditBoard && onOpenUsers) || (gates.canManageColumns && onOpenColumns);

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && busy === null && onClose()}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]">
          <DialogHeader className="border-b px-5 py-4 text-start">
            <DialogTitle className="flex items-center gap-2 text-base">
              <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: color }} />
              {t("settings.title")}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-[13px]">
              <span className="truncate">{displayName}</span>
              {isDefault && (
                <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[11px]">
                  <Star className="size-3" aria-hidden />
                  {t("settings.isDefaultBadge")}
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>

          {query.isLoading ? (
            <div className="flex justify-center py-12" aria-busy="true">
              <Spinner className="size-6" />
            </div>
          ) : query.isError || !data ? (
            <p role="alert" className="px-5 py-10 text-center text-[13px] text-destructive">
              {t("settings.loadError")}
            </p>
          ) : (
            <Tabs defaultValue="details" className="flex min-h-0 flex-1 flex-col gap-0">
              {gates.canEditBoard && (
                <TabsList className="mx-5 mt-4 w-fit">
                  <TabsTrigger value="details">{t("settings.details")}</TabsTrigger>
                  <TabsTrigger value="telegram">{t("telegram.tab")}</TabsTrigger>
                </TabsList>
              )}

              <TabsContent value="details" className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <div className="space-y-4">
                  <form onSubmit={handleSave} className="space-y-4" noValidate>
                    <div className="grid gap-2">
                      <Label htmlFor="board-settings-name" className="text-[13px]">
                        {t("create.name")}
                      </Label>
                      <Input
                        id="board-settings-name"
                        value={name}
                        maxLength={100}
                        disabled={!gates.canEditBoard || busy !== null}
                        aria-invalid={!name.trim()}
                        className="h-[34px] text-[13px]"
                        onChange={(e) => setName(e.target.value)}
                      />
                      {!name.trim() && <p className="text-xs text-destructive">{t("create.nameRequired")}</p>}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="board-settings-description" className="text-[13px]">
                        {t("create.description")}
                      </Label>
                      <Textarea
                        id="board-settings-description"
                        value={description}
                        rows={3}
                        disabled={!gates.canEditBoard || busy !== null}
                        placeholder={t("create.descriptionPlaceholder")}
                        className="text-[13px]"
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                    <ColorField
                      label={t("create.color")}
                      value={color}
                      onChange={setColor}
                      onValidityChange={setColorValid}
                      disabled={!gates.canEditBoard || busy !== null}
                    />
                    {gates.canEditBoard && (
                      <div className="flex justify-end">
                        <Button type="submit" size="sm" disabled={!dirty || !name.trim() || !colorValid || busy !== null}>
                          {busy === "save" && <Spinner className="size-3.5" />}
                          {busy === "save" ? tCommon("saving") : t("settings.save")}
                        </Button>
                      </div>
                    )}
                  </form>

                  {gates.canSetDefaultBoard && (
                    <section className="flex flex-col gap-3 rounded-[10px] border px-4 py-3 sm:flex-row sm:items-center">
                      <div className="flex-1 space-y-0.5">
                        <p className="text-[13px] font-medium">{t("settings.makeDefault")}</p>
                        <p className="text-xs text-muted-foreground">{t("settings.defaultHint")}</p>
                      </div>
                      {isDefault ? (
                        <Badge variant="secondary" className="w-fit gap-1">
                          <Star className="size-3" aria-hidden />
                          {t("settings.isDefaultBadge")}
                        </Badge>
                      ) : (
                        <Button type="button" variant="outline" size="sm" onClick={handleMakeDefault} disabled={busy !== null}>
                          {busy === "default" ? <Spinner className="size-3.5" /> : <Star className="size-3.5" />}
                          {t("settings.makeDefault")}
                        </Button>
                      )}
                    </section>
                  )}

                  {showAccess && (
                    <section className="flex flex-col gap-3 rounded-[10px] border px-4 py-3">
                      <p className="text-[13px] font-medium">{t("settings.access")}</p>
                      <div className="flex flex-wrap gap-2">
                        {gates.canEditBoard && onOpenUsers && (
                          <Button type="button" variant="outline" size="sm" onClick={onOpenUsers}>
                            <Users className="size-3.5" />
                            {t("menu.manageUsers")}
                          </Button>
                        )}
                        {gates.canManageColumns && onOpenColumns && (
                          <Button type="button" variant="outline" size="sm" onClick={onOpenColumns}>
                            <Settings className="size-3.5" />
                            {t("menu.editColumns")}
                          </Button>
                        )}
                      </div>
                    </section>
                  )}

                  {gates.canDeleteBoard && (
                    <section className="flex flex-col gap-3 rounded-[10px] border border-destructive/40 px-4 py-3 sm:flex-row sm:items-center">
                      <div className="flex-1 space-y-0.5">
                        <p className="text-[13px] font-medium text-destructive">{t("settings.delete")}</p>
                        <p className="text-xs text-muted-foreground">{t("settings.deleteHint")}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setConfirmDelete(true)}
                        disabled={busy !== null}
                      >
                        <Trash2 className="size-3.5" />
                        {t("settings.delete")}
                      </Button>
                    </section>
                  )}
                </div>
              </TabsContent>

              {gates.canEditBoard && (
                <TabsContent value="telegram" className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                  <TelegramTab boardId={board.id} canEdit={gates.canEditBoard} />
                </TabsContent>
              )}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={(next) => !next && busy !== "delete" && setConfirmDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.deleteConfirmTitle", { name: displayName })}</AlertDialogTitle>
            <AlertDialogDescription>{t("settings.deleteConfirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === "delete"}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={busy === "delete"}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {busy === "delete" && <Spinner className="size-3.5" />}
              {t("settings.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
