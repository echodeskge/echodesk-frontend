"use client"

import { useState } from "react"
import { Loader2, Pencil } from "lucide-react"
import type { BookingDetail } from "@/api/generated/interfaces"
import { BookingsCard, Field, bkgButton, bkgField } from "../../../_components/ui"

type Translate = (key: string, values?: Record<string, string | number>) => string

/**
 * Notes card: client notes and staff notes, with an inline editor (PATCH)
 * for admins and the booking's handler.
 */
export function NotesCard({
  booking,
  canEdit,
  saving,
  onSave,
  t,
}: {
  booking: BookingDetail
  canEdit: boolean
  saving: boolean
  onSave: (notes: { client_notes: string; staff_notes: string }) => Promise<boolean>
  t: Translate
}) {
  const [editing, setEditing] = useState(false)
  const [clientNotes, setClientNotes] = useState("")
  const [staffNotes, setStaffNotes] = useState("")

  const start = () => {
    setClientNotes(booking.client_notes || "")
    setStaffNotes(booking.staff_notes || "")
    setEditing(true)
  }
  const save = async () => {
    const ok = await onSave({ client_notes: clientNotes.trim(), staff_notes: staffNotes.trim() })
    if (ok) setEditing(false)
  }

  const text = (value: string | undefined) =>
    value ? <p className="whitespace-pre-wrap text-[13px] [overflow-wrap:anywhere]">{value}</p> : <p className="text-[13px] text-muted-foreground">{t("fields.noNotes")}</p>

  return (
    <BookingsCard
      title={t("cards.notes")}
      testId="bkg-card-notes"
      actions={
        canEdit && !editing ? (
          <button type="button" className={bkgButton.ghostIconSm} onClick={start} aria-label={t("notes.edit")} title={t("notes.edit")} data-testid="bkg-notes-edit">
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : undefined
      }
    >
      {editing ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
          data-testid="bkg-notes-form"
        >
          <Field label={t("fields.clientNotes")} htmlFor="bkg-client-notes">
            <textarea id="bkg-client-notes" className={bkgField.textarea} value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} placeholder={t("notes.clientPlaceholder")} rows={3} />
          </Field>
          <Field label={t("fields.staffNotes")} htmlFor="bkg-staff-notes">
            <textarea id="bkg-staff-notes" className={bkgField.textarea} value={staffNotes} onChange={(e) => setStaffNotes(e.target.value)} placeholder={t("notes.staffPlaceholder")} rows={3} />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className={bkgButton.outlineSm} onClick={() => setEditing(false)} disabled={saving}>
              {t("notes.cancel")}
            </button>
            <button type="submit" className={bkgButton.primarySm} disabled={saving} data-testid="bkg-notes-save">
              {saving && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
              {t("notes.save")}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{t("fields.clientNotes")}</span>
            {text(booking.client_notes)}
          </div>
          <div className="flex flex-col gap-0.5 border-t pt-3">
            <span className="text-xs text-muted-foreground">{t("fields.staffNotes")}</span>
            {text(booking.staff_notes)}
          </div>
        </div>
      )}
    </BookingsCard>
  )
}
