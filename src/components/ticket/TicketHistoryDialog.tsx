"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { TicketHistory } from "@/types/ticket-history";
import { Clock, User } from "lucide-react";
import { format } from "date-fns";
import { useTicketHistory } from "@/hooks/api";

interface TicketHistoryDialogProps {
  ticketId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketHistoryDialog({
  ticketId,
  open,
  onOpenChange,
}: TicketHistoryDialogProps) {
  const t = useTranslations("tickets.history");

  // Use React Query hook for ticket history
  const { data: history = [], isLoading: loading } = useTicketHistory(
    ticketId.toString(),
    open // Only fetch when dialog is open
  );

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      created: "bg-green-100 text-green-800 border-green-200",
      updated: "bg-blue-100 text-blue-800 border-blue-200",
      status_changed: "bg-purple-100 text-purple-800 border-purple-200",
      assigned: "bg-cyan-100 text-cyan-800 border-cyan-200",
      unassigned: "bg-gray-100 text-gray-800 border-gray-200",
      priority_changed: "bg-orange-100 text-orange-800 border-orange-200",
      comment_added: "bg-indigo-100 text-indigo-800 border-indigo-200",
      tag_added: "bg-pink-100 text-pink-800 border-pink-200",
      tag_removed: "bg-rose-100 text-rose-800 border-rose-200",
      attachment_added: "bg-teal-100 text-teal-800 border-teal-200",
      attachment_removed: "bg-amber-100 text-amber-800 border-amber-200",
      transferred: "bg-violet-100 text-violet-800 border-violet-200",
    };
    return colors[action] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const formatActionLabel = (action: string) => {
    return action.split("_").map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mb-4 opacity-50" />
            <p>{t("noHistory")}</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {history.map((entry: TicketHistory) => (
                <div
                  key={entry.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={getActionColor(entry.action)}
                        >
                          {formatActionLabel(entry.action)}
                        </Badge>
                        {entry.field_name && (
                          <span className="text-xs text-muted-foreground">
                            • {entry.field_name}
                          </span>
                        )}
                      </div>

                      {entry.description && (
                        <p className="text-sm">{entry.description}</p>
                      )}

                      {(entry.old_value || entry.new_value) && (
                        <div className="text-sm space-y-1">
                          {entry.old_value && (
                            <div>
                              <span className="text-muted-foreground">
                                {t("from")}:{" "}
                              </span>
                              <span className="line-through text-muted-foreground">
                                {entry.old_value}
                              </span>
                            </div>
                          )}
                          {entry.new_value && (
                            <div>
                              <span className="text-muted-foreground">
                                {t("to")}:{" "}
                              </span>
                              <span className="font-medium">
                                {entry.new_value}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-right space-y-1">
                      {entry.user && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>
                            {entry.user.first_name} {entry.user.last_name}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {format(new Date(entry.created_at), "PPp")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
