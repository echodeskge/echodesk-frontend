"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import { getApiErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

  useEffect(() => {
    fetchMySubstitutes()
      .then((items) => {
        const initial = toRows(items)
        setRows(initial)
        setSaved(JSON.stringify(initial))
      })
      .catch((error) =>
        toast.error(t("shared.loadFailed"), { description: getApiErrorMessage(error) || undefined })
      )
      .finally(() => setLoading(false))
  }, [t])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("hr.substitutes.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("hr.substitutes.description")}</p>
        </div>
        <Button onClick={handleSave} disabled={saving || !dirty}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {t("hr.common.save")}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("hr.substitutes.listTitle")}</CardTitle>
          <CardDescription>{t("hr.substitutes.listDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SubstituteRowsEditor
            rows={rows}
            onChange={setRows}
            users={users}
            selfId={selfId}
            disabled={saving || usersLoading}
          />
        </CardContent>
      </Card>
    </div>
  )
}
