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

          {/* Selected items */}
          {submission.selected_items && submission.selected_items.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="font-medium text-sm mb-3">Selected Items</div>
              <div className="flex flex-wrap gap-2">
                {submission.selected_items.map((item) => (
                  <Badge key={item.id} variant="secondary" className="text-sm">
                    {item.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
