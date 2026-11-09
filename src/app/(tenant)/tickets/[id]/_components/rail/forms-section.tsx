"use client";

/**
 * Forms section (FE-12, W76, W124; design D194–D195).
 *
 * - The parent submission (the form the ticket was created with): name,
 *   "{submitter} · {date}", View → `FormSubmissionViewDialog`.
 * - Its child forms: "Completed" with View, or "Not filled" with Fill →
 *   `ChildFormFillDialog`. A submission invalidates `tk.ticket` and
 *   `tk.activity` (the server writes a `form_submitted` history row).
 * - "No forms" when the ticket has no submission.
 */
import { useMemo, useState } from "react";
import { CheckCircle2, FileText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { TicketFormSubmission } from "@/api/generated/interfaces";
import dynamic from "next/dynamic";
import { formatShortDate } from "../../../_lib/format";
import { tk } from "../../../_lib/query-keys";
import type { TicketDetail } from "../../../_lib/types";
import { RailSection, userName } from "./rail-shared";

// The form dialogs load when opened (kept out of the detail's first-load JS).
const ChildFormFillDialog = dynamic(() => import("@/components/ChildFormFillDialog").then((m) => m.ChildFormFillDialog));
const FormSubmissionViewDialog = dynamic(() => import("@/components/FormSubmissionViewDialog").then((m) => m.FormSubmissionViewDialog));

interface ChildFormRef {
  id: number;
  title: string;
  description?: string | null;
}

export interface FormRows {
  parent: TicketFormSubmission | null;
  children: { form: ChildFormRef; submission: TicketFormSubmission | null }[];
}

/** The parent submission (no parent form, else the first) and its child forms. */
export function formRows(submissions: TicketFormSubmission[] | null | undefined): FormRows {
  const list = submissions ?? [];
  const parent = list.find((s) => !s.form?.parent_form) ?? list[0] ?? null;
  const childForms = ((parent?.form?.child_forms ?? []) as unknown as ChildFormRef[]).filter((f) => f && typeof f.id === "number");
  const children = childForms.map((form) => ({
    form,
    submission: list.find((s) => s !== parent && s.form?.id === form.id) ?? null,
  }));
  return { parent, children };
}

const ACTION =
  "inline-flex h-6 shrink-0 items-center rounded-md border px-2 text-[11px] font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function FormRow({
  name,
  sub,
  done,
  action,
  onAction,
  testId,
}: {
  name: string;
  sub: string;
  done: boolean;
  action: string;
  onAction: () => void;
  testId: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2" data-testid={testId} data-done={done ? "true" : "false"}>
      <span className="flex shrink-0 text-muted-foreground">
        {done ? <CheckCircle2 aria-hidden="true" size={14} className="text-green" /> : <FileText aria-hidden="true" size={14} />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-xs font-medium leading-5">{name}</span>
        <span className="truncate text-[11px] leading-5 text-muted-foreground">{sub}</span>
      </span>
      <button type="button" className={ACTION} onClick={onAction} data-slot="form-action">
        {action}
      </button>
    </div>
  );
}

export function FormsSection({ ticket }: { ticket: TicketDetail }) {
  const t = useTranslations("ticketsScreen.forms");
  const locale = useLocale();
  const qc = useQueryClient();
  const rows = useMemo(() => formRows(ticket.form_submissions), [ticket.form_submissions]);
  const [fillId, setFillId] = useState<number | null>(null);
  const [view, setView] = useState<TicketFormSubmission | null>(null);

  const submittedLine = (s: TicketFormSubmission) =>
    t("submittedBy", { name: userName(s.submitted_by) || "—", date: formatShortDate(s.submitted_at, locale) });

  const onSubmitted = () => {
    qc.invalidateQueries({ queryKey: tk.ticket(ticket.id) });
    qc.invalidateQueries({ queryKey: tk.activity(ticket.id) });
    toast.success(t("submitted"));
  };

  return (
    <RailSection label={t("title")} data-testid="forms-section">
      {!rows.parent ? (
        <p className="text-xs text-muted-foreground" data-testid="forms-empty">
          {t("empty")}
        </p>
      ) : (
        <>
          <FormRow
            testId="form-parent"
            name={rows.parent.form?.title ?? t("parentForm")}
            sub={submittedLine(rows.parent)}
            done
            action={t("view")}
            onAction={() => setView(rows.parent)}
          />
          {rows.children.map(({ form, submission }) => (
            <FormRow
              key={form.id}
              testId={`form-child-${form.id}`}
              name={form.title}
              sub={submission ? `${t("completed")} · ${submittedLine(submission)}` : t("notFilled")}
              done={!!submission}
              action={submission ? t("view") : t("fill")}
              onAction={() => (submission ? setView(submission) : setFillId(form.id))}
            />
          ))}
        </>
      )}

      {fillId !== null && (
        <ChildFormFillDialog
          open
          onOpenChange={(open) => !open && setFillId(null)}
          childFormId={fillId}
          ticketId={ticket.id}
          onSuccess={onSubmitted}
        />
      )}
      {view && (
        <FormSubmissionViewDialog open onOpenChange={(open) => !open && setView(null)} submission={view} />
      )}
    </RailSection>
  );
}
