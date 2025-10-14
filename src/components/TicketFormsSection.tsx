"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle2, Eye } from "lucide-react";
import type { Ticket, TicketFormSubmission } from "@/api/generated/interfaces";
import { ChildFormFillDialog } from "./ChildFormFillDialog";
import { FormSubmissionViewDialog } from "./FormSubmissionViewDialog";

interface TicketFormsSectionProps {
  ticket: Ticket;
  onFormSubmitted?: () => void;
}

export function TicketFormsSection({ ticket, onFormSubmitted }: TicketFormsSectionProps) {
  const [selectedChildFormId, setSelectedChildFormId] = useState<number | null>(null);
  const [childFormDialogOpen, setChildFormDialogOpen] = useState(false);
  const [viewSubmission, setViewSubmission] = useState<TicketFormSubmission | null>(null);

  // Get all form submissions
  const formSubmissions = ticket.form_submissions || [];

  // Get parent form submission (first one, or the one without a parent_form)
  const parentFormSubmission = formSubmissions.find(sub => !sub.form?.parent_form) || formSubmissions[0];

  // Check if ticket has a form submission (parent form)
  const hasParentForm = !!parentFormSubmission;

  // Check if parent form has child forms
  const hasChildForms = hasParentForm && parentFormSubmission?.form?.child_forms && parentFormSubmission.form.child_forms.length > 0;

  // Get IDs of child forms that have already been submitted
  const submittedChildFormIds = new Set(
    formSubmissions
      .filter(sub => sub.form?.parent_form)
      .map(sub => sub.form!.id)
  );

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
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">Parent Form</h4>
                  <Badge variant="outline">Completed</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {parentFormSubmission?.form?.title}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setViewSubmission(parentFormSubmission)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
            </div>
          </div>

          {/* Child Forms */}
          {hasChildForms && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Child Forms</h4>
              {parentFormSubmission?.form?.child_forms?.map((childForm) => {
                const isSubmitted = submittedChildFormIds.has(childForm.id);
                const childSubmission = formSubmissions.find(sub => sub.form?.id === childForm.id);

                return (
                  <div key={childForm.id} className={`border rounded-lg p-4 ${isSubmitted ? 'bg-muted/30' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-medium text-sm">{childForm.title}</h5>
                          {isSubmitted && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                        {childForm.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {childForm.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {isSubmitted ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewSubmission(childSubmission)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => handleFillChildForm(childForm.id)}>
                            Fill Form
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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

      {/* Form Submission View Dialog */}
      {viewSubmission && (
        <FormSubmissionViewDialog
          open={!!viewSubmission}
          onOpenChange={(open) => !open && setViewSubmission(null)}
          submission={viewSubmission}
        />
      )}
    </>
  );
}
