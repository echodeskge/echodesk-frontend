"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { Ticket } from "@/api/generated/interfaces";
import {
  ticketsPartialUpdate,
  ticketsDestroy,
  columnsList,
  boardsList,
} from "@/api/generated/api";
import { ticketService } from "@/services/ticketService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  MoreVertical,
  Link2,
  ArrowRightLeft,
  Trash2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import type { Board } from "@/api/generated/interfaces";

interface TicketDetailHeaderProps {
  ticket: Ticket;
  onUpdate: (ticket: Ticket) => void;
}

function getPriorityVariant(
  priority: string
): "destructive" | "default" | "secondary" | "outline" {
  switch (priority?.toLowerCase()) {
    case "high":
    case "urgent":
    case "critical":
      return "destructive";
    case "medium":
    case "normal":
      return "default";
    case "low":
      return "secondary";
    default:
      return "outline";
  }
}

export function TicketDetailHeader({
  ticket,
  onUpdate,
}: TicketDetailHeaderProps) {
  const t = useTranslations("tickets");
  const router = useRouter();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(ticket.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Transfer dialog state
  const [transferOpen, setTransferOpen] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [transferring, setTransferring] = useState(false);

  // Delete confirm state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setTitleDraft(ticket.title);
  }, [ticket.title]);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  const saveTitle = async () => {
    setEditingTitle(false);
    if (titleDraft.trim() === ticket.title) return;
    if (!titleDraft.trim()) {
      setTitleDraft(ticket.title);
      return;
    }

    try {
      const updated = await ticketsPartialUpdate(ticket.id.toString(), {
        title: titleDraft.trim(),
      });
      onUpdate(updated);
      toast.success(t("ticketUpdatedSuccess"));
    } catch (err) {
      console.error("Error updating title:", err);
      setTitleDraft(ticket.title);
      toast.error(t("ticketUpdatedError"));
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success(t("ticketDetail.linkCopied"));
  };

  const handleTransfer = async () => {
    if (!selectedBoardId) return;
    setTransferring(true);
    try {
      const allColumnsResult = await columnsList();
      const targetCols = (allColumnsResult.results || [])
        .filter((col) => col.board === selectedBoardId)
        .sort((a, b) => (a.position || 0) - (b.position || 0));

      if (targetCols.length === 0) {
        toast.error("Target board has no columns");
        return;
      }

      const updated = await ticketService.updateTicket(ticket.id, {
        column_id: targetCols[0].id,
      });
      onUpdate(updated);
      setTransferOpen(false);
      toast.success(t("ticketMovedSuccess"));
    } catch (err) {
      console.error("Error transferring ticket:", err);
      toast.error(t("ticketMovedError"));
    } finally {
      setTransferring(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await ticketsDestroy(ticket.id.toString());
      toast.success("Ticket deleted");
      router.back();
    } catch (err) {
      console.error("Error deleting ticket:", err);
      toast.error("Failed to delete ticket");
    } finally {
      setDeleting(false);
    }
  };

  const openTransferDialog = async () => {
    try {
      const result = await boardsList();
      const otherBoards = (result.results || []).filter(
        (b) => b.id !== ticket.column?.board
      );
      setBoards(otherBoards);
    } catch {
      setBoards([]);
    }
    setTransferOpen(true);
  };

  const priorityDisplay = String(ticket.priority || "medium");

  return (
    <>
      <div className="space-y-3">
        {/* Breadcrumb row */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t("ticketDetail.backToBoard")}
          </Button>
          <span>/</span>
          <span>{ticket.column?.name || "Unknown"}</span>
          <span>/</span>
          <span className="text-foreground font-medium">
            #TK-{ticket.id}
          </span>
        </div>

        {/* Title + badges + actions */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <Input
                ref={titleInputRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") {
                    setTitleDraft(ticket.title);
                    setEditingTitle(false);
                  }
                }}
                className="text-2xl font-bold h-auto py-1 border-none shadow-none focus-visible:ring-1 px-0"
              />
            ) : (
              <h1
                className="text-2xl font-bold cursor-pointer hover:text-primary/80 transition-colors truncate"
                onClick={() => setEditingTitle(true)}
                title={t("ticketDetail.clickToEdit")}
              >
                {ticket.title}
              </h1>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge
                variant="outline"
                style={{
                  backgroundColor: ticket.column?.color
                    ? `${ticket.column.color}20`
                    : undefined,
                  color: ticket.column?.color || undefined,
                  borderColor: ticket.column?.color || undefined,
                }}
              >
                {ticket.column?.name || "Unknown"}
                {ticket.column?.track_time && (
                  <Clock className="ml-1 h-3 w-3" />
                )}
              </Badge>
              <Badge variant={getPriorityVariant(priorityDisplay)}>
                {t(`priority.${priorityDisplay.toLowerCase()}`)}
              </Badge>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyLink}>
                <Link2 className="h-4 w-4 mr-2" />
                {t("ticketDetail.copyLink")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openTransferDialog}>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                {t("ticketDetail.transferBoard")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("ticketDetail.deleteTicket")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("ticketDetail.transferBoard")}</DialogTitle>
            <DialogDescription>
              {t("selectTargetBoard")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={selectedBoardId?.toString() || ""}
              onValueChange={(v) => setSelectedBoardId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectBoard")} />
              </SelectTrigger>
              <SelectContent>
                {boards.map((board) => (
                  <SelectItem key={board.id} value={board.id.toString()}>
                    {board.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTransferOpen(false);
                setSelectedBoardId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={!selectedBoardId || transferring}
            >
              {transferring ? t("transferring") : t("transfer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("ticketDetail.deleteTicket")}</DialogTitle>
            <DialogDescription>
              {t("ticketDetail.confirmDelete")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : t("ticketDetail.deleteTicket")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
