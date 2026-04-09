"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  columnsList,
  columnsCreate,
  columnsUpdate,
  columnsDestroy,
  boardsRetrieve,
} from "../api/generated/api";
import {
  TicketColumn,
  TicketColumnCreate,
  TicketColumnUpdate,
  Board,
} from "../api/generated/interfaces";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  CheckSquare,
  Star
} from "lucide-react";

interface BoardStatusEditorProps {
  boardId: number | null;
  open: boolean;
  onClose: () => void;
  onStatusChange?: () => void;
}

const BoardStatusEditor: React.FC<BoardStatusEditorProps> = ({
  boardId,
  open,
  onClose,
  onStatusChange,
}) => {
  const t = useTranslations("tickets");
  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<TicketColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<TicketColumn | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#6B7280",
    position: 0,
    is_default: false,
    is_closed_status: false,
    track_time: false,
  });

  const fetchBoard = async () => {
    if (!boardId) return;
    try {
      const boardData = await boardsRetrieve(boardId.toString());
      setBoard(boardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("boardStatusEditor.failedToLoadBoard"));
    }
  };

  const fetchColumns = async () => {
    if (!boardId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await columnsList(boardId);
      setColumns(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("boardStatusEditor.errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && boardId) {
      fetchBoard();
      fetchColumns();
    }
  }, [boardId, open]);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: "#6B7280",
      position: columns.length,
      is_default: false,
      is_closed_status: false,
      track_time: false,
    });
    setEditingColumn(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setFormDialogOpen(true);
  };

  const openEditDialog = (column: TicketColumn) => {
    setFormData({
      name: column.name,
      description: column.description || "",
      color: column.color || "#6B7280",
      position: column.position || 0,
      is_default: column.is_default || false,
      is_closed_status: column.is_closed_status || false,
      track_time: column.track_time || false,
    });
    setEditingColumn(column);
    setFormDialogOpen(true);
  };

  const closeFormDialog = () => {
    setFormDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardId) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingColumn) {
        // Update existing column
        const updateData: TicketColumnUpdate = {
          name: formData.name,
          description: formData.description,
          color: formData.color,
          position: formData.position,
          is_default: formData.is_default,
          is_closed_status: formData.is_closed_status,
          track_time: formData.track_time,
          board: boardId,
        };
        await columnsUpdate(editingColumn.id, updateData);
        setSuccess(t("boardStatusEditor.columnUpdated"));
      } else {
        // Create new column
        const createData: TicketColumnCreate = {
          name: formData.name,
          description: formData.description,
          color: formData.color,
          position: formData.position,
          is_default: formData.is_default,
          is_closed_status: formData.is_closed_status,
          track_time: formData.track_time,
          board: boardId,
        };
        await columnsCreate(createData);
        setSuccess(t("boardStatusEditor.columnCreated"));
      }

      // Refresh columns list
      await fetchColumns();
      closeFormDialog();
      onStatusChange?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("boardStatusEditor.errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (columnId: number) => {
    if (!window.confirm(t("boardStatusEditor.confirmDelete"))) {
      return;
    }

    try {
      await columnsDestroy(columnId);
      setSuccess(t("boardStatusEditor.columnDeleted"));
      await fetchColumns();
      onStatusChange?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("boardStatusEditor.failedToDeleteColumn"));
    }
  };

  return (
    <>
      {/* Main Status Editor Dialog */}
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[850px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  <DialogTitle>{t("boardStatusEditor.title")}</DialogTitle>
                </div>
                <DialogDescription className="mt-1">
                  {t("boardStatusEditor.description")} <strong>{board?.name}</strong>
                </DialogDescription>
              </div>
              <Button onClick={openCreateDialog} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                {t("boardStatusEditor.createStatus")}
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {/* Status Messages */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-10">
                <Spinner className="h-8 w-8 mx-auto mb-4" />
                <p className="text-muted-foreground">{t("boardStatusEditor.loadingColumns")}</p>
              </div>
            )}

            {/* Columns List */}
            {!loading && (
              <>
                {columns.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground mb-4">
                      {t("boardStatusEditor.noColumnsFound")}
                    </p>
                    <Button onClick={openCreateDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("boardStatusEditor.createFirstStatus")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {columns
                      .sort((a, b) => (a.position || 0) - (b.position || 0))
                      .map((column) => (
                        <Card key={column.id} className="bg-muted/30">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {/* Color indicator */}
                              <div
                                className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                                style={{ backgroundColor: column.color || "#6B7280" }}
                              />

                              {/* Column info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h4 className="font-semibold">{column.name}</h4>
                                  {column.is_default && (
                                    <Badge variant="default">
                                      <Star className="h-3 w-3 mr-1" />
                                      {t("boardStatusEditor.defaultBadge")}
                                    </Badge>
                                  )}
                                  {column.is_closed_status && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                                      <CheckSquare className="h-3 w-3 mr-1" />
                                      {t("boardStatusEditor.closedBadge")}
                                    </Badge>
                                  )}
                                  {column.track_time && (
                                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {t("boardStatusEditor.trackTimeBadge")}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">
                                  {column.description || t("boardStatusEditor.noDescription")}
                                </p>
                                <div className="text-xs text-muted-foreground">
                                  {t("boardStatusEditor.position")} {column.position} • {t("boardStatusEditor.color")} {column.color} • {column.tickets_count} {t("boardStatusEditor.tickets")}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditDialog(column)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDelete(column.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Form Dialog for Create/Edit */}
      <Dialog open={formDialogOpen} onOpenChange={closeFormDialog}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingColumn ? t("boardStatusEditor.editStatusColumn") : t("boardStatusEditor.createNewStatusColumn")}
            </DialogTitle>
            <DialogDescription>
              {t("boardStatusEditor.configureProperties")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("boardStatusEditor.nameLabel")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder={t("boardStatusEditor.namePlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("boardStatusEditor.descriptionLabel")}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder={t("boardStatusEditor.descriptionPlaceholder")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color">{t("boardStatusEditor.colorLabel")}</Label>
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">{t("boardStatusEditor.positionLabel")}</Label>
                  <Input
                    id="position"
                    type="number"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_default"
                    checked={formData.is_default}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked as boolean })}
                  />
                  <Label htmlFor="is_default" className="font-normal cursor-pointer">
                    {t("boardStatusEditor.defaultStatusCheckbox")}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_closed_status"
                    checked={formData.is_closed_status}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_closed_status: checked as boolean })}
                  />
                  <Label htmlFor="is_closed_status" className="font-normal cursor-pointer">
                    {t("boardStatusEditor.closedStatusCheckbox")}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="track_time"
                    checked={formData.track_time}
                    onCheckedChange={(checked) => setFormData({ ...formData, track_time: checked as boolean })}
                  />
                  <Label htmlFor="track_time" className="font-normal cursor-pointer">
                    {t("boardStatusEditor.trackTimeCheckbox")}
                  </Label>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={closeFormDialog}>
                {t("boardStatusEditor.cancel")}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Spinner className="mr-2 h-4 w-4" />}
                {loading ? t("boardStatusEditor.saving") : editingColumn ? t("boardStatusEditor.update") : t("boardStatusEditor.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BoardStatusEditor;
