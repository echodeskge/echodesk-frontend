"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { TicketFormSubmission } from "@/api/generated/interfaces";

interface FormSubmissionViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: TicketFormSubmission;
}

export function FormSubmissionViewDialog({
  open,
  onOpenChange,
  submission,
}: FormSubmissionViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {submission.form?.title}
            <Badge variant="outline" className="ml-2">
              Submitted
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Submitted by and date */}
          <div className="flex gap-4 text-sm text-muted-foreground border-b pb-3">
            <div>
              <span className="font-medium">Submitted by:</span>{" "}
              {submission.submitted_by?.first_name} {submission.submitted_by?.last_name}
            </div>
            <div>
              <span className="font-medium">Date:</span>{" "}
              {new Date(submission.submitted_at).toLocaleString()}
            </div>
          </div>

          {/* Form data */}
          {submission.form_data && Object.keys(submission.form_data).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(submission.form_data).map(([key, value]) => {
                const isSignature = typeof value === 'string' && value.startsWith('data:image');

                return (
                  <div key={key} className="border rounded-lg p-4">
                    <div className="font-medium text-sm mb-2 capitalize">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm">
                      {isSignature ? (
                        <div className="border rounded p-2 bg-muted/30">
                          <img
                            src={value}
                            alt={`${key} signature`}
                            className="max-w-full h-auto max-h-48"
                          />
                        </div>
                      ) : (
                        <div className="text-muted-foreground whitespace-pre-wrap">
                          {String(value)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              No form data submitted
            </div>
          )}

          {/* Selected items grouped by list */}
          {submission.selected_items && submission.selected_items.length > 0 && (
            <div className="space-y-3">
              {/* Group items by item_list */}
              {(() => {
                // Group items by their list ID
                const itemsByList = submission.selected_items.reduce((acc, item) => {
                  const listId = item.item_list;
                  if (!acc[listId]) {
                    acc[listId] = [];
                  }
                  acc[listId].push(item);
                  return acc;
                }, {} as Record<number, typeof submission.selected_items>);

                // Render each list's items
                return Object.entries(itemsByList).map(([listId, items]) => {
                  // Find the list name from form's item_lists
                  const list = submission.form?.item_lists?.find(l => l.id === Number(listId));
                  const listName = list?.title || 'Selected Items';

                  return (
                    <div key={listId} className="border rounded-lg p-4">
                      <div className="font-medium text-sm mb-3">{listName}</div>
                      <div className="flex flex-wrap gap-2">
                        {items.map((item) => (
                          <Badge key={item.id} variant="secondary" className="text-sm">
                            {item.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
