"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Loader2, Save, UserCheck } from "lucide-react"
import { getApiErrorMessage } from "@/lib/utils"
import { fetchMySubstitutes, replaceMySubstitutes, type SubstituteAssignment } from "../_lib/hr-api"
import {
  buildSubstitutesPayload,
  validateSubstituteRows,
  type SubstituteDraftRow,
} from "../_lib/substitutes-utils"
import { useLeaveFeatures } from "../_lib/useLeaveFeatures"
import { FeatureGate } from "../_components/FeatureGate"
import { SubstituteRowsEditor } from "../_components/SubstituteRowsEditor"
import { useLiteUsers } from "../_components/UserPicker"
import { LeaveErrorState, LeaveLoading, LeavePage, LeavePageHeader, SectionCard, leaveButton } from "../_components/ui"

const toRows = (items: SubstituteAssignment[]): SubstituteDraftRow[] =>
  [...items]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((a) => ({ substitute: a.substitute, task: a.task }))

export default function MySubstitutesPage() {
  const { loaded, features, userId } = useLeaveFeatures()
  return (
    <FeatureGate loaded={loaded} allowed={Boolean(features?.substitutes)}>
      <MySubstitutesEditor selfId={userId} />
    </FeatureGate>
  )
}

function MySubstitutesEditor({ selfId }: { selfId?: number }) {
  const t = useTranslations("leave")
  const { users, loading: usersLoading } = useLiteUsers()
  const [rows, setRows] = useState<SubstituteDraftRow[]>([])
  const [saved, setSaved] = useState<string>("[]")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // A failed load must not show an empty editor: saving it would replace
  // (PUT .../replace/) the user's real list with whatever they typed.
  const [loadError, setLoadError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setLoading(true)
    fetchMySubstitutes()
      .then((items) => {
        const initial = toRows(items)
        setRows(initial)
        setSaved(JSON.stringify(initial))
        setLoadError(null)
      })
      .catch((error) => {
        setLoadError(error)
        toast.error(t("shared.loadFailed"), { description: getApiErrorMessage(error) || undefined })
      })
      .finally(() => setLoading(false))
  }, [t, attempt])

  const dirty = JSON.stringify(rows) !== saved

  const handleSave = async () => {
    if (saving) return
    const error = validateSubstituteRows(rows, { selfId, allowEmpty: true })
    if (error) {
      toast.error(t(`hr.substitutes.errors.${error}`))
      return
    }
    setSaving(true)
    try {
      const next = toRows(await replaceMySubstitutes(buildSubstitutesPayload(rows)))
      setRows(next)
      setSaved(JSON.stringify(next))
      toast.success(t("hr.substitutes.saved"))
    } catch (err) {
      toast.error(t("hr.substitutes.saveFailed"), { description: getApiErrorMessage(err) || undefined })
    } finally {
      setSaving(false)
    }
  }

  return (
    <LeavePage width="narrow" gap={20} testId="my-substitutes-page">
      <LeavePageHeader icon={UserCheck} title={t("hr.substitutes.title")} description={t("hr.substitutes.description")} />
      {loading ? (
        <LeaveLoading />
      ) : loadError ? (
        <div className="rounded-[10px] border bg-card">
          <LeaveErrorState error={loadError} onRetry={() => setAttempt((n) => n + 1)} />
        </div>
      ) : (
        <SectionCard
          title={t("hr.substitutes.listTitle")}
          hint={t("hr.substitutes.count", { count: rows.length })}
          testId="my-substitutes-card"
        >
          <p className="border-b px-4 py-2.5 text-xs leading-[17px] text-muted-foreground">{t("hr.substitutes.listDescription")}</p>
          <SubstituteRowsEditor
            rows={rows}
            onChange={setRows}
            users={users}
            selfId={selfId}
            disabled={saving || usersLoading}
            className="p-4"
          />
          <div className="flex flex-wrap items-center justify-end gap-3 border-t bg-muted/20 px-4 py-2.5">
            {dirty && (
              <span className="text-xs text-muted-foreground" data-testid="my-substitutes-dirty">
                {t("hr.substitutes.unsaved")}
              </span>
            )}
            <button
              type="button"
              className={leaveButton.primary}
              onClick={handleSave}
              disabled={saving || !dirty}
              data-testid="my-substitutes-save"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Save className="h-3.5 w-3.5" aria-hidden />}
              {t("hr.common.save")}
            </button>
          </div>
        </SectionCard>
      )}
    </LeavePage>
  )
}
