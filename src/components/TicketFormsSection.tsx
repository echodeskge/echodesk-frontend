"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle2 } from "lucide-react";
import type { Ticket, TicketFormSubmission } from "@/api/generated/interfaces";
import { ChildFormFillDialog } from "./ChildFormFillDialog";

interface TicketFormsSectionProps {
  ticket: Ticket & { form_submission?: TicketFormSubmission | null };
  onFormSubmitted?: () => void;
}

export function TicketFormsSection({ ticket, onFormSubmitted }: TicketFormsSectionProps) {
  const [selectedChildFormId, setSelectedChildFormId] = useState<number | null>(null);
  const [childFormDialogOpen, setChildFormDialogOpen] = useState(false);

  // Check if ticket has a form submission (parent form)
  const hasParentForm = ticket.form_submission;

  // Check if parent form has child forms
  const hasChildForms = hasParentForm && ticket.form_submission?.form?.child_forms && ticket.form_submission.form.child_forms.length > 0;

  if (!hasParentForm) {
    return null; // Don't show section if no forms
  }

  const handleFillChildForm = (childFormId: number) => {
    setSelectedChildFormId(childFormId);
    setChildFormDialogOpen(true);
  };

  const handleFormSubmitted = () => {
    if (onFormSubmitted) {
      onFormSubmitted();
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Forms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Parent Form (Read-only) */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">Parent Form</h4>
              <Badge variant="outline">Completed</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {ticket.form_submission?.form?.title}
            </p>
            {ticket.form_submission?.form_data && Object.keys(ticket.form_submission.form_data).length > 0 && (
              <div className="mt-3 space-y-2">
                {Object.entries(ticket.form_submission.form_data).map(([key, value]) => {
                  // Check if value is a base64 image (signature)
                  const isSignature = typeof value === 'string' && value.startsWith('data:image');

                  return (
                    <div key={key} className="text-sm">
                      <span className="font-medium">{key}:</span>{" "}
                      {isSignature ? (
                        <div className="mt-2">
                          <img
                            src={value}
                            alt={`${key} signature`}
                            className="border rounded max-w-xs h-auto"
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{String(value)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Child Forms */}
          {hasChildForms && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Child Forms to Fill</h4>
              {ticket.form_submission?.form?.child_forms?.map((childForm) => (
                <div key={childForm.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-sm">{childForm.title}</h5>
                      {childForm.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {childForm.description}
                        </p>
                      )}
                    </div>
                    <Button size="sm" onClick={() => handleFillChildForm(childForm.id)}>
                      Fill Form
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Child Form Fill Dialog */}
      {selectedChildFormId && (
        <ChildFormFillDialog
          open={childFormDialogOpen}
          onOpenChange={setChildFormDialogOpen}
          childFormId={selectedChildFormId}
          ticketId={ticket.id}
          onSuccess={handleFormSubmitted}
        />
      )}
    </>
  );
}
